-- Platform subscription pricing per center (founder billing page):
-- total = platform_base_fee_uzs + activeKids * platform_per_kid_fee_uzs.
ALTER TABLE "centers"
    ADD COLUMN "platform_base_fee_uzs" DECIMAL(14,2) NOT NULL DEFAULT 300000,
    ADD COLUMN "platform_per_kid_fee_uzs" DECIMAL(14,2) NOT NULL DEFAULT 30000;
