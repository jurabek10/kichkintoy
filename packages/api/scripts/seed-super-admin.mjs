/**
 * Seeds (or updates) the platform super_admin account — the founder's login
 * for the /admin dashboard. There is intentionally no UI for creating admins.
 *
 * Usage (from packages/api):
 *   SUPER_ADMIN_USERNAME=founder SUPER_ADMIN_PASSWORD='...' pnpm seed:super-admin
 *
 * Optional: SUPER_ADMIN_NAME, SUPER_ADMIN_PHONE.
 * Re-running is safe: it updates the password and re-ensures the role.
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(apiDir, ".env") });

const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString("base64url")}`;
}

const username = process.env.SUPER_ADMIN_USERNAME?.trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD;
const fullName = process.env.SUPER_ADMIN_NAME?.trim() || "Platform Admin";
const phone = process.env.SUPER_ADMIN_PHONE?.trim() || null;

if (!username || !password) {
  console.error(
    "SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD are required.\n" +
      "Example: SUPER_ADMIN_USERNAME=founder SUPER_ADMIN_PASSWORD='s3cret-pass' pnpm seed:super-admin",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("SUPER_ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required (set it in packages/api/.env).");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { username },
      update: { fullName, ...(phone ? { phone } : {}) },
      create: { username, fullName, phone },
    });

    await tx.authCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash },
      create: { userId: user.id, passwordHash },
    });

    const role = await tx.role.upsert({
      where: { name: "super_admin" },
      update: {},
      create: { name: "super_admin" },
    });

    // Scope-less role: no organization, center, or branch.
    const existing = await tx.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: role.id,
        organizationId: null,
        centerId: null,
        branchId: null,
      },
    });

    if (!existing) {
      await tx.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "super_admin.seeded",
        entityType: "user",
        entityId: user.id,
      },
    });

    return user;
  });

  console.log(
    `super_admin ready: ${user.username} (${user.id}). Log in at /login — you'll land on /admin.`,
  );
} finally {
  await prisma.$disconnect();
}
