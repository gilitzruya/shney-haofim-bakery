-- Stage 1's app_users_select_own policy only ever let a user read their own row — no
-- admin exception was added, unlike every other admin-managed table (comment there says
-- "nothing else", written before stage 3 needed the admin UI to read other users' rows
-- to derive "does this contact have app access" from app_users.phone). Without this,
-- src/hooks/use-customers.ts's fetchAccessPhones() silently returns nothing for an
-- admin caller and every contact shows as "no access" regardless of the real state.
drop policy app_users_select_own on app_users;
create policy app_users_select on app_users
  for select to authenticated
  using (user_id = auth.uid() or fn_is_admin());
