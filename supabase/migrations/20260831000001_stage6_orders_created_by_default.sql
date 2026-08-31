-- שלב 6 (QA): orders.created_by נשאר NULL בפועל בזרימת ההזמנה הרגילה של לקוח —
-- יצירת הטיוטה (getOrCreateCartOrderId) לא קבעה אותו, ו-rpc_confirm_order לא השלים
-- אותו בדיעבד. זה סותר PRD §2.9 ("כל הזמנה נרשמת עם created_by... אפשר תמיד לדעת
-- בדיעבד איזה איש קשר בדיוק ביצע הזמנה נתונה"). ברירת מחדל ברמת ה-DB, במקום לסמוך על
-- כל נקודת כתיבה שתזכיר להעביר את הערך, תואמת את העיקרון "אכיפה בשרת" (כלל ברזל 3) —
-- מסלול היצירה בשם לקוח מהניהול (useAdminCreateOrder) וממימוש קבועה
-- (rpc_materialize_recurring_occurrence) כבר מעבירים created_by מפורש ולא מושפעים.
alter table orders alter column created_by set default auth.uid();
