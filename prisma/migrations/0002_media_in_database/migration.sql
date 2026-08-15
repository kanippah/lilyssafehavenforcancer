-- Store uploaded images in Postgres instead of on a disk volume.
--
-- Added with a temporary default so the migration also succeeds on a database
-- that already has media rows (those rows referenced files on the old volume;
-- they land here as empty and can be re-uploaded from the media library).
ALTER TABLE "MediaAsset" ADD COLUMN "data" BYTEA NOT NULL DEFAULT '\x';
ALTER TABLE "MediaAsset" ALTER COLUMN "data" DROP DEFAULT;

-- Images are served by looking up this exact path, so it must be unique.
CREATE UNIQUE INDEX "MediaAsset_url_key" ON "MediaAsset"("url");
