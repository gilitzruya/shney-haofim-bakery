-- מחלקה של מוצר (PRD החלטה 26): דוח הייצור מודפס בנפרד לכל מחלקה במאפייה — ייצור, עוגות
-- ומאפים, אפוי-קפוא. החלוקה לא תואמת את קטגוריות הקטלוג (למשל "לחמים" מכילה גם אפוי-קפוא),
-- ולכן היא שדה של המוצר. 'none' = מוצר שמגיע מוכן ממקום אחר: לא נכנס לאף דוח ייצור, אבל כן
-- לדף הליקוט (צריך להעמיס אותו).
create type product_department as enum ('production', 'cakes', 'baked_frozen', 'none');

-- default 'production' ממלא את כל השורות הקיימות (כולל מחוקות-רכות) בלי לגעת בשאר העמודות.
alter table products add column department product_department not null default 'production';

-- מילוי ראשוני לפי הקטגוריה — אותו שיוך שבעל המאפייה קיבל בטיוטות (18.11). מה שלא מופיע כאן
-- נשאר 'production'. מוצר בודד מתקנים אחר כך בטופס המוצר.
update products p set department = 'cakes'
  from categories c
  where c.id = p.category_id
    and c.name in ('עוגות בוקר', 'שמרים ובורקסים במשקל', 'עוגות בוקר קפואים', 'קפואים במשקל',
                   'פסי שמרים', 'סופגניה', 'עוגות בחושות');

update products p set department = 'baked_frozen'
  from categories c
  where c.id = p.category_id
    and c.name in ('לחמים', 'פיתות', 'פרנות', 'גפטה', 'פריקסה');

-- חריגים לקטגוריה שלהם.
update products set department = 'production'   where name like 'קובבה%';   -- בקטגוריית גפטה
update products set department = 'baked_frozen' where name like '%רוסטיק%'; -- בקטגוריית בגט

-- מוצרים מוכנים: עוגות גן ולחמי אנגל.
update products p set department = 'none'
  from categories c
  where c.id = p.category_id and c.name = 'עוגות גן';
update products set department = 'none' where name like '%אנגל%';

-- אין שינוי RLS: העמודה בטבלת products הקיימת, הלקוח קורא ורק הניהול כותב — כמו כל עמודה אחרת.
