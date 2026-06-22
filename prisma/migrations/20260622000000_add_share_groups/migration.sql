-- CreateEnum
CREATE TYPE "ShareInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REMOVED');

-- CreateTable
CREATE TABLE "share_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_group_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "status" "ShareInviteStatus" NOT NULL DEFAULT 'PENDING',
    "invited_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(6),

    CONSTRAINT "share_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_group_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "image_id" UUID NOT NULL,
    "added_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_group_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "share_groups_name_key_key" ON "share_groups"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "share_group_members_group_id_email_key" ON "share_group_members"("group_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "share_group_images_group_id_image_id_key" ON "share_group_images"("group_id", "image_id");

-- AddForeignKey
ALTER TABLE "share_groups" ADD CONSTRAINT "share_groups_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_group_members" ADD CONSTRAINT "share_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "share_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_group_members" ADD CONSTRAINT "share_group_members_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_group_members" ADD CONSTRAINT "share_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_group_images" ADD CONSTRAINT "share_group_images_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "share_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_group_images" ADD CONSTRAINT "share_group_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_group_images" ADD CONSTRAINT "share_group_images_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
