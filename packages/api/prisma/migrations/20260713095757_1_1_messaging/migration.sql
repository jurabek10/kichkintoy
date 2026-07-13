/*
  Warnings:

  - You are about to drop the `development_portfolio_exports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthly_development_summaries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `special_class_child_observations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `special_class_comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `special_class_media_children` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `special_class_schedules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `special_class_session_media` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `special_class_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `special_subject_rubrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `special_subjects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `specialist_teachers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "center_platform_payments" DROP CONSTRAINT "center_platform_payments_center_id_fkey";

-- DropForeignKey
ALTER TABLE "development_portfolio_exports" DROP CONSTRAINT "development_portfolio_exports_center_id_fkey";

-- DropForeignKey
ALTER TABLE "development_portfolio_exports" DROP CONSTRAINT "development_portfolio_exports_child_id_fkey";

-- DropForeignKey
ALTER TABLE "development_portfolio_exports" DROP CONSTRAINT "development_portfolio_exports_generated_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "development_portfolio_exports" DROP CONSTRAINT "development_portfolio_exports_media_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "monthly_development_summaries" DROP CONSTRAINT "monthly_development_summaries_approved_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "monthly_development_summaries" DROP CONSTRAINT "monthly_development_summaries_center_id_fkey";

-- DropForeignKey
ALTER TABLE "monthly_development_summaries" DROP CONSTRAINT "monthly_development_summaries_child_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_child_observations" DROP CONSTRAINT "special_class_child_observations_child_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_child_observations" DROP CONSTRAINT "special_class_child_observations_session_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_comments" DROP CONSTRAINT "special_class_comments_author_user_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_comments" DROP CONSTRAINT "special_class_comments_child_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_comments" DROP CONSTRAINT "special_class_comments_session_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_media_children" DROP CONSTRAINT "special_class_media_children_child_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_media_children" DROP CONSTRAINT "special_class_media_children_session_media_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_schedules" DROP CONSTRAINT "special_class_schedules_center_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_schedules" DROP CONSTRAINT "special_class_schedules_class_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_schedules" DROP CONSTRAINT "special_class_schedules_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_schedules" DROP CONSTRAINT "special_class_schedules_specialist_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_schedules" DROP CONSTRAINT "special_class_schedules_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_session_media" DROP CONSTRAINT "special_class_session_media_media_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_session_media" DROP CONSTRAINT "special_class_session_media_session_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_sessions" DROP CONSTRAINT "special_class_sessions_center_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_sessions" DROP CONSTRAINT "special_class_sessions_class_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_sessions" DROP CONSTRAINT "special_class_sessions_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_sessions" DROP CONSTRAINT "special_class_sessions_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_sessions" DROP CONSTRAINT "special_class_sessions_specialist_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_sessions" DROP CONSTRAINT "special_class_sessions_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "special_class_sessions" DROP CONSTRAINT "special_class_sessions_updated_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "special_subject_rubrics" DROP CONSTRAINT "special_subject_rubrics_center_id_fkey";

-- DropForeignKey
ALTER TABLE "special_subject_rubrics" DROP CONSTRAINT "special_subject_rubrics_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "special_subjects" DROP CONSTRAINT "special_subjects_center_id_fkey";

-- DropForeignKey
ALTER TABLE "special_subjects" DROP CONSTRAINT "special_subjects_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "specialist_teachers" DROP CONSTRAINT "specialist_teachers_center_id_fkey";

-- AlterTable
ALTER TABLE "center_platform_payments" ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "development_portfolio_exports";

-- DropTable
DROP TABLE "monthly_development_summaries";

-- DropTable
DROP TABLE "special_class_child_observations";

-- DropTable
DROP TABLE "special_class_comments";

-- DropTable
DROP TABLE "special_class_media_children";

-- DropTable
DROP TABLE "special_class_schedules";

-- DropTable
DROP TABLE "special_class_session_media";

-- DropTable
DROP TABLE "special_class_sessions";

-- DropTable
DROP TABLE "special_subject_rubrics";

-- DropTable
DROP TABLE "special_subjects";

-- DropTable
DROP TABLE "specialist_teachers";

-- AddForeignKey
ALTER TABLE "center_platform_payments" ADD CONSTRAINT "center_platform_payments_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_center_platform_payments_center" RENAME TO "center_platform_payments_center_id_idx";
