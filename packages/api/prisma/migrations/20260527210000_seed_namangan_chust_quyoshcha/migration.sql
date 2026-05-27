-- Namangan / Chust district + Quyoshcha demo kindergarten for local signup testing.

-- District: Chust (Namangan region)
INSERT INTO "districts" ("id", "region_id", "name", "slug", "display_order")
VALUES (
    '00000000-0000-4002-8000-000000000001',
    '00000000-0000-4001-8000-00000000000a',
    'Chust',
    'chust',
    1
)
ON CONFLICT ("region_id", "slug") DO NOTHING;

-- Organization + center: Quyoshcha
INSERT INTO "organizations" (
    "id",
    "name",
    "legal_name",
    "default_language",
    "status"
)
VALUES (
    '00000000-0000-4003-8000-000000000001',
    'Quyoshcha bog''cha',
    'Quyoshcha bog''cha',
    'uz',
    'active'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "centers" (
    "id",
    "organization_id",
    "name",
    "center_code",
    "facility_type",
    "region_id",
    "district_id",
    "region",
    "district",
    "address",
    "status"
)
VALUES (
    '00000000-0000-4003-8000-000000000002',
    '00000000-0000-4003-8000-000000000001',
    'Quyoshcha',
    'KIC-QYOS',
    'kindergarten',
    '00000000-0000-4001-8000-00000000000a',
    '00000000-0000-4002-8000-000000000001',
    'Namangan',
    'Chust',
    'Chust tumani, Namangan viloyati',
    'active'
)
ON CONFLICT ("id") DO NOTHING;

-- Default class so parent invitations / class picker work out of the box.
INSERT INTO "classes" ("id", "center_id", "name", "status")
VALUES (
    '00000000-0000-4003-8000-000000000003',
    '00000000-0000-4003-8000-000000000002',
    'Kichkintoy guruh',
    'active'
)
ON CONFLICT ("id") DO NOTHING;
