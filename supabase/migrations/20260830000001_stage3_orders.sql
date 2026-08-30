-- Stage 3: order lifecycle on the DB (PRD §2.2-2.3, §3, §9). See docs/WORK_PLAN.md stage 3.

-- A draft order is created as soon as the customer adds the first product to the cart,
-- well before a delivery date is picked (PRD §2.3: "אם אין לה תאריך מצורף עדיין... אין לה
-- תפוגה" — the normal case). §9's literal `delivery_date not null` sketch doesn't leave
-- room for that; loosen it here, but keep every non-draft order date-bearing.
alter table orders alter column delivery_date drop not null;
alter table orders add constraint orders_delivery_date_required_unless_draft
  check (status = 'draft' or delivery_date is not null);

-- One open (unattached-to-a-date) cart per customer. Without this, a double-tap on the
-- first "add to cart" or two open tabs could create two null-date drafts — and per
-- decision 15 a draft with no delivery_date never expires, so a duplicate would sit in
-- the DB forever with no principled way for the app to pick "the" cart. This also lets
-- the get-or-create-cart mutation be a single atomic `insert ... on conflict ... do
-- nothing`, not a check-then-insert race.
create unique index orders_one_open_cart_per_customer
  on orders (customer_id)
  where status = 'draft' and delivery_date is null;

-- A product appears at most once per order — the qty stepper upserts by product.
alter table order_lines add constraint order_lines_order_product_unique unique (order_id, product_id);

-- rpc_confirm_order: the sole path from draft -> approved. Does its own authorization
-- (not just relying on the security-definer bypass) because it needs to read across
-- customers/products/customer_prices regardless of the caller's own RLS visibility.
create or replace function rpc_confirm_order(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order       orders%rowtype;
  v_customer    customers%rowtype;
  v_is_admin    boolean := fn_is_admin();
  v_unavailable text;
  v_result      orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id;
  if not found then
    raise exception 'הזמנה לא נמצאה';
  end if;

  if not v_is_admin and v_order.customer_id <> fn_current_customer_id() then
    raise exception 'אין הרשאה להזמנה זו';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'ההזמנה כבר אינה טיוטה';
  end if;

  if not exists (select 1 from order_lines where order_id = p_order_id) then
    raise exception 'לא ניתן לאשר הזמנה ריקה';
  end if;

  -- Belt-and-suspenders: the customer path below already implies this via the cutoff
  -- check, but an admin-initiated confirm has no other gate before the final update,
  -- which would otherwise hit orders_delivery_date_required_unless_draft with an opaque
  -- constraint-violation error instead of a clear one.
  if v_order.delivery_date is null then
    raise exception 'לא נבחר תאריך אספקה';
  end if;

  select * into v_customer from customers where id = v_order.customer_id;

  -- Cutoff/blocked/round-permission gate the customer's own confirmation only (PRD
  -- §2.2: "לא משפיע... על צד הניהול") — admin can act at any time up to completed via
  -- the existing RLS admin policies, and doesn't create orders through this RPC at all.
  if not v_is_admin then
    if v_customer.blocked then
      raise exception 'הלקוח חסום — לא ניתן לאשר הזמנות חדשות';
    end if;
    if not (v_order.round = any(v_customer.allowed_rounds)) then
      raise exception 'הלקוח לא מורשה לסבב זה';
    end if;
    if v_order.delivery_date is null
       or fn_cutoff_at(v_order.delivery_date) is null
       or now() >= fn_cutoff_at(v_order.delivery_date) then
      raise exception 'מועד הסגירה להזמנות ליום זה כבר חלף';
    end if;
  end if;

  -- Availability check across every line — reject the whole confirm (don't silently
  -- drop lines) so the customer sees exactly what changed and can fix it themselves.
  select string_agg(p.name, ', ') into v_unavailable
  from order_lines ol
  join products p on p.id = ol.product_id
  where ol.order_id = p_order_id
    and (p.deleted_at is not null or not p.available);
  if v_unavailable is not null then
    raise exception 'המוצרים הבאים כבר לא זמינים: %', v_unavailable;
  end if;

  -- Authoritative price snapshot: recompute every line from the current catalog +
  -- customer price list now, overwriting whatever the client wrote while the row was
  -- still a freely-editable draft (RLS lets the customer write any unit_price there).
  update order_lines ol
  set product_name = p.name,
      sku          = p.sku,
      unit         = p.unit,
      unit_price   = coalesce(cp.price, p.price)
  from products p
  left join customer_prices cp
    on cp.product_id = p.id and cp.customer_id = v_order.customer_id
  where ol.order_id = p_order_id and ol.product_id = p.id;

  update orders
  set status = 'approved', updated_at = now()
  where id = p_order_id and status = 'draft'
  returning * into v_result;

  if not found then
    raise exception 'ההזמנה כבר אינה טיוטה';
  end if;

  return v_result;
end;
$$;

revoke execute on function rpc_confirm_order(uuid) from public, anon;
grant execute on function rpc_confirm_order(uuid) to authenticated;

-- job_close_completed_orders / job_expire_stale_drafts: trusted maintenance routines,
-- not app-callable. Supabase auto-exposes every new public-schema function to
-- PostgREST (see 20260827000004_harden_functions.sql's comment on this) so both must be
-- revoked explicitly, same as fn_is_admin()/fn_current_customer_id() there — otherwise
-- any authenticated user could POST /rest/v1/rpc/job_... and force-complete or expire
-- orders early. pg_cron (stage 7) runs as postgres and needs no special grant; for now
-- these are invoked directly via SQL during manual testing, per WORK_PLAN's own method.
create or replace function job_close_completed_orders()
returns void
language sql
set search_path = public
as $$
  update orders
  set status = 'completed', updated_at = now()
  where status = 'approved'
    and delivery_date < (now() at time zone 'Asia/Jerusalem')::date;
$$;

create or replace function job_expire_stale_drafts()
returns void
language sql
set search_path = public
as $$
  delete from orders
  where status = 'draft'
    and delivery_date is not null
    and (fn_cutoff_at(delivery_date) is null or now() >= fn_cutoff_at(delivery_date));
$$;

revoke execute on function job_close_completed_orders() from public, anon, authenticated;
revoke execute on function job_expire_stale_drafts() from public, anon, authenticated;
