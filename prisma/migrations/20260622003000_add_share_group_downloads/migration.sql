-- CreateTable
CREATE TABLE "share_group_image_downloads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "image_id" UUID NOT NULL,
    "downloader_user_id" UUID NOT NULL,
    "downloaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_group_image_downloads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "share_group_image_downloads" ADD CONSTRAINT "share_group_image_downloads_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "share_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_group_image_downloads" ADD CONSTRAINT "share_group_image_downloads_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "share_group_image_downloads" ADD CONSTRAINT "share_group_image_downloads_downloader_user_id_fkey" FOREIGN KEY ("downloader_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
