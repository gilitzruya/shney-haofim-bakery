-- fn_cutoff_at: the cutoff moment for a given delivery date (PRD §2.2, §9).
-- Resolution order: date-specific exception, then the weekly rule for that weekday.
-- Returns NULL when the date is closed (no delivery that day) — callers treat NULL as
-- "not orderable", not as "already passed".
create or replace function fn_cutoff_at(p_delivery_date date)
returns timestamptz
language plpgsql
stable
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
    -- open override with no custom time: fall through to the weekly rule below.
  end if;

  select * into v_rule from cutoff_rules where weekday = extract(dow from p_delivery_date);

  if not found or not v_rule.enabled then
    -- an "open" exception with no matching/enabled weekly rule has no timing to fall
    -- back to; treat as closed rather than guessing a cutoff.
    return null;
  end if;

  return ((p_delivery_date - v_rule.offset_days)::timestamp + v_rule.cutoff_time)
    at time zone 'Asia/Jerusalem';
end;
$$;

-- RLS helpers: look up the calling user's app_users row. security definer so the
-- lookup itself isn't blocked by app_users' own RLS (which only lets a user read
-- their own row).
create or replace function fn_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_users where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function fn_current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id from app_users where user_id = auth.uid() and role = 'customer';
$$;
