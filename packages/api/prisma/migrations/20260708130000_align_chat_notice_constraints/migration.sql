-- Aligns the hand-written chat/notice-comment DDL with Prisma schema
-- conventions (constraint definitions, index names, client-side id defaults),
-- so `prisma migrate dev` sees no diff for these tables.

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_thread_id_fkey";

-- DropForeignKey
ALTER TABLE "notice_comments" DROP CONSTRAINT "notice_comments_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notice_comments" DROP CONSTRAINT "notice_comments_notice_id_fkey";

-- AlterTable
ALTER TABLE "chat_messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chat_threads" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notice_comments" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_chat_messages_thread" RENAME TO "chat_messages_thread_id_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_chat_threads_owner" RENAME TO "chat_threads_owner_user_id_owner_role_updated_at_idx";

-- RenameIndex
ALTER INDEX "idx_notice_comments_notice" RENAME TO "notice_comments_notice_id_created_at_idx";
