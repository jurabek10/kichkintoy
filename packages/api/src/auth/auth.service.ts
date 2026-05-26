import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { PrismaService } from "../database/prisma.service";
import { EskizSmsService } from "./eskiz-sms.service";
import type {
  LoginInput,
  RegisterInput,
  SendCodeInput,
  UserRoleInput,
  VerifyCodeInput,
} from "./auth.schemas";

const scrypt = promisify(scryptCallback);
const otpTtlMs = 10 * 60 * 1000;
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eskizSms: EskizSmsService,
  ) {}

  async sendCode(input: SendCodeInput) {
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    const code = createOtpCode();
    const delivery = await this.eskizSms.sendVerificationCode(
      phoneNumber,
      code,
    );

    await this.prisma.phoneVerification.create({
      data: {
        phone: phoneNumber,
        codeHash: hashOpaqueValue(code),
        expiresAt: new Date(Date.now() + otpTtlMs),
      },
    });

    return {
      phoneNumber,
      expiresInSeconds: Math.floor(otpTtlMs / 1000),
      delivery: delivery.provider,
      sent: delivery.sent,
      debugCode: shouldReturnDebugCode() ? code : undefined,
    };
  }

  async verifyCode(input: VerifyCodeInput) {
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        phone: phoneNumber,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (
      !verification ||
      verification.codeHash !== hashOpaqueValue(input.code)
    ) {
      throw new BadRequestException(
        "Verification code is incorrect or expired.",
      );
    }

    const verificationToken = randomToken();

    await this.prisma.phoneVerification.update({
      where: {
        id: verification.id,
      },
      data: {
        verifiedAt: new Date(),
        verificationToken,
      },
    });

    return {
      phoneNumber,
      verificationToken,
    };
  }

  async register(input: RegisterInput) {
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    const normalizedUsername = input.username.trim().toLowerCase();
    const verification = await this.prisma.phoneVerification.findUnique({
      where: {
        verificationToken: input.phoneVerificationToken,
      },
    });

    if (
      !verification ||
      verification.phone !== phoneNumber ||
      !verification.verifiedAt ||
      verification.consumedAt ||
      verification.expiresAt <= new Date()
    ) {
      throw new BadRequestException("Phone verification is required.");
    }

    await this.ensureUniqueAccount(normalizedUsername, phoneNumber);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.upsert({
          where: {
            name: input.role,
          },
          update: {},
          create: {
            name: input.role,
          },
        });

        const user = await tx.user.create({
          data: {
            username: normalizedUsername,
            phone: phoneNumber,
            fullName: input.fullName.trim(),
            userRoles: {
              create: {
                roleId: role.id,
              },
            },
            userNotificationSettings: {
              create: {},
            },
          },
        });

        await tx.authCredential.create({
          data: {
            userId: user.id,
            passwordHash: await hashPassword(input.password),
          },
        });

        if (input.role === "parent" && input.child) {
          await tx.parentProfile.create({
            data: {
              userId: user.id,
              displayName: input.fullName.trim(),
            },
          });

          const child = await tx.child.create({
            data: {
              firstName: input.child.name.trim(),
              dob: input.child.dateOfBirth,
              gender: input.child.gender,
              photoUrl: input.child.imageUrl,
              signupClassName: input.child.className.trim(),
            },
          });

          await tx.childGuardian.create({
            data: {
              childId: child.id,
              userId: user.id,
              relationship:
                input.child.relationshipType === "other"
                  ? input.child.customRelationshipLabel?.trim() || "other"
                  : input.child.relationshipType,
              nicknameForChild: input.child.customRelationshipLabel?.trim(),
              isPrimary: true,
              canMessage: true,
            },
          });
        }

        if (input.role === "teacher") {
          await tx.teacherProfile.create({
            data: {
              userId: user.id,
            },
          });
        }

        await tx.phoneVerification.update({
          where: {
            id: verification.id,
          },
          data: {
            consumedAt: new Date(),
          },
        });

        const session = await createSession(tx, user.id);

        return {
          user: toAuthUser(user, input.role),
          session,
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "Username or phone number is already taken.",
        );
      }

      throw error;
    }
  }

  async login(input: LoginInput) {
    const normalizedUsername = input.username.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: {
        username: normalizedUsername,
      },
      include: {
        authCredential: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user?.authCredential) {
      throw new UnauthorizedException("Username or password is incorrect.");
    }

    const isValidPassword = await verifyPassword(
      input.password,
      user.authCredential.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException("Username or password is incorrect.");
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const createdSession = await createSession(tx, user.id);

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastLoginAt: new Date(),
        },
      });

      return createdSession;
    });

    return {
      user: toAuthUser(user, getPrimaryRole(user.userRoles)),
      session,
    };
  }

  async logout(token: string) {
    await this.prisma.authSession.updateMany({
      where: {
        tokenHash: hashOpaqueValue(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
    };
  }

  private async ensureUniqueAccount(username: string, phoneNumber: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { phone: phoneNumber }],
      },
      select: {
        username: true,
        phone: true,
      },
    });

    if (existingUser?.username === username) {
      throw new ConflictException("Username is already taken.");
    }

    if (existingUser?.phone === phoneNumber) {
      throw new ConflictException("Phone number is already registered.");
    }
  }
}

function normalizePhoneNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  return `${prefix}${trimmed.replace(/\D/g, "")}`;
}

function createOtpCode() {
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_DEMO_CODE) {
    return process.env.AUTH_DEMO_CODE;
  }

  if (process.env.NODE_ENV !== "production") {
    return "123456";
  }

  return String(randomInt(100000, 999999));
}

function shouldReturnDebugCode() {
  return process.env.NODE_ENV !== "production";
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function hashOpaqueValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("base64url")}`;
}

async function verifyPassword(password: string, storedPassword: string) {
  const [algorithm, salt, storedHash] = storedPassword.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const hash = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(storedHash, "base64url");

  if (hash.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(hash, stored);
}

async function createSession(tx: Prisma.TransactionClient, userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + sessionTtlMs);

  await tx.authSession.create({
    data: {
      userId,
      tokenHash: hashOpaqueValue(token),
      expiresAt,
    },
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

function toAuthUser(
  user: {
    id: string;
    username: string | null;
    phone: string | null;
    fullName: string;
  },
  role: UserRoleInput,
) {
  return {
    id: user.id,
    username: user.username,
    phoneNumber: user.phone,
    fullName: user.fullName,
    role,
  };
}

function getPrimaryRole(
  userRoles: Array<{
    role: {
      name: string;
    };
  }>,
): UserRoleInput {
  const role = userRoles[0]?.role.name;

  if (role === "director" || role === "parent" || role === "teacher") {
    return role;
  }

  return "parent";
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
