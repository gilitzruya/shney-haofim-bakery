-- Address Supabase performance-advisor "multiple_permissive_policies" findings: every
-- case below has two+ permissive policies applying to the same table/role/action, which
-- Postgres must evaluate and OR together per query. Two distinct causes produced this:
--   1. Separate customer/admin policies for the same single action (orders, and the
--      *_write pairs below) — merged here into one policy per action with OR.
--   2. A `for all` admin policy that (by definition) also covers SELECT, redundantly
--      stacking on top of a table's own dedicated `_select` policy — split into
--      per-action (insert/update/delete) policies so it no longer touches SELECT.
-- No access is widened or narrowed; every merged/split condition is the same boolean
-- expression Postgres was already ORing across the two prior policies.

-- bakery_settings / categories / products / cutoff_rules / cutoff_exceptions: the
-- existing `_select` policy (using true) already covers admin implicitly, so the admin
-- `for all` policy's own SELECT-applicability was pure redundancy. Split it into
-- insert/update/delete only; the `_select` policy is untouched.
drop policy bakery_settings_admin_write on bakery_settings;
create policy bakery_settings_admin_insert on bakery_settings
  for insert to authenticated with check (fn_is_admin());
create policy bakery_settings_admin_update on bakery_settings
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy bakery_settings_admin_delete on bakery_settings
  for delete to authenticated using (fn_is_admin());

drop policy categories_admin_write on categories;
create policy categories_admin_insert on categories
  for insert to authenticated with check (fn_is_admin());
create policy categories_admin_update on categories
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy categories_admin_delete on categories
  for delete to authenticated using (fn_is_admin());

drop policy products_admin_write on products;
create policy products_admin_insert on products
  for insert to authenticated with check (fn_is_admin());
create policy products_admin_update on products
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy products_admin_delete on products
  for delete to authenticated using (fn_is_admin());

drop policy cutoff_rules_admin_write on cutoff_rules;
create policy cutoff_rules_admin_insert on cutoff_rules
  for insert to authenticated with check (fn_is_admin());
create policy cutoff_rules_admin_update on cutoff_rules
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy cutoff_rules_admin_delete on cutoff_rules
  for delete to authenticated using (fn_is_admin());

drop policy cutoff_exceptions_admin_write on cutoff_exceptions;
create policy cutoff_exceptions_admin_insert on cutoff_exceptions
  for insert to authenticated with check (fn_is_admin());
create policy cutoff_exceptions_admin_update on cutoff_exceptions
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy cutoff_exceptions_admin_delete on cutoff_exceptions
  for delete to authenticated using (fn_is_admin());

-- orders: genuine customer/admin pair for each of insert/update/delete (select was
-- already a single merged policy). Merge using/with check per action with OR.
drop policy orders_customer_insert on orders;
drop policy orders_admin_insert on orders;
create policy orders_insert on orders
  for insert to authenticated
  with check (
    (customer_id = fn_current_customer_id() and status = 'draft')
    or fn_is_admin()
  );

drop policy orders_customer_update on orders;
drop policy orders_admin_update on orders;
create policy orders_update on orders
  for update to authenticated
  using (
    (customer_id = fn_current_customer_id() and status = 'draft')
    or (fn_is_admin() and status <> 'completed')
  )
  with check (
    (customer_id = fn_current_customer_id() and status = 'draft')
    or fn_is_admin()
  );

drop policy orders_customer_delete on orders;
drop policy orders_admin_delete on orders;
create policy orders_delete on orders
  for delete to authenticated
  using (
    (customer_id = fn_current_customer_id() and status = 'draft')
    or (fn_is_admin() and status <> 'completed')
  );

-- order_lines: customer_write/admin_write were both `for all`, which also redundantly
-- stacked SELECT on top of order_lines_select (whose own condition — own order any
-- status, or admin any status — already dominates both of these narrower cases).
-- Split into insert/update/delete only, merged per action with OR; select is untouched.
drop policy order_lines_customer_write on order_lines;
drop policy order_lines_admin_write on order_lines;

create policy order_lines_insert on order_lines
  for insert to authenticated
  with check (
    exists (
      select 1 from orders o where o.id = order_id
        and o.customer_id = fn_current_customer_id() and o.status = 'draft'
    )
    or fn_is_admin()
  );

create policy order_lines_update on order_lines
  for update to authenticated
  using (
    exists (
      select 1 from orders o where o.id = order_id
        and o.customer_id = fn_current_customer_id() and o.status = 'draft'
    )
    or (fn_is_admin() and exists (
      select 1 from orders o where o.id = order_id and o.status <> 'completed'
    ))
  )
  with check (
    exists (
      select 1 from orders o where o.id = order_id
        and o.customer_id = fn_current_customer_id() and o.status = 'draft'
    )
    or fn_is_admin()
  );

create policy order_lines_delete on order_lines
  for delete to authenticated
  using (
    exists (
      select 1 from orders o where o.id = order_id
        and o.customer_id = fn_current_customer_id() and o.status = 'draft'
    )
    or (fn_is_admin() and exists (
      select 1 from orders o where o.id = order_id and o.status <> 'completed'
    ))
  );

-- recurring_orders: same `for all` overlap-with-select issue as order_lines above.
-- Split into insert/update/delete only, merged per action; select is untouched.
drop policy recurring_orders_customer_write on recurring_orders;
drop policy recurring_orders_admin_write on recurring_orders;

create policy recurring_orders_insert on recurring_orders
  for insert to authenticated
  with check (customer_id = fn_current_customer_id() or fn_is_admin());

create policy recurring_orders_update on recurring_orders
  for update to authenticated
  using (customer_id = fn_current_customer_id() or fn_is_admin())
  with check (customer_id = fn_current_customer_id() or fn_is_admin());

create policy recurring_orders_delete on recurring_orders
  for delete to authenticated
  using (customer_id = fn_current_customer_id() or fn_is_admin());

-- recurring_order_lines: same shape as recurring_orders.
drop policy recurring_order_lines_customer_write on recurring_order_lines;
drop policy recurring_order_lines_admin_write on recurring_order_lines;

create policy recurring_order_lines_insert on recurring_order_lines
  for insert to authenticated
  with check (
    exists (
      select 1 from recurring_orders r where r.id = recurring_id
        and r.customer_id = fn_current_customer_id()
    )
    or fn_is_admin()
  );

create policy recurring_order_lines_update on recurring_order_lines
  for update to authenticated
  using (
    exists (
      select 1 from recurring_orders r where r.id = recurring_id
        and r.customer_id = fn_current_customer_id()
    )
    or fn_is_admin()
  )
  with check (
    exists (
      select 1 from recurring_orders r where r.id = recurring_id
        and r.customer_id = fn_current_customer_id()
    )
    or fn_is_admin()
  );

create policy recurring_order_lines_delete on recurring_order_lines
  for delete to authenticated
  using (
    exists (
      select 1 from recurring_orders r where r.id = recurring_id
        and r.customer_id = fn_current_customer_id()
    )
    or fn_is_admin()
  );
