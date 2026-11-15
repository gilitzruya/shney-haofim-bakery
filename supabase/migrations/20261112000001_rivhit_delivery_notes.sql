-- תעודות משלוח אמיתיות בריווחית אונליין (PRD §2.8, החלטה 23).
--
-- edge_issue_document קורא עכשיו ל-`Document.New` של ריווחית, ומספר המסמך מגיע מריווחית —
-- מספור הדמו המקומי (`fn_next_document_number` + הרצף שלו) הופך לקוד מת (כלל ברזל 5).
-- `link` שומר את הקישור ל-PDF של התעודה בריווחית, לצפייה מיומן המסמכים ומפירוט ההזמנה.
alter table documents add column link text;

drop function if exists fn_next_document_number(doc_type);
drop sequence if exists document_number_seq;

-- עריכת שורות הזמנה (מחיקה + הכנסה מחדש מהלקוח או מהניהול) לא נגעה עד היום ב-orders, ולכן
-- `orders.updated_at` לא שיקף אותה. התעודה בריווחית נשלחת עם `request_reference` שמבוסס על
-- `updated_at` (מניעת כפילויות), ובניהול מוצג "ההזמנה השתנתה מאז ההפקה" לפיו — שניהם צריכים
-- שכל שינוי בשורות ייחשב עדכון של ההזמנה. security definer: לקוח שעורך את העגלה שלו לא חייב
-- הרשאת update על orders כדי שהטריגר ירוץ, והטריגר נוגע רק בעמודת updated_at.
create or replace function touch_order_from_lines()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders set updated_at = now()
  where id = coalesce(new.order_id, old.order_id);
  return null;
end;
$$;

revoke execute on function touch_order_from_lines() from public, anon, authenticated;

create trigger order_lines_touch_order
after insert or update or delete on order_lines
for each row execute function touch_order_from_lines();
