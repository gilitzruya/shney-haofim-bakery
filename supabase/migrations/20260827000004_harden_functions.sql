-- Address Supabase security-advisor warnings on the functions added in this stage.

-- Pin search_path on every function (mutable search_path lets a caller-controlled
-- schema shadow an unqualified reference inside the function body).
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function fn_cutoff_at(p_delivery_date date)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_exception cutoff_exceptions%rowtype;
  v_rule      cutoff_rules%rowtype;
begin
  select * into v_exception from cutoff_exceptions where date = p_delivery_date;

  if found then
    if not v_exception.open then
      return null;
    end if;
    if v_exception.cutoff_at is not null then
      return v_exception.cutoff_at;
    end if;
  end if;

  select * into v_rule from cutoff_rules where weekday = extract(dow from p_delivery_date);

  if not found or not v_rule.enabled then
    return null;
  end if;

  return ((p_delivery_date - v_rule.offset_days)::timestamp + v_rule.cutoff_time)
    at time zone 'Asia/Jerusalem';
end;
$$;

-- fn_is_admin()/fn_current_customer_id() only need to be called by a signed-in user
-- about themselves — there's no legitimate reason for the anon role to call them.
-- Supabase grants EXECUTE on new public-schema functions to anon/authenticated
-- directly (not just via the PUBLIC pseudo-role) via its default privileges, so both
-- must be revoked explicitly — revoking from PUBLIC alone leaves anon's direct grant in place.
revoke execute on function fn_is_admin() from public, anon;
revoke execute on function fn_current_customer_id() from public, anon;
grant execute on function fn_is_admin() to authenticated;
grant execute on function fn_current_customer_id() to authenticated;
