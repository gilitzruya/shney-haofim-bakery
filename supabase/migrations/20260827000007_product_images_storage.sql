-- Stage 2 (WORK_PLAN): product photos move from data-URLs in localStorage to a real
-- Storage bucket. Public bucket (decision: product photos aren't sensitive data) — reads
-- bypass RLS entirely via the public URL, so the select policy below is only for
-- consistency/dashboard listing, not what actually gates read access. Writes are
-- admin-only, same fn_is_admin() gate used for categories/products (see
-- 20260827000003_rls.sql).

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy product_images_select on storage.objects
  for select to public using (bucket_id = 'product-images');

create policy product_images_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and fn_is_admin());

create policy product_images_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and fn_is_admin())
  with check (bucket_id = 'product-images' and fn_is_admin());

create policy product_images_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and fn_is_admin());
