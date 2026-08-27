-- RLS (PRD §9, §8.3). Every table is enabled with no policy for anon/unauthenticated,
-- so unauthenticated access reads/writes nothing. Policies below only ever target
-- `authenticated` — customer vs admin is distinguished inside each policy via
-- fn_is_admin()/fn_current_customer_id(), not via separate Postgres roles.

alter table bakery_settings       enable row level security;
alter table categories            enable row level security;
alter table products              enable row level security;
alter table customers             enable row level security;
alter table customer_contacts     enable row level security;
alter table app_users             enable row level security;
alter table customer_prices       enable row level security;
alter table recurring_orders      enable row level security;
alter table recurring_order_lines enable row level security;
alter table orders                enable row level security;
alter table order_lines           enable row level security;
alter table cutoff_rules          enable row level security;
alter table cutoff_exceptions     enable row level security;
alter table documents             enable row level security;

-- bakery_settings: readable by anyone logged in; admin writes.
create policy bakery_settings_select on bakery_settings
  for select to authenticated using (true);
create policy bakery_settings_admin_write on bakery_settings
  for all to authenticated using (fn_is_admin()) with check (fn_is_admin());

-- catalog: readable by anyone logged in; admin writes.
create policy categories_select on categories
  for select to authenticated using (true);
create policy categories_admin_write on categories
  for all to authenticated using (fn_is_admin()) with check (fn_is_admin());

create policy products_select on products
  for select to authenticated using (true);
create policy products_admin_write on products
  for all to authenticated using (fn_is_admin()) with check (fn_is_admin());

-- cutoff config: readable by anyone logged in; admin writes.
create policy cutoff_rules_select on cutoff_rules
  for select to authenticated using (true);
create policy cutoff_rules_admin_write on cutoff_rules
  for all to authenticated using (fn_is_admin()) with check (fn_is_admin());

create policy cutoff_exceptions_select on cutoff_exceptions
  for select to authenticated using (true);
create policy cutoff_exceptions_admin_write on cutoff_exceptions
  for all to authenticated using (fn_is_admin()) with check (fn_is_admin());

-- customers: customer reads only their own row, never writes it (decision 17). Admin: full access.
create policy customers_select_own on customers
  for select to authenticated using (id = fn_current_customer_id() or fn_is_admin());
create policy customers_admin_write on customers
  for insert to authenticated with check (fn_is_admin());
create policy customers_admin_update on customers
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy customers_admin_delete on customers
  for delete to authenticated using (fn_is_admin());

-- customer_contacts: same shape as customers.
create policy customer_contacts_select_own on customer_contacts
  for select to authenticated
  using (customer_id = fn_current_customer_id() or fn_is_admin());
create policy customer_contacts_admin_write on customer_contacts
  for insert to authenticated with check (fn_is_admin());
create policy customer_contacts_admin_update on customer_contacts
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy customer_contacts_admin_delete on customer_contacts
  for delete to authenticated using (fn_is_admin());

-- app_users: a user may see their own row (needed for post-login role/customer_id
-- lookup); nothing else. Rows are written by the admin flow / Table Editor, both of
-- which use the service_role key server-side and so bypass RLS entirely — no INSERT/
-- UPDATE/DELETE policy is needed here.
create policy app_users_select_own on app_users
  for select to authenticated using (user_id = auth.uid());

-- customer_prices: customer reads only their own special prices; admin full access.
create policy customer_prices_select_own on customer_prices
  for select to authenticated
  using (customer_id = fn_current_customer_id() or fn_is_admin());
create policy customer_prices_admin_write on customer_prices
  for insert to authenticated with check (fn_is_admin());
create policy customer_prices_admin_update on customer_prices
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy customer_prices_admin_delete on customer_prices
  for delete to authenticated using (fn_is_admin());

-- orders: customer sees/creates/edits only their own, and only ever their own drafts
-- (decision 1 — approved/completed become fully read-only to the customer, enforced
-- here, not only in the UI). Admin: everything up to completed (decision 9).
create policy orders_select on orders
  for select to authenticated
  using (customer_id = fn_current_customer_id() or fn_is_admin());
create policy orders_customer_insert on orders
  for insert to authenticated
  with check (customer_id = fn_current_customer_id() and status = 'draft');
create policy orders_customer_update on orders
  for update to authenticated
  using (customer_id = fn_current_customer_id() and status = 'draft')
  with check (customer_id = fn_current_customer_id() and status = 'draft');
create policy orders_customer_delete on orders
  for delete to authenticated
  using (customer_id = fn_current_customer_id() and status = 'draft');
create policy orders_admin_insert on orders
  for insert to authenticated with check (fn_is_admin());
create policy orders_admin_update on orders
  for update to authenticated
  using (fn_is_admin() and status <> 'completed')
  with check (fn_is_admin());
create policy orders_admin_delete on orders
  for delete to authenticated using (fn_is_admin() and status <> 'completed');

-- order_lines: visibility/write follow the parent order.
create policy order_lines_select on order_lines
  for select to authenticated
  using (exists (
    select 1 from orders o where o.id = order_id
      and (o.customer_id = fn_current_customer_id() or fn_is_admin())
  ));
create policy order_lines_customer_write on order_lines
  for all to authenticated
  using (exists (
    select 1 from orders o where o.id = order_id
      and o.customer_id = fn_current_customer_id() and o.status = 'draft'
  ))
  with check (exists (
    select 1 from orders o where o.id = order_id
      and o.customer_id = fn_current_customer_id() and o.status = 'draft'
  ));
create policy order_lines_admin_write on order_lines
  for all to authenticated
  using (fn_is_admin() and exists (
    select 1 from orders o where o.id = order_id and o.status <> 'completed'
  ))
  with check (fn_is_admin());

-- recurring_orders: customer manages their own template (pause/resume/cancel/edit —
-- decision 2.4); admin manages all, including on a customer's behalf (decision 4/17).
create policy recurring_orders_select on recurring_orders
  for select to authenticated
  using (customer_id = fn_current_customer_id() or fn_is_admin());
create policy recurring_orders_customer_write on recurring_orders
  for all to authenticated
  using (customer_id = fn_current_customer_id())
  with check (customer_id = fn_current_customer_id());
create policy recurring_orders_admin_write on recurring_orders
  for all to authenticated using (fn_is_admin()) with check (fn_is_admin());

-- recurring_order_lines: visibility/write follow the parent recurring order.
create policy recurring_order_lines_select on recurring_order_lines
  for select to authenticated
  using (exists (
    select 1 from recurring_orders r where r.id = recurring_id
      and (r.customer_id = fn_current_customer_id() or fn_is_admin())
  ));
create policy recurring_order_lines_customer_write on recurring_order_lines
  for all to authenticated
  using (exists (
    select 1 from recurring_orders r where r.id = recurring_id
      and r.customer_id = fn_current_customer_id()
  ))
  with check (exists (
    select 1 from recurring_orders r where r.id = recurring_id
      and r.customer_id = fn_current_customer_id()
  ));
create policy recurring_order_lines_admin_write on recurring_order_lines
  for all to authenticated using (fn_is_admin()) with check (fn_is_admin());

-- documents: admin only — customers never see documents (PRD §9 RLS summary).
create policy documents_admin_only on documents
  for all to authenticated using (fn_is_admin()) with check (fn_is_admin());
