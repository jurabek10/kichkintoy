-- Replace invite codes with phone-based invitations.

-- DropForeignKey
ALTER TABLE "center_join_requests" DROP CONSTRAINT IF EXISTS "center_join_requests_invite_code_id_fkey";

-- DropColumn
ALTER TABLE "center_join_requests" DROP COLUMN IF EXISTS "invite_code_id";

-- DropTable
DROP TABLE IF EXISTS "center_invite_codes";

-- AddColumn (centers): facility_type and FK columns for geography
ALTER TABLE "centers"
    ADD COLUMN "facility_type" TEXT NOT NULL DEFAULT 'kindergarten',
    ADD COLUMN "region_id" UUID,
    ADD COLUMN "district_id" UUID;

ALTER TABLE "centers"
    ADD CONSTRAINT "centers_facility_type_check"
    CHECK ("facility_type" IN ('kindergarten', 'daycare', 'academy'));

-- AddColumn (user_roles): can_approve_members flag for teachers granted approver access
ALTER TABLE "user_roles"
    ADD COLUMN "can_approve_members" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: regions
CREATE TABLE "regions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'UZ',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");
CREATE UNIQUE INDEX "regions_slug_key" ON "regions"("slug");

-- CreateTable: districts
CREATE TABLE "districts" (
    "id" UUID NOT NULL,
    "region_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "districts_region_id_slug_key" ON "districts"("region_id", "slug");
CREATE INDEX "districts_region_id_idx" ON "districts"("region_id");

ALTER TABLE "districts" ADD CONSTRAINT "districts_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey (centers -> regions/districts)
ALTER TABLE "centers" ADD CONSTRAINT "centers_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "centers" ADD CONSTRAINT "centers_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex (centers)
CREATE INDEX "centers_region_id_district_id_idx" ON "centers"("region_id", "district_id");
CREATE INDEX "centers_facility_type_idx" ON "centers"("facility_type");

-- CreateTable: center_invitations
CREATE TABLE "center_invitations" (
    "id" UUID NOT NULL,
    "center_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "class_id" UUID,
    "phone" TEXT NOT NULL,
    "child_name_hint" TEXT,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "accepted_by_user_id" UUID,
    "declined_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "center_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "center_invitations_code_key" ON "center_invitations"("code");
CREATE INDEX "center_invitations_center_id_created_at_idx" ON "center_invitations"("center_id", "created_at" DESC);
CREATE INDEX "center_invitations_phone_idx" ON "center_invitations"("phone");

-- Partial index for the hot lookup of open invitations for a verified phone.
CREATE INDEX "center_invitations_phone_open_idx"
    ON "center_invitations"("phone")
    WHERE "accepted_at" IS NULL
      AND "declined_at" IS NULL
      AND "revoked_at" IS NULL;

ALTER TABLE "center_invitations"
    ADD CONSTRAINT "center_invitations_kind_check"
    CHECK ("kind" IN ('parent', 'teacher'));

ALTER TABLE "center_invitations" ADD CONSTRAINT "center_invitations_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "center_invitations" ADD CONSTRAINT "center_invitations_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "center_invitations" ADD CONSTRAINT "center_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "center_invitations" ADD CONSTRAINT "center_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: Uzbekistan regions
INSERT INTO "regions" ("id", "name", "slug", "display_order") VALUES
    ('00000000-0000-4001-8000-000000000001', 'Tashkent City',  'tashkent-city',   1),
    ('00000000-0000-4001-8000-000000000002', 'Tashkent Region','tashkent-region', 2),
    ('00000000-0000-4001-8000-000000000003', 'Andijan',        'andijan',         3),
    ('00000000-0000-4001-8000-000000000004', 'Bukhara',        'bukhara',         4),
    ('00000000-0000-4001-8000-000000000005', 'Fergana',        'fergana',         5),
    ('00000000-0000-4001-8000-000000000006', 'Jizzakh',        'jizzakh',         6),
    ('00000000-0000-4001-8000-000000000007', 'Karakalpakstan', 'karakalpakstan',  7),
    ('00000000-0000-4001-8000-000000000008', 'Kashkadarya',    'kashkadarya',     8),
    ('00000000-0000-4001-8000-000000000009', 'Khorezm',        'khorezm',         9),
    ('00000000-0000-4001-8000-00000000000a', 'Namangan',       'namangan',       10),
    ('00000000-0000-4001-8000-00000000000b', 'Navoiy',         'navoiy',         11),
    ('00000000-0000-4001-8000-00000000000c', 'Samarkand',      'samarkand',      12),
    ('00000000-0000-4001-8000-00000000000d', 'Sirdaryo',       'sirdaryo',       13),
    ('00000000-0000-4001-8000-00000000000e', 'Surkhandarya',   'surkhandarya',   14)
ON CONFLICT ("id") DO NOTHING;

-- Seed: Tashkent City districts (12 tumanlar)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order") VALUES
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Bektemir',        'bektemir',         1),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Chilonzor',       'chilonzor',        2),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Mirobod',         'mirobod',          3),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Mirzo-Ulug''bek', 'mirzo-ulugbek',    4),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Olmazor',         'olmazor',          5),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Sergeli',         'sergeli',          6),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Shayxontohur',    'shayxontohur',     7),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Uchtepa',         'uchtepa',          8),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Yakkasaroy',      'yakkasaroy',       9),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Yashnobod',       'yashnobod',       10),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Yunusobod',       'yunusobod',       11),
    (gen_random_uuid(), '00000000-0000-4001-8000-000000000001', 'Yangihayot',      'yangihayot',      12)
ON CONFLICT ("region_id", "slug") DO NOTHING;
