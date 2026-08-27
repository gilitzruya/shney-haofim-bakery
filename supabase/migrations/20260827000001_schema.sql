-- Stage 0 schema: enums, tables, indexes. See docs/PRD.md §9 for the spec this mirrors.

-- enums
create type unit_type        as enum ('unit', 'kg');
create type round_id         as enum ('morning', 'noon');
create type order_status     as enum ('draft', 'approved', 'completed', 'cancelled');
create type recurring_status as enum ('active', 'paused', 'cancelled');
create type order_source     as enum ('manual', 'recurring', 'admin');
create type doc_type         as enum ('delivery_note', 'invoice');
create type doc_status       as enum ('pending', 'issued', 'error');
create type app_role         as enum ('customer', 'admin');

-- bakery settings (single row): contact details, opening hours.
-- VAT is never a config flag here — prices are always pre-VAT (decision 7); VAT is
-- computed only at document-issuance time.
create table bakery_settings (
  id            int primary key default 1 check (id = 1),
  name          text not null,
  phone         text,
  whatsapp      text,
  email         text,
  address       text,
  opening_hours jsonb
);

-- catalog
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  position   int  not null,
  created_at timestamptz not null default now()
);

create table products (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid not null references categories(id),
  name               text not null,
  sku                text,
  unit               unit_type not null default 'unit',
  price              numeric(10,2) not null check (price > 0),
  min_qty            numeric(10,2) not null default 1,
  step               numeric(10,2) not null default 1,
  quick_add          numeric(10,2) not null default 5,
  available          boolean not null default true,
  unavailable_reason text,
  weight_grams       int,
  note               text,
  image_path         text,
  position           int not null default 0,
  deleted_at         timestamptz
);

-- customers
create table customers (
  id             uuid primary key default gen_random_uuid(),
  code           text unique,
  name           text not null,
  address        text,
  delivery_notes text,
  business_id    text,
  allowed_rounds round_id[] not null default '{morning}',
  blocked        boolean not null default false,
  created_at     timestamptz not null default now()
);
-- Only admin writes to this table (RLS) — the customer reads only, never self-edits (decision 17).

create table customer_contacts (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name        text,
  phone       text,
  email       text,
  is_primary  boolean not null default true
);

-- login authorization: phone -> role, checked right after OTP verification.
-- customer_id is a plain FK, not unique — several rows (several contacts) can point
-- to the same customer, each with its own phone, so multiple people can log in and
-- order independently on behalf of the same business (decision 20).
create table app_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  phone       text not null unique,
  role        app_role not null default 'customer',
  customer_id uuid references customers(id)
);
-- 'customer' rows are created through the "new customer"/customer-card admin flow —
-- each contact flagged "has app access" gets its own row and its own invite message.
-- 'admin' rows are added by hand via the Supabase Table Editor (decision 19) — no
-- dedicated screen in the product.

-- per-customer special pricing
create table customer_prices (
  customer_id uuid not null references customers(id) on delete cascade,
  product_id  uuid not null references products(id),
  price       numeric(10,2) not null check (price > 0),
  primary key (customer_id, product_id)
);

-- recurring orders (one entity — customer-created and admin-created-on-behalf-of alike,
-- decision 4/17). Declared before `orders` since orders.recurring_id references it.
create table recurring_orders (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  name        text not null,
  weekdays    int[] not null,
  round       round_id not null,
  status      recurring_status not null default 'active',
  start_date  date,
  note        text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
-- "one active recurring order per customer+weekday+round" is enforced by a trigger
-- added in stage 4, once the materialization engine lands.
-- There is no recurring_overrides table — a single-day change is made by editing the
-- real materialized `orders` row directly (decision 5), not via a separate exceptions layer.

create table recurring_order_lines (
  id           uuid primary key default gen_random_uuid(),
  recurring_id uuid not null references recurring_orders(id) on delete cascade,
  product_id   uuid not null references products(id),
  qty          numeric(10,2) not null check (qty > 0)
);

-- orders
create table orders (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers(id),
  delivery_date date not null,
  round         round_id not null,
  status        order_status not null default 'draft',
  note          text,
  source        order_source not null default 'manual',
  recurring_id  uuid references recurring_orders(id),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- No uniqueness constraint on (customer_id, delivery_date, round) — multiple orders for
-- the same date+round are explicitly allowed (decision 2).

create index orders_delivery_date_round_idx on orders (delivery_date, round);
create index orders_customer_id_delivery_date_idx on orders (customer_id, delivery_date desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on orders
  for each row
  execute function set_updated_at();

create table order_lines (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid not null references products(id),
  product_name text not null,
  sku          text,
  unit         unit_type not null,
  qty          numeric(10,2) not null check (qty > 0),
  unit_price   numeric(10,2) not null
);

-- cutoff rules
create table cutoff_rules (
  weekday     int primary key check (weekday between 0 and 6),
  enabled     boolean not null default true,
  offset_days int not null default 1 check (offset_days between 0 and 14),
  cutoff_time time not null default '12:00'
);

create table cutoff_exceptions (
  date      date primary key,
  label     text not null default '',
  open      boolean not null default false,
  cutoff_at timestamptz
);

-- documents
create table documents (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id),
  type        doc_type not null default 'delivery_note',
  status      doc_status not null default 'pending',
  number      text,
  external_id text,
  error       text,
  created_at  timestamptz not null default now()
);
