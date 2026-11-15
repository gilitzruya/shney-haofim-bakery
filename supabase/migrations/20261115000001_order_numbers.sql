-- מספר הזמנה רץ (PRD החלטה 24): 1001, 1002… — מוצג לניהול וללקוח, ונשלח לשדה "הזמנה" בתעודת
-- המשלוח בריווחית. עד היום להזמנה היה רק UUID, ושתי הזמנות של אותו לקוח לאותו יום (החלטה 2)
-- לא היו ניתנות להבחנה במסכים.
--
-- הזמנות קיימות ממוספרות לפי סדר היצירה. identity `generated always`: כל insert (העגלה, אישור,
-- מימוש הזמנה קבועה, יצירה מהניהול) מקבל מספר בלי שינוי בקוד, ואף אחד — גם לא לקוח שמותר לו
-- לעדכן טיוטה — לא יכול לקבוע או לשנות אותו. גם טיוטה מקבלת מספר, ולכן יש פערים במספור של
-- הזמנות שנשלחו (טיוטות שפג תוקפן) — תקין.
alter table orders add column number bigint;

-- המילוי לא נחשב "שינוי בהזמנה": בלי לכבות את הטריגר, `updated_at` של כל ההזמנות היה מתעדכן,
-- וכל הזמנה שכבר הופקה לה תעודה הייתה מסומנת "השתנתה מאז ההפקה".
alter table orders disable trigger orders_set_updated_at;

update orders o
set number = n.number
from (select id, 1000 + row_number() over (order by created_at, id) as number from orders) n
where n.id = o.id;

alter table orders enable trigger orders_set_updated_at;

alter table orders alter column number set not null;
alter table orders add constraint orders_number_key unique (number);

do $$
declare
  next_number bigint := coalesce((select max(number) from orders), 1000) + 1;
begin
  execute format(
    'alter table orders alter column number add generated always as identity (start with %s)',
    next_number
  );
end;
$$;
