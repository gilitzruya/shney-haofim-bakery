-- Stage 4: recurring orders + materialization engine (PRD §2.4, §9). See docs/WORK_PLAN.md stage 4.

-- Uniqueness: one active recurring order per customer+weekday+round (PRD §2.4). Declared
-- as a trigger rather than a constraint because the check is a set-overlap on `weekdays`
-- (int[] && int[]), not a plain column equality.
create or replace function fn_check_recurring_uniqueness()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'active' and exists (
    select 1 from recurring_orders
    where id <> new.id
      and customer_id = new.customer_id
      and round = new.round
      and status = 'active'
      and weekdays && new.weekdays
  ) then
    raise exception 'קיימת כבר הזמנה קבועה פעילה לאותו לקוח, יום וסבב';
  end if;
  return new;
end;
$$;

create trigger recurring_orders_uniqueness
  before insert or update on recurring_orders
  for each row
  execute function fn_check_recurring_uniqueness();

-- fn_recurring_occurrences: the "virtual" layer (decision 6). One row per product line of
-- every `active` template that falls on p_date (matching weekday + start_date reached) and
-- doesn't have a real materialized order yet. Deliberately SECURITY INVOKER (the default —
-- no clause), not DEFINER: it relies entirely on the caller's own RLS on recurring_orders/
-- recurring_order_lines/customer_prices/orders, so a customer naturally sees only their own
-- and an admin sees everyone's, without re-implementing that check here. unit_price is
-- computed live (customer override else catalog price) and never persisted anywhere —
-- recurring_order_lines intentionally has no price column, see 20260827000001_schema.sql.
create or replace function fn_recurring_occurrences(p_date date)
returns table (
  recurring_id uuid,
  customer_id  uuid,
  name         text,
  round        round_id,
  note         text,
  created_by   uuid,
  created_at   timestamptz,
  product_id   uuid,
  product_name text,
  sku          text,
  unit         unit_type,
  qty          numeric,
  unit_price   numeric
)
language sql
stable
set search_path = public
as $$
  select
    ro.id, ro.customer_id, ro.name, ro.round, ro.note, ro.created_by, ro.created_at,
    p.id, p.name, p.sku, p.unit, rol.qty,
    coalesce(cp.price, p.price) as unit_price
  from recurring_orders ro
  join recurring_order_lines rol on rol.recurring_id = ro.id
  join products p on p.id = rol.product_id
  left join customer_prices cp on cp.customer_id = ro.customer_id and cp.product_id = p.id
  where ro.status = 'active'
    and (ro.start_date is null or ro.start_date <= p_date)
    and extract(dow from p_date)::int = any(ro.weekdays)
    and not exists (
      select 1 from orders o where o.recurring_id = ro.id and o.delivery_date = p_date
    );
$$;

revoke execute on function fn_recurring_occurrences(date) from public, anon;
grant execute on function fn_recurring_occurrences(date) to authenticated;

-- fn_materialize_recurring_occurrence_internal: shared core for the two entry points below.
-- Not granted to any role on purpose — it's only reachable by calling one of the two public
-- wrappers, which run as their SECURITY DEFINER owner (postgres) and so can always call it
-- regardless of grants. Idempotent: if a real order already exists for this
-- recurring_id+date, returns its id instead of erroring (safe against a double-run of the
-- job or a double-click on "edit" in the admin UI).
create or replace function fn_materialize_recurring_occurrence_internal(
  p_recurring_id uuid,
  p_date         date,
  p_patch        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_order_id uuid;
  v_rec      recurring_orders%rowtype;
  v_status   order_status;
  v_note     text;
begin
  select id into v_existing from orders where recurring_id = p_recurring_id and delivery_date = p_date;
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_rec from recurring_orders where id = p_recurring_id;
  if not found then
    raise exception 'הזמנה קבועה לא נמצאה';
  end if;

  v_status := case when coalesce((p_patch->>'cancel')::boolean, false) then 'cancelled' else 'approved' end;
  v_note   := coalesce(p_patch->>'note', v_rec.note);

  insert into orders (customer_id, delivery_date, round, status, note, source, recurring_id, created_by)
  values (v_rec.customer_id, p_date, v_rec.round, v_status, v_note, 'recurring', v_rec.id, v_rec.created_by)
  returning id into v_order_id;

  if v_status = 'approved' then
    if p_patch ? 'lines' then
      -- One-off admin edit: the patch's line list replaces the template's for this date only.
      insert into order_lines (order_id, product_id, product_name, sku, unit, qty, unit_price)
      select v_order_id, p.id, p.name, p.sku, p.unit,
             (line->>'qty')::numeric,
             coalesce(cp.price, p.price)
      from jsonb_array_elements(p_patch->'lines') as line
      join products p on p.id = (line->>'product_id')::uuid
      left join customer_prices cp on cp.customer_id = v_rec.customer_id and cp.product_id = p.id
      where (line->>'qty')::numeric > 0;
    else
      insert into order_lines (order_id, product_id, product_name, sku, unit, qty, unit_price)
      select v_order_id, p.id, p.name, p.sku, p.unit, rol.qty,
             coalesce(cp.price, p.price)
      from recurring_order_lines rol
      join products p on p.id = rol.product_id
      left join customer_prices cp on cp.customer_id = v_rec.customer_id and cp.product_id = p.id
      where rol.recurring_id = v_rec.id;
    end if;
  end if;

  return v_order_id;
end;
$$;

-- Not calling this "unexposed" was wrong — Supabase grants EXECUTE on every new
-- public-schema function to anon/authenticated directly via its default privileges (see
-- 20260827000004_harden_functions.sql's comment), regardless of who it's granted to
-- explicitly. This function has no admin check of its own (it trusts its callers below to
-- have already done that) and is SECURITY DEFINER, so leaving the default grant in place
-- would let anyone materialize or cancel any customer's recurring order directly. Revoke
-- explicitly, same as every other trusted-only function in this codebase.
revoke execute on function fn_materialize_recurring_occurrence_internal(uuid, date, jsonb) from public, anon, authenticated;

-- rpc_materialize_recurring_occurrence: the admin-facing entry point (clicking edit/cancel
-- on a virtual occurrence, or issuing a delivery note for one — PRD §4.1/§4.2/§4.3).
create or replace function rpc_materialize_recurring_occurrence(
  p_recurring_id uuid,
  p_date         date,
  p_patch        jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_is_admin() then
    raise exception 'רק הניהול יכול לממש הזמנה קבועה';
  end if;
  return fn_materialize_recurring_occurrence_internal(p_recurring_id, p_date, p_patch);
end;
$$;

revoke execute on function rpc_materialize_recurring_occurrence(uuid, date, jsonb) from public, anon;
grant execute on function rpc_materialize_recurring_occurrence(uuid, date, jsonb) to authenticated;

-- job_close_upcoming_recurring: the automatic side of decision 6 — as each active
-- template's next occurrences cross their own cutoff, lock them into real orders. Not
-- app-callable, same as the other two jobs in stage 3 (pg_cron wiring is stage 7; invoked
-- directly via SQL for now, per WORK_PLAN's own testing method). The 14-day window matches
-- cutoff_rules.offset_days's max (see 20260827000001_schema.sql) — no occurrence further out
-- than that could possibly have a cutoff in the past yet.
create or replace function job_close_upcoming_recurring()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  d date;
begin
  for r in select * from recurring_orders where status = 'active' loop
    for d in
      select gs::date
      from generate_series(current_date, current_date + 14, interval '1 day') gs
      where extract(dow from gs)::int = any(r.weekdays)
        and (r.start_date is null or r.start_date <= gs::date)
    loop
      if fn_cutoff_at(d) is not null and fn_cutoff_at(d) <= now()
         and not exists (select 1 from orders where recurring_id = r.id and delivery_date = d)
      then
        perform fn_materialize_recurring_occurrence_internal(r.id, d, null);
      end if;
    end loop;
  end loop;
end;
$$;

revoke execute on function job_close_upcoming_recurring() from public, anon, authenticated;
