-- Address Supabase performance-advisor findings: index every FK used for joins/lookups,
-- and avoid re-evaluating auth.uid() per row in the one policy that calls it directly
-- (fn_is_admin()/fn_current_customer_id() are called from other policies instead of
-- auth.uid() directly, so this pattern doesn't need repeating there).

create index app_users_customer_id_idx on app_users (customer_id);
create index customer_contacts_customer_id_idx on customer_contacts (customer_id);
create index customer_prices_product_id_idx on customer_prices (product_id);
create index documents_order_id_idx on documents (order_id);
create index order_lines_order_id_idx on order_lines (order_id);
create index order_lines_product_id_idx on order_lines (product_id);
create index orders_created_by_idx on orders (created_by);
create index orders_recurring_id_idx on orders (recurring_id);
create index products_category_id_idx on products (category_id);
create index recurring_order_lines_product_id_idx on recurring_order_lines (product_id);
create index recurring_order_lines_recurring_id_idx on recurring_order_lines (recurring_id);
create index recurring_orders_created_by_idx on recurring_orders (created_by);
create index recurring_orders_customer_id_idx on recurring_orders (customer_id);

drop policy app_users_select_own on app_users;
create policy app_users_select_own on app_users
  for select to authenticated using (user_id = (select auth.uid()));
