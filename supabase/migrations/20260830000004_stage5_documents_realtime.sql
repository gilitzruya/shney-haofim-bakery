-- Stage 5: document numbering (for edge_issue_document) + Realtime on orders (admin home feed).

-- מספור מסמכים רץ: מחליף את המונה בזיכרון של המתאם המקומי (`lib/admin/accounting.ts`)
-- ברצף אמיתי ב-DB, כדי שההפקה תעבור לצד השרת (edge_issue_document) בלי לאבד את הרציפות
-- בין קריאות. שלב א׳ עדיין "לא מחובר" לריווחית בפועל (ראו PRD §2.8/WORK_PLAN שלב 5) —
-- זה רק מחליף את מקור המספר, לא מוסיף אינטגרציה חיצונית אמיתית.
create sequence if not exists document_number_seq start 1001;

create or replace function fn_next_document_number(p_type doc_type)
returns text
language sql
set search_path = public
as $$
  select (case when p_type = 'delivery_note' then 'TM-' else 'INV-' end) || nextval('document_number_seq')::text;
$$;

revoke execute on function fn_next_document_number(doc_type) from public, anon;
grant execute on function fn_next_document_number(doc_type) to authenticated;

-- Realtime: פיד "הזמנות שנכנסו היום" בדף הבית של הניהול (PRD §4.1/§8.2, החלטה 21) צריך
-- Supabase Realtime על orders במקום polling. ברירת המחדל של Supabase היא לא לפרסם אף
-- טבלה — צריך להוסיף אותה במפורש ל-publication.
alter publication supabase_realtime add table orders;
