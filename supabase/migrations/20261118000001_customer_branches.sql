-- סניפים של לקוח (PRD החלטה 25): לקוח אחד בריווחית (קוד, מחירים, חסימה ואנשי קשר משותפים)
-- שאותו איש קשר מזמין עבור כמה סניפים. לפני האפליקציה בעל המאפייה הפיק תעודה על שם אותו
-- לקוח ורשם עליה את הסניף — כאן ההזמנה (והזמנה קבועה) מקבלת סניף, והוא נכנס להערות התעודה.
-- לקוח בלי סניפים פעילים לא מושפע בכלל: branch_id נשאר null וכל הבדיקות מדולגות.

create table customer_branches (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references customers(id) on delete cascade,
  name           text not null check (btrim(name) <> ''),
  address        text,
  delivery_notes text,
  -- הסרה מהכרטיס = השבתה, לא מחיקה: הזמנות היסטוריות שומרות על השיוך, והסניף רק נעלם מהבחירה.
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  -- יעד ל-FK המורכב מ-orders/recurring_orders — כך השרת אוכף שהסניף שייך ללקוח של ההזמנה.
  unique (id, customer_id)
);

create index customer_branches_customer_id_idx on customer_branches (customer_id);

-- RLS: אותה צורה כמו customer_contacts — הלקוח קורא רק את שלו, רק הניהול כותב (החלטה 17).
alter table customer_branches enable row level security;

create policy customer_branches_select_own on customer_branches
  for select to authenticated
  using (customer_id = fn_current_customer_id() or fn_is_admin());
create policy customer_branches_admin_write on customer_branches
  for insert to authenticated with check (fn_is_admin());
create policy customer_branches_admin_update on customer_branches
  for update to authenticated using (fn_is_admin()) with check (fn_is_admin());
create policy customer_branches_admin_delete on customer_branches
  for delete to authenticated using (fn_is_admin());

-- הוספת עמודה nullable לא נוגעת בשורות קיימות — updated_at של הזמנות לא משתנה, ולכן אף תעודה
-- שכבר הופקה לא תסומן "השתנתה מאז ההפקה".
alter table orders add column branch_id uuid;
alter table orders add constraint orders_branch_fk
  foreign key (branch_id, customer_id) references customer_branches (id, customer_id);
create index orders_branch_id_idx on orders (branch_id) where branch_id is not null;

alter table recurring_orders add column branch_id uuid;
alter table recurring_orders add constraint recurring_orders_branch_fk
  foreign key (branch_id, customer_id) references customer_branches (id, customer_id);
create index recurring_orders_branch_id_idx on recurring_orders (branch_id) where branch_id is not null;

-- "סניף חובה" ללקוח שיש לו סניף פעיל. נבדק רק במעבר לסטטוס שנשלח (insert שאינו טיוטה — יצירה
-- מהניהול; או draft → approved דרך rpc_confirm_order), ובניקוי סניף מהזמנה שנשלחה. בכוונה לא
-- בכל עדכון: הזמנות שקדמו לסניפים חייבות להמשיך לעבור approved → completed ב-job בלי סניף.
-- הזמנה שמומשה מהזמנה קבועה (recurring_id) פטורה — את הסניף שלה אוכפים על התבנית, וכך הזמנה
-- קבועה ישנה בלי סניף לא מפילה את job_close_upcoming_recurring.
create or replace function fn_check_order_branch()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_transition boolean;
begin
  v_transition :=
    new.status in ('approved', 'completed')
    and (tg_op = 'INSERT' or old.status = 'draft' or old.branch_id is not null);

  if not v_transition or new.recurring_id is not null then
    return new;
  end if;

  if new.branch_id is null then
    if exists (select 1 from customer_branches where customer_id = new.customer_id and active) then
      raise exception 'יש לבחור סניף';
    end if;
  elsif tg_op = 'INSERT' or old.status = 'draft' then
    if not exists (select 1 from customer_branches where id = new.branch_id and active) then
      raise exception 'הסניף שנבחר אינו פעיל — יש לבחור סניף אחר';
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_branch_required
  before insert or update of status, branch_id on orders
  for each row
  execute function fn_check_order_branch();

-- אותו כלל על התבנית: הזמנה קבועה פעילה חדשה, או ניקוי הסניף מתבנית קיימת. עדכון אחר (השהיה,
-- שינוי שם) של תבנית ישנה בלי סניף לא נחסם — בעל המאפייה רואה אותה מסומנת "ללא סניף" בכרטיס.
create or replace function fn_check_recurring_branch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.branch_id is null
     and new.status = 'active'
     and (tg_op = 'INSERT' or old.branch_id is not null)
     and exists (select 1 from customer_branches where customer_id = new.customer_id and active) then
    raise exception 'יש לבחור סניף';
  end if;
  if new.branch_id is not null
     and (tg_op = 'INSERT' or new.branch_id is distinct from old.branch_id)
     and not exists (select 1 from customer_branches where id = new.branch_id and active) then
    raise exception 'הסניף שנבחר אינו פעיל — יש לבחור סניף אחר';
  end if;
  return new;
end;
$$;

create trigger recurring_orders_branch_required
  before insert or update of status, branch_id on recurring_orders
  for each row
  execute function fn_check_recurring_branch();

-- ייחודיות הזמנה קבועה: אחת פעילה ללקוח+סניף+יום+סבב (במקום ללקוח+יום+סבב) — אחרת אי אפשר
-- לקבוע "ראשון בוקר" לשני סניפים של אותו לקוח.
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
      and branch_id is not distinct from new.branch_id
      and round = new.round
      and status = 'active'
      and weekdays && new.weekdays
  ) then
    raise exception 'קיימת כבר הזמנה קבועה פעילה לאותו לקוח, סניף, יום וסבב';
  end if;
  return new;
end;
$$;

-- fn_recurring_occurrences: מוסיף branch_id לפלט. טיפוס ההחזרה משתנה, ולכן drop ולא replace.
-- שאר ההגדרה זהה ל-20260830000003_stage4_recurring.sql (SECURITY INVOKER, נשען על RLS של הקורא).
drop function fn_recurring_occurrences(date);

create function fn_recurring_occurrences(p_date date)
returns table (
  recurring_id uuid,
  customer_id  uuid,
  branch_id    uuid,
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
    ro.id, ro.customer_id, ro.branch_id, ro.name, ro.round, ro.note, ro.created_by, ro.created_at,
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

-- מימוש הזמנה קבועה מעתיק גם את הסניף של התבנית. שאר הגוף זהה ל-20260830000003.
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

  insert into orders (customer_id, branch_id, delivery_date, round, status, note, source, recurring_id, created_by)
  values (v_rec.customer_id, v_rec.branch_id, p_date, v_rec.round, v_status, v_note, 'recurring', v_rec.id, v_rec.created_by)
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

revoke execute on function fn_materialize_recurring_occurrence_internal(uuid, date, jsonb) from public, anon, authenticated;

-- פונקציות הטריגר אינן RPC — שוללים את ההרשאה האוטומטית של Supabase כמו בשאר הקוד.
revoke execute on function fn_check_order_branch() from public, anon, authenticated;
revoke execute on function fn_check_recurring_branch() from public, anon, authenticated;
