import { Body, Controller, ForbiddenException, Headers, NotFoundException, Post } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { FamilyService } from "../family/family.service";
import { BotLang, botText, escapeHtml, isBotLang } from "./bot-messages";
import { TelegramAuthService } from "./telegram-auth.service";

type TelegramUser = { id: number; username?: string; first_name: string; last_name?: string; language_code?: string };
type Update = { message?: { text?: string; from?: TelegramUser; chat: { id: number } }; callback_query?: { id: string; data?: string; from: TelegramUser; message?: { chat: { id: number } } } };
type Keyboard = Array<Array<{ text: string; callback_data: string }>>;

const failures = new Map<string, { attempts: number[]; cooldownUntil?: number }>();
// Language choice before an account exists; once a User row exists preferredLanguage wins.
const chosenLanguage = new Map<string, BotLang>();

@Controller("telegram")
export class TelegramController {
  constructor(private readonly family: FamilyService, private readonly auth: TelegramAuthService, private readonly prisma: PrismaService) {}

  @Post("webhook")
  async webhook(@Headers("x-telegram-bot-api-secret-token") secret: string | undefined, @Body() update: Update) {
    if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) throw new ForbiddenException();
    await this.handle(update);
    return { ok: true };
  }

  @Post("sandbox")
  async sandbox(@Body() body: { action: "accept" | "login"; code?: string; nonce?: string; telegramId: string; username?: string; fullName?: string; language?: string }) {
    if (process.env.TELEGRAM_BOT_TOKEN || process.env.NODE_ENV === "production") throw new NotFoundException();
    if (body.action === "accept" && body.code) return this.family.acceptByTelegram(body.code, { id: BigInt(body.telegramId), username: body.username, fullName: body.fullName || "Telegram User", language: body.language });
    if (body.action === "login" && body.nonce) return { approved: await this.auth.approve(body.nonce, BigInt(body.telegramId)) };
    throw new NotFoundException("Unsupported sandbox action.");
  }

  private async handle(update: Update) {
    const message = update.message;
    const callback = update.callback_query;
    const from = message?.from ?? callback?.from;
    const chatId = message?.chat.id ?? callback?.message?.chat.id;
    if (callback) await this.answerCallback(callback.id);
    if (!from || !chatId) return;

    const telegramId = String(from.id);
    const fullName = [from.first_name, from.last_name].filter(Boolean).join(" ");
    const user = await this.prisma.user.findUnique({ where: { telegramId: BigInt(from.id) }, select: { id: true, preferredLanguage: true } });
    const storedLang = chosenLanguage.get(telegramId) ?? (isBotLang(user?.preferredLanguage) ? user.preferredLanguage : undefined);
    const lang: BotLang = storedLang ?? (isBotLang(from.language_code) ? from.language_code : "uz");
    const text = message?.text?.trim();

    if (callback?.data?.startsWith("lang:")) {
      const picked = callback.data.slice(5);
      if (!isBotLang(picked)) return;
      chosenLanguage.set(telegramId, picked);
      if (user) await this.prisma.user.update({ where: { id: user.id }, data: { preferredLanguage: picked } });
      await this.send(chatId, botText(picked, "languageSet"));
      return this.send(chatId, botText(picked, "welcome", { name: escapeHtml(from.first_name) }));
    }

    if (text?.startsWith("/start login_")) {
      const nonce = text.slice("/start login_".length);
      if (!user) return this.send(chatId, botText(lang, "noAccount"));
      return this.send(chatId, botText(lang, "loginConfirm"), [[
        { text: botText(lang, "btnLoginConfirm"), callback_data: `login:${nonce}` },
        { text: botText(lang, "btnLoginCancel"), callback_data: "logincancel" },
      ]]);
    }
    if (callback?.data?.startsWith("login:")) {
      const approved = await this.auth.approve(callback.data.slice(6), BigInt(from.id));
      return this.send(chatId, botText(lang, approved ? "loginApproved" : "loginInvalid"));
    }
    if (callback?.data === "logincancel") return this.send(chatId, botText(lang, "loginCancelled"));

    if (callback?.data?.startsWith("accept:")) {
      try {
        const result = await this.family.acceptByTelegram(callback.data.slice(7), { id: BigInt(from.id), username: from.username, fullName, language: lang });
        if (!result.linkedChildIds.length) return this.send(chatId, botText(lang, "acceptedNoEffect"));
        const names = await this.family.childNames(result.linkedChildIds);
        return this.send(chatId, botText(lang, "accepted", { children: this.childList(lang, names) }));
      } catch { return this.send(chatId, botText(lang, "invalidCode")); }
    }
    if (callback?.data === "decline") return this.send(chatId, botText(lang, "declined"));

    const code = text?.replace(/\s/g, "");
    if (code && /^\d{6}$/.test(code)) {
      if (this.isBlocked(telegramId)) return this.send(chatId, botText(lang, "cooldown"));
      const preview = await this.family.previewByCode(code);
      if (!preview) {
        if (this.recordFailure(telegramId)) return this.send(chatId, botText(lang, "cooldown"));
        return this.send(chatId, botText(lang, "invalidCode"));
      }
      return this.send(chatId, botText(lang, "inviteFound", {
        inviter: escapeHtml(preview.inviterName),
        children: this.childList(lang, preview.childNames),
        relationship: botText(lang, `relationship.${preview.relationship}`),
      }), [[
        { text: botText(lang, "btnAccept"), callback_data: `accept:${code}` },
        { text: botText(lang, "btnDecline"), callback_data: "decline" },
      ]]);
    }

    if (text?.startsWith("/start") && !storedLang) {
      return this.send(chatId, botText(lang, "chooseLanguage"), [[
        { text: "🇺🇿 O‘zbekcha", callback_data: "lang:uz" },
        { text: "🇷🇺 Русский", callback_data: "lang:ru" },
        { text: "🇬🇧 English", callback_data: "lang:en" },
      ]]);
    }
    if (text?.startsWith("/start")) return this.send(chatId, botText(lang, "welcome", { name: escapeHtml(from.first_name) }));
    return this.send(chatId, botText(lang, "fallback"));
  }

  private childList(lang: BotLang, names: string[]) {
    return names.map((name) => botText(lang, "childRow", { name: escapeHtml(name) })).join("\n");
  }

  // Only wrong codes count toward the cooldown; valid previews and other messages are free.
  private isBlocked(id: string) {
    const state = failures.get(id);
    return Boolean(state?.cooldownUntil && state.cooldownUntil > Date.now());
  }

  private recordFailure(id: string) {
    const now = Date.now();
    const state = failures.get(id) ?? { attempts: [] };
    state.attempts = state.attempts.filter((time) => time > now - 60 * 60 * 1000);
    state.attempts.push(now);
    if (state.attempts.length >= 5) state.cooldownUntil = now + 24 * 60 * 60 * 1000;
    failures.set(id, state);
    return Boolean(state.cooldownUntil);
  }

  private async answerCallback(callbackQueryId: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN; if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ callback_query_id: callbackQueryId }) });
  }

  private async send(chatId: number, text: string, inline_keyboard?: Keyboard) {
    const token = process.env.TELEGRAM_BOT_TOKEN; if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: inline_keyboard ? { inline_keyboard } : undefined }) });
  }
}
