INSERT INTO "admin_roles" ("id", "name", "description", "system", "locked", "permissions", "updatedByName", "createdAt", "updatedAt") VALUES
  ('super_admin', 'Super admin', 'Full business access to every part of eLab. Does not author content. Cannot be edited.', true, true, '[]'::jsonb, 'System', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('platform_admin', 'Platform admin', 'Authors problems and tests, runs the judge, runtimes, incidents and releases.', true, false, '["users.view","content.view","analytics.view","support.respond","audit.view","platform.operate"]'::jsonb, 'System', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('content_manager', 'Content manager', 'Creates, imports and organizes coding problems and submits them for review.', true, false, '["content.view","content.edit","analytics.view"]'::jsonb, 'System', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "admin_roles" r
SET "permissions" = (
  SELECT COALESCE(jsonb_agg(k ORDER BY k), '[]'::jsonb)
  FROM (
    SELECT DISTINCT k FROM (
      SELECT jsonb_array_elements_text(r."permissions") AS k
      UNION ALL
      SELECT unnest(ARRAY['content.validate','runtimes.manage','judge.manage','monitoring.view','support.technical','incidents.manage','releases.manage'])
      WHERE r."permissions" ? 'platform.operate'
      UNION ALL
      SELECT unnest(ARRAY['content.upload','problems.manage','tests.manage','tests.hidden'])
      WHERE r."permissions" ? 'platform.operate' AND r."id" = 'platform_admin'
    ) expanded
    WHERE k <> 'platform.operate'
  ) cleaned
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE r."permissions" ? 'platform.operate' AND r."id" <> 'super_admin';

UPDATE "admin_roles"
SET "permissions" = '["admins.manage","analytics.view","audit.view","billing.plans","billing.refund","billing.view","content.edit","content.publish","content.review.approve","content.validate","content.view","coupons.manage","incidents.manage","judge.manage","monitoring.view","notifications.send","releases.manage","reports.export","runtimes.manage","settings.manage","support.respond","support.technical","users.manage","users.suspend","users.view"]'::jsonb,
    "description" = 'Full business access to every part of eLab. Does not author content. Cannot be edited.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'super_admin';

UPDATE "admin_roles"
SET "permissions" = (
  SELECT COALESCE(jsonb_agg(k ORDER BY k), '[]'::jsonb)
  FROM jsonb_array_elements_text("permissions") AS k
  WHERE k NOT IN ('content.upload','problems.manage','tests.manage','tests.hidden')
),
"updatedAt" = CURRENT_TIMESTAMP
WHERE "id" NOT IN ('super_admin', 'platform_admin', 'content_manager')
  AND "permissions" ?| ARRAY['content.upload','problems.manage','tests.manage','tests.hidden'];

UPDATE "users" SET "adminRoleId" = 'platform_admin' WHERE "role" = 'PLATFORM_ADMIN' AND "adminRoleId" IS NULL;
UPDATE "users" SET "adminRoleId" = 'content_manager' WHERE "role" = 'CONTENT_MANAGER' AND "adminRoleId" IS NULL;
