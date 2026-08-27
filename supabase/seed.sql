-- Dev-only seed data. Runs on `supabase db reset`. None of this is real bakery data —
-- real catalog/customers/prices are entered fresh in production (WORK_PLAN stage 7).

insert into bakery_settings (id, name, phone, whatsapp, email, address)
values (1, 'מאפיית שני האופים', '+972500000000', '+972500000000', 'info@example.com', 'רחוב הדוגמה 1, ישראל');

-- cutoff rules: default is "closes the day before at 12:00"; Sunday delivery closes
-- Thursday at 12:00 (offset 3); Saturday has no delivery at all (PRD §2.2).
insert into cutoff_rules (weekday, enabled, offset_days, cutoff_time) values
  (0, true,  3, '12:00'), -- Sunday delivery -> closes Thursday
  (1, true,  1, '12:00'),
  (2, true,  1, '12:00'),
  (3, true,  1, '12:00'),
  (4, true,  1, '12:00'),
  (5, true,  1, '12:00'),
  (6, false, 1, '12:00'); -- Saturday: no delivery

insert into cutoff_exceptions (date, label, open, cutoff_at) values
  ('2026-12-25', 'בדיקה - יום סגור', false, null);

-- small test catalog (dev seed only, not the real product list)
insert into categories (id, name, position) values
  ('c0000000-0000-0000-0000-000000000001', 'לחם', 1),
  ('c0000000-0000-0000-0000-000000000002', 'מאפים', 2);

insert into products (id, category_id, name, sku, unit, price, weight_grams) values
  ('90000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'לחם אחיד', 'BR-1', 'unit', 10.00, 750),
  ('90000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'בגט', 'BR-2', 'unit', 8.00, 300),
  ('90000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'קרואסון', 'PA-1', 'unit', 6.00, 80),
  ('90000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'עוגת שוקולד', 'PA-2', 'kg',   60.00, null);

-- test customers (fixed per WORK_PLAN §"משתמשי בדיקה קבועים")
insert into customers (id, code, name, address, allowed_rounds, blocked) values
  ('22222222-2222-2222-2222-222222222201', 'A', 'לקוח א׳ (בדיקה)', 'רחוב א׳ 1', '{morning,noon}', false),
  ('22222222-2222-2222-2222-222222222202', 'B', 'לקוח ב׳ (בדיקה)', 'רחוב ב׳ 2', '{morning}',      false),
  ('22222222-2222-2222-2222-222222222203', 'C', 'לקוח ג׳ (בדיקה, חסום)', 'רחוב ג׳ 3', '{morning}', true);

insert into customer_contacts (customer_id, name, phone, is_primary) values
  ('22222222-2222-2222-2222-222222222201', 'איש קשר ראשי - לקוח א׳', '+972500000002', true),
  ('22222222-2222-2222-2222-222222222201', 'איש קשר נוסף - לקוח א׳', '+972500000003', false),
  ('22222222-2222-2222-2222-222222222202', 'איש קשר - לקוח ב׳', '+972500000004', true),
  ('22222222-2222-2222-2222-222222222203', 'איש קשר - לקוח ג׳', '+972500000005', true);

-- special prices for customer A (allowed both rounds)
insert into customer_prices (customer_id, product_id, price) values
  ('22222222-2222-2222-2222-222222222201', '90000000-0000-0000-0000-000000000001', 8.50),
  ('22222222-2222-2222-2222-222222222201', '90000000-0000-0000-0000-000000000003', 5.00);

-- test auth users: one admin, one per contact above. Written directly into auth.users
-- + auth.identities (not via the Admin API) so `supabase db reset` recreates them
-- deterministically; the shape here matches what GoTrue itself writes for a phone
-- signup, so a real phone-OTP login in stage 1 finds the same user instead of
-- colliding with a differently-shaped row.
-- Phone numbers here deliberately have NO leading "+" — GoTrue normalizes phone
-- numbers by stripping it before storing/matching (confirmed empirically: signing in
-- with "+972500000001" looks up "972500000001"). A seeded row stored WITH a "+" never
-- matches a real signInWithOtp call, silently creates a fresh unrelated auth.users row
-- instead (since enable_signup=true) and locks the test user out of their own account.
do $$
declare
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  v_users jsonb := '[
    {"id":"11111111-1111-1111-1111-111111111101","phone":"972500000001"},
    {"id":"11111111-1111-1111-1111-111111111201","phone":"972500000002"},
    {"id":"11111111-1111-1111-1111-111111111202","phone":"972500000003"},
    {"id":"11111111-1111-1111-1111-111111111301","phone":"972500000004"},
    {"id":"11111111-1111-1111-1111-111111111401","phone":"972500000005"}
  ]';
  v_user jsonb;
begin
  for v_user in select * from jsonb_array_elements(v_users) loop
    -- confirmation_token/recovery_token/email_change_token_new/email_change have no
    -- column default (NULL) — GoTrue's Go scanner expects non-null strings for every
    -- one of these token columns and errors ("converting NULL to string is
    -- unsupported") the moment it reads a row that skipped them, so they must be set
    -- to '' explicitly here even though this user never goes through email/recovery
    -- flows.
    insert into auth.users (
      instance_id, id, aud, role, phone, phone_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      created_at, updated_at
    ) values (
      v_instance_id,
      (v_user->>'id')::uuid,
      'authenticated', 'authenticated',
      v_user->>'phone', now(),
      '{"provider":"phone","providers":["phone"]}'::jsonb, '{}'::jsonb,
      false, false,
      '', '', '', '',
      now(), now()
    );

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user->>'phone', (v_user->>'id')::uuid,
      jsonb_build_object('sub', v_user->>'id', 'phone', v_user->>'phone', 'phone_verified', true),
      'phone', now(), now()
    );
  end loop;
end $$;

insert into app_users (user_id, phone, role, customer_id) values
  ('11111111-1111-1111-1111-111111111101', '+972500000001', 'admin', null),
  ('11111111-1111-1111-1111-111111111201', '+972500000002', 'customer', '22222222-2222-2222-2222-222222222201'),
  ('11111111-1111-1111-1111-111111111202', '+972500000003', 'customer', '22222222-2222-2222-2222-222222222201'),
  ('11111111-1111-1111-1111-111111111301', '+972500000004', 'customer', '22222222-2222-2222-2222-222222222202'),
  ('11111111-1111-1111-1111-111111111401', '+972500000005', 'customer', '22222222-2222-2222-2222-222222222203');
