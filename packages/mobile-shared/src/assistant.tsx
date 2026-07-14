import { Ionicons } from "@expo/vector-icons";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react-native";
import type {
  ChatThreadDetail,
  ChatThreadListResponse,
  ChatThreadSummary,
} from "@kichkintoy/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { streamMobileChatTurn } from "./assistant-stream";

export type MobileAssistantRole = "parent" | "teacher" | "director";

export type MobileAssistantClient = {
  listThreads: () => Promise<ChatThreadListResponse>;
  createThread: () => Promise<ChatThreadSummary>;
  getThread: (threadId: string) => Promise<ChatThreadDetail>;
  renameThread: (threadId: string, title: string) => Promise<ChatThreadSummary>;
  deleteThread: (threadId: string) => Promise<{ success: boolean }>;
};

export type MobileAssistantScreenProps = {
  role: MobileAssistantRole;
  client: MobileAssistantClient;
  apiBaseUrl: string;
  authToken: string | null;
  language: string;
  subjectName?: string | null;
};

type GroupKey = "today" | "yesterday" | "thisWeek" | "thisMonth" | "older";
type Tone = "coral" | "sunshine" | "mint" | "sky" | "grape";
type ActionSheetMode = "actions" | "rename" | "delete";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const GROUP_ORDER: GroupKey[] = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "older",
];
const DRAWER_WIDTH = 310;
const PALETTE = {
  background: "#F8F8FA",
  card: "#FFFFFF",
  foreground: "#2B2D31",
  muted: "#8A8F99",
  border: "#E7E8EC",
  primary: "#3B8FF3",
  coral: "#FFE2DD",
  coralInk: "#E8674E",
  sunshine: "#FFF1CF",
  sunshineInk: "#C98516",
  mint: "#DDF3E4",
  mintInk: "#46A967",
  sky: "#E1F0FF",
  skyInk: "#3E8FE0",
  grape: "#EEE6FF",
  grapeInk: "#7C5CD8",
  danger: "#D94747",
} as const;

function normalizeLanguage(language: string): string | undefined {
  const base = language.slice(0, 2).toLowerCase();
  return base === "uz" || base === "ru" || base === "en" ? base : undefined;
}

function lastUserText(messages: readonly ThreadMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    return message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function createModelAdapter(input: {
  threadId: string;
  apiBaseUrl: string;
  authToken: string | null;
  language: string;
  onDone: () => void;
}): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const message = lastUserText(messages);
      let text = "";
      let stage: "thinking" | "searching" = "thinking";

      for await (const event of streamMobileChatTurn({
        apiBaseUrl: input.apiBaseUrl,
        token: input.authToken,
        threadId: input.threadId,
        message,
        appLanguage: normalizeLanguage(input.language),
        signal: abortSignal,
      })) {
        if (event.type === "delta") {
          text += event.value;
          yield {
            content: [{ type: "text", text }],
            metadata: { custom: { stage } },
          };
        } else if (event.type === "tool") {
          stage = "searching";
          yield {
            content: text ? [{ type: "text", text }] : [],
            metadata: { custom: { stage } },
          };
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }

      input.onDone();
      yield { content: text ? [{ type: "text", text }] : [] };
    },
  };
}

function KichkintoyMark({ size }: { size: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="11 12 74 80"
      fill="none"
      accessible={false}
    >
      <Path
        d="M37 52 73 24"
        stroke="#FF7A66"
        strokeWidth={20}
        strokeLinecap="round"
      />
      <Path
        d="M37 52 73 80"
        stroke="#4DABF7"
        strokeWidth={20}
        strokeLinecap="round"
      />
      <Rect x={13} y={18} width={23} height={68} rx={11.5} fill="#FFC53D" />
      <Circle cx={24.5} cy={41} r={4.2} fill="#FFFFFF" />
      <Circle cx={24.5} cy={63} r={4.2} fill="#FFFFFF" />
    </Svg>
  );
}

function AssistantMark({ size = 34 }: { size?: number }) {
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: Math.round(size * 0.36) },
      ]}
    >
      <KichkintoyMark size={Math.round(size * 0.68)} />
    </View>
  );
}

function RichText({ text, color }: { text: string; color: string }) {
  const segments = text.split(/\*\*(.+?)\*\*/g);
  return (
    <Text style={[styles.messageText, { color }]}>
      {segments.map((segment, index) => (
        <Text
          key={`${index}-${segment.slice(0, 8)}`}
          style={index % 2 ? styles.bold : undefined}
        >
          {segment}
        </Text>
      ))}
    </Text>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root style={styles.userRow}>
      <View style={styles.userBubble}>
        <MessagePrimitive.Content
          renderText={({ part }) => (
            <RichText text={part.text} color="#FFFFFF" />
          )}
        />
      </View>
    </MessagePrimitive.Root>
  );
}

function WorkingStatus() {
  const { t } = useTranslation("chat");
  const stage = useAuiState(
    (state) =>
      state.message.metadata.custom?.stage as
        | "thinking"
        | "searching"
        | undefined,
  );
  const hasText = useAuiState((state) =>
    state.message.content.some(
      (part) => part.type === "text" && part.text.length > 0,
    ),
  );
  if (hasText) return null;
  return (
    <View style={styles.workingRow}>
      <View style={styles.workingDot} />
      <Text style={styles.workingText}>
        {stage === "searching" ? t("lookingUp") : t("thinking")}
      </Text>
    </View>
  );
}

function AssistantMessage() {
  const { t } = useTranslation("chat");
  return (
    <MessagePrimitive.Root style={styles.assistantRow}>
      <AssistantMark size={30} />
      <View style={styles.assistantBubble}>
        <MessagePrimitive.If running last>
          <WorkingStatus />
        </MessagePrimitive.If>
        <MessagePrimitive.Content
          renderText={({ part }) => (
            <RichText text={part.text} color={PALETTE.foreground} />
          )}
        />
        <ErrorPrimitive.Root style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t("errorTitle")}</Text>
          <ErrorPrimitive.Message style={styles.errorMessage} />
        </ErrorPrimitive.Root>
      </View>
    </MessagePrimitive.Root>
  );
}

function suggestionTone(tone: Tone) {
  const map = {
    coral: [PALETTE.coral, PALETTE.coralInk],
    sunshine: [PALETTE.sunshine, PALETTE.sunshineInk],
    mint: [PALETTE.mint, PALETTE.mintInk],
    sky: [PALETTE.sky, PALETTE.skyInk],
    grape: [PALETTE.grape, PALETTE.grapeInk],
  } as const;
  return map[tone];
}

function EmptyConversation({
  role,
  subjectName,
}: {
  role: MobileAssistantRole;
  subjectName?: string | null;
}) {
  const { t } = useTranslation("chat");
  const name = subjectName ?? "";
  const withName = (specific: string, generic: string) =>
    subjectName ? t(specific, { name }) : t(generic);

  const parent = [
    {
      key: "today",
      prompt: withName("suggestions.today", "suggestions.todayGeneric"),
      tone: "coral" as const,
      icon: "sunny-outline" as const,
    },
    {
      key: "development",
      prompt: withName(
        "suggestions.development",
        "suggestions.developmentGeneric",
      ),
      tone: "mint" as const,
      icon: "trending-up-outline" as const,
    },
    {
      key: "events",
      prompt: t("suggestions.events"),
      tone: "sky" as const,
      icon: "calendar-outline" as const,
    },
    {
      key: "notices",
      prompt: t("suggestions.notices"),
      tone: "sunshine" as const,
      icon: "notifications-outline" as const,
    },
    {
      key: "meals",
      prompt: t("suggestions.meals"),
      tone: "grape" as const,
      icon: "restaurant-outline" as const,
    },
  ];
  const teacher = [
    {
      key: "absentToday",
      prompt: t("teacher.suggestions.absentToday"),
      tone: "coral" as const,
      icon: "person-remove-outline" as const,
    },
    {
      key: "mostAbsent",
      prompt: t("teacher.suggestions.mostAbsent"),
      tone: "sunshine" as const,
      icon: "calendar-outline" as const,
    },
    {
      key: "unwrittenReports",
      prompt: t("teacher.suggestions.unwrittenReports"),
      tone: "mint" as const,
      icon: "create-outline" as const,
    },
    {
      key: "medicationDue",
      prompt: t("teacher.suggestions.medicationDue"),
      tone: "sky" as const,
      icon: "medical-outline" as const,
    },
    {
      key: "events",
      prompt: t("teacher.suggestions.events"),
      tone: "grape" as const,
      icon: "calendar-number-outline" as const,
    },
  ];
  const director = [
    {
      key: "snapshot",
      prompt: t("director.suggestions.snapshot"),
      tone: "sky" as const,
      icon: "speedometer-outline" as const,
    },
    {
      key: "unpaidTuition",
      prompt: t("director.suggestions.unpaidTuition"),
      tone: "mint" as const,
      icon: "wallet-outline" as const,
    },
    {
      key: "absentToday",
      prompt: t("director.suggestions.absentToday"),
      tone: "coral" as const,
      icon: "person-remove-outline" as const,
    },
    {
      key: "joinRequests",
      prompt: t("director.suggestions.joinRequests"),
      tone: "sunshine" as const,
      icon: "person-add-outline" as const,
    },
    {
      key: "emptySeats",
      prompt: t("director.suggestions.emptySeats"),
      tone: "grape" as const,
      icon: "grid-outline" as const,
    },
  ];
  const suggestions =
    role === "teacher" ? teacher : role === "director" ? director : parent;
  const title =
    role === "teacher"
      ? t("teacher.emptyTitle")
      : role === "director"
        ? t("director.emptyTitle")
        : subjectName
          ? t("emptyTitle", { name })
          : t("emptyTitleGeneric");
  const subtitle =
    role === "teacher"
      ? t("teacher.emptySubtitle")
      : role === "director"
        ? t("director.emptySubtitle")
        : t("emptySubtitle");

  return (
    <View style={styles.emptyState}>
      <AssistantMark size={58} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      <View style={styles.suggestionList}>
        {suggestions.map((suggestion) => {
          const [backgroundColor, color] = suggestionTone(suggestion.tone);
          return (
            <ThreadPrimitive.Suggestion
              key={suggestion.key}
              prompt={suggestion.prompt}
              send
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.suggestion,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.suggestionIcon, { backgroundColor }]}>
                <Ionicons
                  name={suggestion.icon as IconName}
                  size={18}
                  color={color}
                />
              </View>
              <Text style={styles.suggestionText}>{suggestion.prompt}</Text>
              <Ionicons name="arrow-forward" size={15} color={PALETTE.muted} />
            </ThreadPrimitive.Suggestion>
          );
        })}
      </View>
    </View>
  );
}

function Composer({
  role,
  subjectName,
}: {
  role: MobileAssistantRole;
  subjectName?: string | null;
}) {
  const { t } = useTranslation("chat");
  const placeholder =
    role === "teacher"
      ? t("teacher.composerPlaceholder")
      : role === "director"
        ? t("director.composerPlaceholder")
        : subjectName
          ? t("composerPlaceholder", { name: subjectName })
          : t("composerPlaceholderGeneric");
  return (
    <View style={styles.composerArea}>
      <ComposerPrimitive.Root style={styles.composer}>
        <ComposerPrimitive.Input
          placeholder={placeholder}
          placeholderTextColor="#9A9DA7"
          multiline
          maxLength={2000}
          submitMode="enter"
          style={styles.composerInput}
          accessibilityLabel={placeholder}
        />
        <ComposerPrimitive.Send
          accessibilityRole="button"
          accessibilityLabel={t("send")}
          style={({ pressed }) => [
            styles.sendButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-up" size={19} color="#FFFFFF" />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
      <Text style={styles.disclaimer}>{t("disclaimer")}</Text>
    </View>
  );
}

function Conversation({
  role,
  subjectName,
}: {
  role: MobileAssistantRole;
  subjectName?: string | null;
}) {
  return (
    <ThreadPrimitive.Root style={styles.threadRoot}>
      <ThreadPrimitive.If empty>
        <EmptyConversation role={role} subjectName={subjectName} />
      </ThreadPrimitive.If>
      <ThreadPrimitive.If empty={false}>
        <MessageList />
      </ThreadPrimitive.If>
      <Composer role={role} subjectName={subjectName} />
    </ThreadPrimitive.Root>
  );
}

const MESSAGE_COMPONENTS = { UserMessage, AssistantMessage } as const;

function MessageList() {
  const { t } = useTranslation("chat");
  const messages = useAuiState((state) => state.thread.messages);
  const listRef = useRef<FlatList<ThreadMessage>>(null);
  const nearBottomRef = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const latestText = messages
    .at(-1)
    ?.content.map((part) => (part.type === "text" ? part.text : ""))
    .join("");

  useEffect(() => {
    if (!nearBottomRef.current) return;
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: messages.length > 1 }),
    );
  }, [latestText, messages.length]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    const nearBottom = distance < 90;
    nearBottomRef.current = nearBottom;
    setShowLatest(!nearBottom);
  };

  return (
    <View style={styles.messageListWrap}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ index }) => (
          <ThreadPrimitive.MessageByIndex
            index={index}
            components={MESSAGE_COMPONENTS}
          />
        )}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      {showLatest ? (
        <Pressable
          onPress={() => listRef.current?.scrollToEnd({ animated: true })}
          accessibilityRole="button"
          accessibilityLabel={t("scrollToBottom")}
          style={styles.latestButton}
        >
          <Ionicons name="arrow-down" size={18} color={PALETTE.foreground} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ThreadRuntime({
  detail,
  role,
  subjectName,
  apiBaseUrl,
  authToken,
  language,
  onDone,
}: {
  detail: ChatThreadDetail;
  role: MobileAssistantRole;
  subjectName?: string | null;
  apiBaseUrl: string;
  authToken: string | null;
  language: string;
  onDone: () => void;
}) {
  const initialMessages: ThreadMessageLike[] = useMemo(
    () =>
      detail.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [detail.messages],
  );
  const adapter = useMemo(
    () =>
      createModelAdapter({
        threadId: detail.id,
        apiBaseUrl,
        authToken,
        language,
        onDone,
      }),
    [apiBaseUrl, authToken, detail.id, language, onDone],
  );
  const runtime = useLocalRuntime(adapter, { initialMessages });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Conversation role={role} subjectName={subjectName} />
    </AssistantRuntimeProvider>
  );
}

function groupThreads(threads: ChatThreadSummary[]) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const day = 86_400_000;
  const buckets = new Map<GroupKey, ChatThreadSummary[]>();
  for (const thread of threads) {
    const timestamp = new Date(thread.updatedAt).getTime();
    const key: GroupKey =
      timestamp >= startOfToday
        ? "today"
        : timestamp >= startOfToday - day
          ? "yesterday"
          : timestamp >= startOfToday - 7 * day
            ? "thisWeek"
            : timestamp >= startOfToday - 30 * day
              ? "thisMonth"
              : "older";
    buckets.set(key, [...(buckets.get(key) ?? []), thread]);
  }
  return GROUP_ORDER.flatMap((key) =>
    buckets.has(key) ? [{ key, items: buckets.get(key)! }] : [],
  );
}

function ChatActionSheet({
  target,
  renamePending,
  deletePending,
  renameError,
  deleteError,
  onClose,
  onRename,
  onDelete,
}: {
  target: ChatThreadSummary | null;
  renamePending: boolean;
  deletePending: boolean;
  renameError: string | null;
  deleteError: string | null;
  onClose: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("chat");
  const [mode, setMode] = useState<ActionSheetMode>("actions");
  const [value, setValue] = useState("");
  const translateY = useRef(new Animated.Value(0)).current;
  const pending = renamePending || deletePending;
  const cleanValue = value.trim();

  useEffect(() => {
    setMode("actions");
    setValue(target?.title ?? "");
    if (!target) return;
    translateY.setValue(36);
    Animated.spring(translateY, {
      toValue: 0,
      damping: 22,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [target, translateY]);

  const dismiss = useCallback(() => {
    if (!pending) onClose();
  }, [onClose, pending]);

  const sheetPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !pending && gesture.dy > 8 && Math.abs(gesture.dx) < 24,
        onPanResponderMove: (_event, gesture) =>
          translateY.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy >= 60) {
            onClose();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            damping: 20,
            stiffness: 260,
            useNativeDriver: true,
          }).start();
        },
      }),
    [onClose, pending, translateY],
  );

  const activeError =
    mode === "rename" ? renameError : mode === "delete" ? deleteError : null;
  if (!target) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.sheetOverlay]}>
      <KeyboardAvoidingView
        style={styles.sheetKeyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          disabled={pending}
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
        />
        <Animated.View
          style={[styles.actionSheet, { transform: [{ translateY }] }]}
          {...sheetPan.panHandlers}
        >
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeading}>
              <AssistantMark size={38} />
              <View style={styles.sheetHeadingCopy}>
                <Text style={styles.sheetEyebrow}>
                  {mode === "rename"
                    ? t("renamePrompt")
                    : mode === "delete"
                      ? t("deleteTitle")
                      : t("threadActions")}
                </Text>
                <Text numberOfLines={2} style={styles.sheetThreadTitle}>
                  {target?.title}
                </Text>
              </View>
            </View>

            {mode === "actions" ? (
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => setMode("rename")}
                  style={({ pressed }) => [
                    styles.sheetAction,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[styles.sheetActionIcon, styles.renameActionIcon]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={PALETTE.skyInk}
                    />
                  </View>
                  <Text style={styles.sheetActionText}>{t("rename")}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={PALETTE.muted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setMode("delete")}
                  style={({ pressed }) => [
                    styles.sheetAction,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[styles.sheetActionIcon, styles.deleteActionIcon]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={PALETTE.danger}
                    />
                  </View>
                  <Text
                    style={[styles.sheetActionText, styles.destructiveText]}
                  >
                    {t("delete")}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={PALETTE.muted}
                  />
                </Pressable>
              </View>
            ) : mode === "rename" ? (
              <View>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  autoFocus
                  selectTextOnFocus
                  maxLength={120}
                  editable={!pending}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (cleanValue && cleanValue !== target?.title)
                      onRename(cleanValue);
                  }}
                  style={styles.renameInput}
                />
              </View>
            ) : (
              <View style={styles.deleteWarning}>
                <View style={styles.deleteWarningIcon}>
                  <Ionicons
                    name="warning-outline"
                    size={24}
                    color={PALETTE.danger}
                  />
                </View>
                <Text style={styles.deleteWarningText}>
                  {t("deleteConfirm")}
                </Text>
              </View>
            )}

            {activeError ? (
              <View style={styles.sheetError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={PALETTE.danger}
                />
                <Text style={styles.sheetErrorText}>{activeError}</Text>
              </View>
            ) : null}

            <View style={styles.sheetFooter}>
              {mode !== "actions" ? (
                <Pressable
                  onPress={() => setMode("actions")}
                  disabled={pending}
                  style={styles.secondaryAction}
                >
                  <Text style={styles.secondaryActionText}>{t("cancel")}</Text>
                </Pressable>
              ) : (
                <Pressable onPress={dismiss} style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionText}>{t("cancel")}</Text>
                </Pressable>
              )}
              {mode === "rename" ? (
                <Pressable
                  onPress={() => onRename(cleanValue)}
                  disabled={
                    pending || !cleanValue || cleanValue === target?.title
                  }
                  style={[
                    styles.primaryAction,
                    (pending || !cleanValue || cleanValue === target?.title) &&
                      styles.disabled,
                  ]}
                >
                  {renamePending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionText}>
                      {t("renameSave")}
                    </Text>
                  )}
                </Pressable>
              ) : mode === "delete" ? (
                <Pressable
                  onPress={onDelete}
                  disabled={pending}
                  style={[
                    styles.primaryAction,
                    styles.deleteConfirmButton,
                    pending && styles.disabled,
                  ]}
                >
                  {deletePending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionText}>{t("delete")}</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function HistoryDrawer({
  open,
  threads,
  activeId,
  loading,
  failed,
  actionTarget,
  renamePending,
  deletePending,
  renameError,
  deleteError,
  onClose,
  onNew,
  onRetry,
  onSelect,
  onActions,
  onCloseAction,
  onRenameAction,
  onDeleteAction,
}: {
  open: boolean;
  threads: ChatThreadSummary[];
  activeId: string | null;
  loading: boolean;
  failed: boolean;
  actionTarget: ChatThreadSummary | null;
  renamePending: boolean;
  deletePending: boolean;
  renameError: string | null;
  deleteError: string | null;
  onClose: () => void;
  onNew: () => void;
  onRetry: () => void;
  onSelect: (id: string) => void;
  onActions: (thread: ChatThreadSummary) => void;
  onCloseAction: () => void;
  onRenameAction: (title: string) => void;
  onDeleteAction: () => void;
}) {
  const { t } = useTranslation("chat");
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(DRAWER_WIDTH, width * 0.86);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  useEffect(() => {
    if (!open) return;
    translateX.setValue(-drawerWidth);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [drawerWidth, open, translateX]);

  const groups = useMemo(() => groupThreads(threads), [threads]);
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={
        actionTarget
          ? () => {
              if (!renamePending && !deletePending) onCloseAction();
            }
          : onClose
      }
      statusBarTranslucent
    >
      <View style={styles.drawerOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t("closeHistory")}
        />
        <Animated.View
          style={[
            styles.drawer,
            { width: drawerWidth, transform: [{ translateX }] },
          ]}
        >
          <SafeAreaView edges={["top", "bottom"]} style={styles.drawerSafeArea}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitleRow}>
                <AssistantMark size={36} />
                <View style={styles.drawerTitleCopy}>
                  <Text numberOfLines={1} style={styles.drawerTitle}>
                    {t("history")}
                  </Text>
                  <Text numberOfLines={1} style={styles.drawerSubtitle}>
                    {t("title")}
                  </Text>
                </View>
              </View>
              <View style={styles.drawerHeaderActions}>
                <Pressable
                  onPress={onNew}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={t("newChat")}
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="create-outline"
                    size={22}
                    color={PALETTE.foreground}
                  />
                </Pressable>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel={t("closeHistory")}
                  style={styles.iconButton}
                >
                  <Ionicons name="close" size={23} color={PALETTE.foreground} />
                </Pressable>
              </View>
            </View>
            <FlatList
              data={groups}
              keyExtractor={(group) => group.key}
              contentContainerStyle={styles.drawerList}
              ListEmptyComponent={
                <View style={styles.emptyThreadList}>
                  <Text style={styles.noThreads}>
                    {loading
                      ? t("loadingChats")
                      : failed
                        ? t("threadListFailed")
                        : t("noThreads")}
                  </Text>
                  {failed ? (
                    <Pressable onPress={onRetry} style={styles.retryButton}>
                      <Text style={styles.retryText}>{t("errorRetry")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              }
              renderItem={({ item: group, index }) => (
                <View>
                  <Text
                    style={[
                      styles.groupLabel,
                      index === 0 && styles.firstGroupLabel,
                    ]}
                  >
                    {t(`groups.${group.key}`)}
                  </Text>
                  {group.items.map((thread) => (
                    <View
                      key={thread.id}
                      style={[
                        styles.threadItem,
                        thread.id === activeId && styles.activeThread,
                      ]}
                    >
                      <Pressable
                        onPress={() => onSelect(thread.id)}
                        style={styles.threadTrigger}
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={17}
                          color={
                            thread.id === activeId
                              ? PALETTE.coralInk
                              : PALETTE.muted
                          }
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.threadTitle,
                            thread.id === activeId && styles.activeThreadTitle,
                          ]}
                        >
                          {thread.title}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("threadActions")}
                        style={styles.threadMore}
                        onPress={() => onActions(thread)}
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={19}
                          color={PALETTE.muted}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            />
          </SafeAreaView>
        </Animated.View>
        <ChatActionSheet
          target={actionTarget}
          renamePending={renamePending}
          deletePending={deletePending}
          renameError={renameError}
          deleteError={deleteError}
          onClose={onCloseAction}
          onRename={onRenameAction}
          onDelete={onDeleteAction}
        />
      </View>
    </Modal>
  );
}

function roleSubtitle(role: MobileAssistantRole, t: (key: string) => string) {
  return role === "teacher"
    ? t("teacher.subtitle")
    : role === "director"
      ? t("director.subtitle")
      : t("subtitle");
}

export function MobileAssistantScreen({
  role,
  client,
  apiBaseUrl,
  authToken,
  language,
  subjectName,
}: MobileAssistantScreenProps) {
  const { t } = useTranslation("chat");
  const queryClient = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<ChatThreadSummary | null>(
    null,
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  const queryKey = useMemo(() => ["chat", role, "threads"] as const, [role]);
  const threadsQuery = useQuery({
    queryKey,
    queryFn: client.listThreads,
    staleTime: 0,
  });
  const threads = threadsQuery.data?.items ?? [];

  const createThread = useMutation({
    mutationFn: client.createThread,
    onMutate: () => setCreateError(null),
    onSuccess: (thread) => {
      setCreateError(null);
      setActiveThreadId(thread.id);
      setDrawerOpen(false);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => setCreateError((error as Error).message),
  });

  useEffect(() => {
    if (threadsQuery.isPending || threadsQuery.isError || activeThreadId)
      return;
    if (threads.length > 0) {
      setActiveThreadId(threads[0]!.id);
    } else if (!creatingRef.current) {
      creatingRef.current = true;
      createThread.mutate(undefined, {
        onSettled: () => (creatingRef.current = false),
      });
    }
  }, [
    activeThreadId,
    createThread,
    threads,
    threadsQuery.isError,
    threadsQuery.isPending,
  ]);

  const detailQuery = useQuery({
    queryKey: ["chat", "thread", activeThreadId],
    queryFn: () => client.getThread(activeThreadId!),
    enabled: activeThreadId !== null,
    staleTime: 0,
  });

  const renameThread = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      client.renameThread(id, title),
    onSuccess: () => {
      setActionTarget(null);
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const deleteThread = useMutation({
    mutationFn: client.deleteThread,
    onSuccess: (_result, id) => {
      const remainingThreads = threads.filter((thread) => thread.id !== id);
      queryClient.setQueryData<ChatThreadListResponse>(queryKey, (current) =>
        current
          ? {
              ...current,
              items: current.items.filter((thread) => thread.id !== id),
            }
          : current,
      );
      queryClient.removeQueries({ queryKey: ["chat", "thread", id] });
      if (id === activeThreadId)
        setActiveThreadId(remainingThreads[0]?.id ?? null);
      setActionTarget(null);
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const onTurnDone = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const edgePan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !drawerOpen && gesture.dx > 18 && Math.abs(gesture.dy) < 22,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx > 45) setDrawerOpen(true);
        },
      }),
    [drawerOpen],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("history")}
            style={styles.iconButton}
          >
            <Ionicons name="menu" size={24} color={PALETTE.foreground} />
          </Pressable>
          <AssistantMark size={36} />
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {t("title")}
            </Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {roleSubtitle(role, t)}
            </Text>
          </View>
          <Pressable
            onPress={() => createThread.mutate()}
            disabled={createThread.isPending}
            accessibilityRole="button"
            accessibilityLabel={t("newChat")}
            style={styles.iconButton}
          >
            <Ionicons name="add" size={25} color={PALETTE.foreground} />
          </Pressable>
        </View>

        {createError ? (
          <View style={styles.createErrorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={PALETTE.danger}
            />
            <View style={styles.createErrorCopy}>
              <Text style={styles.createErrorTitle}>{t("errorTitle")}</Text>
              <Text numberOfLines={2} style={styles.createErrorMessage}>
                {createError}
              </Text>
            </View>
            <Pressable
              onPress={() => setCreateError(null)}
              accessibilityRole="button"
              accessibilityLabel={t("dismissError")}
              style={styles.bannerClose}
            >
              <Ionicons name="close" size={18} color={PALETTE.muted} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.conversationArea}>
          {detailQuery.data ? (
            <ThreadRuntime
              key={detailQuery.data.id}
              detail={detailQuery.data}
              role={role}
              subjectName={subjectName}
              apiBaseUrl={apiBaseUrl}
              authToken={authToken}
              language={language}
              onDone={onTurnDone}
            />
          ) : detailQuery.isError ? (
            <View style={styles.centerState}>
              <Ionicons
                name="cloud-offline-outline"
                size={32}
                color={PALETTE.muted}
              />
              <Text style={styles.stateTitle}>{t("threadLoadFailed")}</Text>
              <Pressable
                onPress={() => detailQuery.refetch()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>{t("errorRetry")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centerState}>
              <View style={styles.loaderDots}>
                <View
                  style={[
                    styles.loaderDot,
                    { backgroundColor: PALETTE.coralInk },
                  ]}
                />
                <View
                  style={[
                    styles.loaderDot,
                    { backgroundColor: PALETTE.skyInk },
                  ]}
                />
                <View
                  style={[
                    styles.loaderDot,
                    { backgroundColor: PALETTE.mintInk },
                  ]}
                />
              </View>
            </View>
          )}
          <View style={styles.edgeGesture} {...edgePan.panHandlers} />
        </View>
      </KeyboardAvoidingView>

      <HistoryDrawer
        open={drawerOpen}
        threads={threads}
        activeId={activeThreadId}
        loading={threadsQuery.isPending || createThread.isPending}
        failed={threadsQuery.isError}
        actionTarget={actionTarget}
        renamePending={renameThread.isPending}
        deletePending={deleteThread.isPending}
        renameError={
          renameThread.error ? (renameThread.error as Error).message : null
        }
        deleteError={
          deleteThread.error ? (deleteThread.error as Error).message : null
        }
        onClose={() => setDrawerOpen(false)}
        onNew={() => createThread.mutate()}
        onRetry={() => void threadsQuery.refetch()}
        onSelect={(id) => {
          setActiveThreadId(id);
          setDrawerOpen(false);
        }}
        onActions={(thread) => {
          renameThread.reset();
          deleteThread.reset();
          setActionTarget(thread);
        }}
        onCloseAction={() => setActionTarget(null)}
        onRenameAction={(title) =>
          actionTarget && renameThread.mutate({ id: actionTarget.id, title })
        }
        onDeleteAction={() =>
          actionTarget && deleteThread.mutate(actionTarget.id)
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PALETTE.background },
  conversationArea: { flex: 1 },
  header: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 10,
    backgroundColor: PALETTE.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.border,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: {
    color: PALETTE.foreground,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
  },
  headerSubtitle: { color: PALETTE.muted, fontSize: 11, lineHeight: 15 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  mark: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.border,
    shadowColor: "#202333",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  createErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 10,
    marginTop: 8,
    paddingLeft: 12,
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F3C7C7",
    backgroundColor: "#FFF2F2",
  },
  createErrorCopy: { flex: 1, paddingVertical: 8 },
  createErrorTitle: { color: PALETTE.danger, fontSize: 12, fontWeight: "800" },
  createErrorMessage: {
    color: "#6C5151",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  bannerClose: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  threadRoot: { flex: 1 },
  messageListWrap: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 14,
  },
  userRow: { flexDirection: "row", justifyContent: "flex-end" },
  assistantRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  userBubble: {
    maxWidth: "84%",
    borderRadius: 19,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: PALETTE.primary,
  },
  assistantBubble: {
    maxWidth: "82%",
    borderRadius: 19,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  messageText: { fontSize: 14, lineHeight: 21 },
  bold: { fontWeight: "800" },
  workingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 21,
  },
  workingDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#C8CAD1",
    borderTopColor: PALETTE.muted,
  },
  workingText: { color: PALETTE.muted, fontSize: 13 },
  errorBox: { marginTop: 4 },
  errorTitle: { color: PALETTE.danger, fontSize: 13, fontWeight: "700" },
  errorMessage: { color: PALETTE.muted, fontSize: 11, marginTop: 2 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 30,
  },
  emptyTitle: {
    marginTop: 15,
    color: PALETTE.foreground,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 7,
    color: PALETTE.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 330,
  },
  suggestionList: { width: "100%", maxWidth: 520, marginTop: 20, gap: 8 },
  suggestion: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 17,
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    flex: 1,
    color: PALETTE.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  composerArea: {
    backgroundColor: PALETTE.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PALETTE.border,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 5,
  },
  composer: {
    minHeight: 48,
    maxHeight: 130,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 24,
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: "#DCDDDF",
  },
  composerInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 112,
    paddingTop: 8,
    paddingBottom: 7,
    color: PALETTE.foreground,
    fontSize: 14,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.primary,
  },
  latestButton: {
    position: "absolute",
    right: 14,
    bottom: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.border,
    shadowColor: "#202333",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  disclaimer: {
    marginTop: 4,
    color: "#9A9CA6",
    fontSize: 9,
    lineHeight: 12,
    textAlign: "center",
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loaderDots: { flexDirection: "row", gap: 8 },
  loaderDot: { width: 11, height: 11, borderRadius: 6 },
  stateTitle: {
    color: PALETTE.foreground,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: PALETTE.primary,
  },
  retryText: { color: "#FFFFFF", fontWeight: "800" },
  edgeGesture: { position: "absolute", left: 0, top: 0, bottom: 0, width: 20 },
  drawerOverlay: { flex: 1, backgroundColor: "rgba(32, 35, 51, 0.34)" },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: PALETTE.card,
    shadowColor: "#202333",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  drawerSafeArea: { flex: 1 },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.border,
  },
  drawerTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerTitleCopy: { flex: 1, minWidth: 0 },
  drawerHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  drawerTitle: { color: PALETTE.foreground, fontSize: 17, fontWeight: "900" },
  drawerSubtitle: { color: PALETTE.muted, fontSize: 10, marginTop: 1 },
  drawerList: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 20 },
  groupLabel: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 10,
    color: PALETTE.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  firstGroupLabel: { marginTop: 0 },
  threadItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
  },
  activeThread: { backgroundColor: "#FFF0EB" },
  threadTrigger: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingLeft: 10,
  },
  threadTitle: { flex: 1, color: "#4F5260", fontSize: 13 },
  activeThreadTitle: { color: PALETTE.foreground, fontWeight: "800" },
  threadMore: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyThreadList: { alignItems: "center", paddingVertical: 28, gap: 12 },
  noThreads: { color: PALETTE.muted, textAlign: "center", fontSize: 13 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(32, 35, 51, 0.46)",
    zIndex: 30,
    elevation: 30,
  },
  sheetKeyboard: { flex: 1, justifyContent: "flex-end" },
  actionSheet: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: PALETTE.card,
    shadowColor: "#202333",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 24,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    alignSelf: "center",
    borderRadius: 3,
    backgroundColor: "#D9DBE1",
    marginBottom: 14,
  },
  sheetHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  sheetHeadingCopy: { flex: 1, minWidth: 0 },
  sheetEyebrow: {
    color: PALETTE.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sheetThreadTitle: {
    marginTop: 2,
    color: PALETTE.foreground,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  sheetActions: { marginTop: 18, gap: 8 },
  sheetAction: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: "#FBFBFC",
  },
  sheetActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  renameActionIcon: { backgroundColor: PALETTE.sky },
  deleteActionIcon: { backgroundColor: "#FFE7E7" },
  sheetActionText: {
    flex: 1,
    color: PALETTE.foreground,
    fontSize: 15,
    fontWeight: "800",
  },
  destructiveText: { color: PALETTE.danger },
  renameInput: {
    height: 48,
    marginTop: 18,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCDDDF",
    color: PALETTE.foreground,
    fontSize: 15,
  },
  deleteWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 18,
    padding: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#F3C7C7",
    backgroundColor: "#FFF2F2",
  },
  deleteWarningIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE0E0",
  },
  deleteWarningText: {
    flex: 1,
    color: "#704545",
    fontSize: 13,
    lineHeight: 19,
  },
  sheetError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#FFF2F2",
  },
  sheetErrorText: {
    flex: 1,
    color: PALETTE.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  sheetFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 18,
    paddingBottom: 8,
  },
  secondaryAction: {
    minWidth: 90,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  secondaryActionText: { color: PALETTE.foreground, fontWeight: "700" },
  primaryAction: {
    minWidth: 90,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: PALETTE.primary,
  },
  primaryActionText: { color: "#FFFFFF", fontWeight: "800" },
  deleteConfirmButton: { backgroundColor: PALETTE.danger },
});
