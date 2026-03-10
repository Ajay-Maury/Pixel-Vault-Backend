-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "gender" "Gender",
ADD COLUMN "lastName" TEXT;

UPDATE "users"
SET
  "firstName" = COALESCE(NULLIF(split_part(email, '@', 1), ''), 'User'),
  "gender" = COALESCE("gender", 'OTHER'::"Gender")
WHERE "firstName" IS NULL OR "gender" IS NULL;

ALTER TABLE "users"
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "gender" SET NOT NULL;
