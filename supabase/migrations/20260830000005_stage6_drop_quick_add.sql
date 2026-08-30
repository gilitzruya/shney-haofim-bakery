-- שלב 6: הסרת quick_add — שדה "הוספה מהירה" ששרד מהאב-טיפוס אך מעולם לא חובר לשום UI
-- בצד הלקוח (כפתורי הכמות תמיד השתמשו ב-step הרגיל), ואינו מוזכר ב-PRD.
alter table products drop column quick_add;
