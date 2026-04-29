ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username_updated_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_profile" text DEFAULT 'viewer' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "benefit_override" text DEFAULT 'standard' NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique"
  ON "users" ("username")
  WHERE "username" IS NOT NULL;

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_check";
ALTER TABLE "users"
  ADD CONSTRAINT "users_username_check"
  CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9][a-z0-9_]{2,29}$');

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_profile_check";
ALTER TABLE "users"
  ADD CONSTRAINT "users_role_profile_check"
  CHECK (
    "role_profile" = 'viewer'
    OR "role_profile" ~ '^(dev|writer|designer|product-manager|manager)(\+(dev|writer|designer|product-manager|manager))?$'
  );

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_benefit_override_check";
ALTER TABLE "users"
  ADD CONSTRAINT "users_benefit_override_check"
  CHECK ("benefit_override" in ('standard','max'));
