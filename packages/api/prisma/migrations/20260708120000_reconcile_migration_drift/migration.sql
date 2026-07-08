-- Reconciles migration-history replay with the actual dev database.
-- The database was ahead of these definitions because several migrations
-- were applied manually (prisma db execute with schema-derived SQL).
-- Marked as applied via 'prisma migrate resolve' — never ran against dev.

-- DropForeignKey
ALTER TABLE "public"."album_comments" DROP CONSTRAINT "album_comments_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_comments" DROP CONSTRAINT "album_comments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_media" DROP CONSTRAINT "album_media_media_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_media" DROP CONSTRAINT "album_media_post_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_media_children" DROP CONSTRAINT "album_media_children_child_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_media_children" DROP CONSTRAINT "album_media_children_media_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_post_classes" DROP CONSTRAINT "album_post_classes_class_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_post_classes" DROP CONSTRAINT "album_post_classes_post_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_reactions" DROP CONSTRAINT "album_reactions_post_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."album_reactions" DROP CONSTRAINT "album_reactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."center_invitations" DROP CONSTRAINT "center_invitations_center_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."center_invitations" DROP CONSTRAINT "center_invitations_invited_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."districts" DROP CONSTRAINT "districts_region_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_child_statuses" DROP CONSTRAINT "meal_child_statuses_child_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_child_statuses" DROP CONSTRAINT "meal_child_statuses_meal_post_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_child_statuses" DROP CONSTRAINT "meal_child_statuses_recorded_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_post_classes" DROP CONSTRAINT "meal_post_classes_class_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_post_classes" DROP CONSTRAINT "meal_post_classes_meal_post_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_post_media" DROP CONSTRAINT "meal_post_media_meal_post_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_post_media" DROP CONSTRAINT "meal_post_media_media_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_posts" DROP CONSTRAINT "meal_posts_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."meal_posts" DROP CONSTRAINT "meal_posts_center_id_fkey";

-- DropIndex
DROP INDEX "public"."idx_album_posts_center_status";

-- DropIndex
DROP INDEX "public"."medication_requests_center_id_idx";

-- DropIndex
DROP INDEX "public"."medication_requests_child_id_idx";

-- DropIndex
DROP INDEX "public"."medication_requests_class_id_idx";

-- AlterTable
ALTER TABLE "public"."album_comments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."album_media" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."album_media_children" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."album_post_classes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."album_reactions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."attendance_records" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."meal_child_statuses" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'not_checked_in';

-- AlterTable
ALTER TABLE "public"."meal_post_classes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."meal_post_media" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."meal_posts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."pickup_time_notices" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."student_document_attachments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."student_document_request_children" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."student_document_request_classes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."student_document_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."student_document_submissions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."student_document_templates" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "album_posts_center_id_status_published_at_idx" ON "public"."album_posts"("center_id" ASC, "status" ASC, "published_at" ASC);

-- AddForeignKey
ALTER TABLE "public"."album_comments" ADD CONSTRAINT "album_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_comments" ADD CONSTRAINT "album_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."album_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_media" ADD CONSTRAINT "album_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_media" ADD CONSTRAINT "album_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."album_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_media_children" ADD CONSTRAINT "album_media_children_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_media_children" ADD CONSTRAINT "album_media_children_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."album_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_post_classes" ADD CONSTRAINT "album_post_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_post_classes" ADD CONSTRAINT "album_post_classes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."album_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_reactions" ADD CONSTRAINT "album_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."album_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."album_reactions" ADD CONSTRAINT "album_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."center_invitations" ADD CONSTRAINT "center_invitations_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."center_invitations" ADD CONSTRAINT "center_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."districts" ADD CONSTRAINT "districts_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_child_statuses" ADD CONSTRAINT "meal_child_statuses_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_child_statuses" ADD CONSTRAINT "meal_child_statuses_meal_post_id_fkey" FOREIGN KEY ("meal_post_id") REFERENCES "public"."meal_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_child_statuses" ADD CONSTRAINT "meal_child_statuses_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_post_classes" ADD CONSTRAINT "meal_post_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_post_classes" ADD CONSTRAINT "meal_post_classes_meal_post_id_fkey" FOREIGN KEY ("meal_post_id") REFERENCES "public"."meal_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_post_media" ADD CONSTRAINT "meal_post_media_meal_post_id_fkey" FOREIGN KEY ("meal_post_id") REFERENCES "public"."meal_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_post_media" ADD CONSTRAINT "meal_post_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_posts" ADD CONSTRAINT "meal_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meal_posts" ADD CONSTRAINT "meal_posts_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "public"."centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."idx_album_comments_post" RENAME TO "album_comments_post_id_created_at_idx";

-- RenameIndex
ALTER INDEX "public"."idx_album_media_post_position" RENAME TO "album_media_post_id_position_idx";

-- RenameIndex
ALTER INDEX "public"."idx_album_media_children_child" RENAME TO "album_media_children_child_id_idx";

-- RenameIndex
ALTER INDEX "public"."idx_album_post_children_child" RENAME TO "album_post_children_child_id_idx";

-- RenameIndex
ALTER INDEX "public"."idx_album_post_classes_class" RENAME TO "album_post_classes_class_id_idx";

-- RenameIndex
ALTER INDEX "public"."idx_album_reactions_post" RENAME TO "album_reactions_post_id_idx";

-- RenameIndex
ALTER INDEX "public"."idx_meal_child_statuses_child" RENAME TO "meal_child_statuses_child_id_idx";

-- RenameIndex
ALTER INDEX "public"."idx_meal_post_classes_class" RENAME TO "meal_post_classes_class_id_idx";

-- RenameIndex
ALTER INDEX "public"."idx_meal_post_media_post" RENAME TO "meal_post_media_meal_post_id_position_idx";

-- RenameIndex
ALTER INDEX "public"."idx_meal_posts_center_date" RENAME TO "meal_posts_center_id_meal_date_idx";

-- RenameIndex
ALTER INDEX "public"."idx_meal_posts_status" RENAME TO "meal_posts_status_published_at_idx";

