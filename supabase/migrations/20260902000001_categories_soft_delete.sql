-- קטגוריה שהיה בה אי פעם מוצר (גם אם נמחק - soft delete) לא ניתנת למחיקה עם DELETE
-- אמיתי, כי products.category_id עדיין מצביע עליה (FK) - שורות מוצר מחוקות נשמרות
-- בכוונה כדי ש-order_lines של הזמנות עבר ימשיכו להציג אותן נכון. לכן קטגוריות מקבלות
-- אותו דפוס soft-delete כמו מוצרים, במקום DELETE - ראה useRemoveCategory.
alter table categories add column deleted_at timestamptz;
