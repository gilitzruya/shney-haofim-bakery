# CLAUDE.md — הנחיות עבודה בפרויקט

## מה זה הפרויקט
מערכת הזמנות סיטונאית של **מאפיית שני האופים** — אפליקציית web בעברית (RTL, mobile-first, PWA)
בשני צדדים: לקוחות עסקיים מזמינים מוצרים, ובעל המאפייה מנהל הזמנות ודוחות תחת `/admin`.

## מצב הפרויקט — לקרוא לפני כל שינוי
הקוד הקיים הוא **אב-טיפוס מ-Lovable** (mock data + localStorage) שנמצא כעת בתהליך בנייה מחדש.
**אין להתייחס אליו כמקור אמת לכללים עסקיים** — הוא מכיל באגים וזרימות שכבר הוחלט לשנות.

- **[docs/PRD.md](docs/PRD.md)** — המפרט המחייב: מסכים, כללים עסקיים, מודל נתונים, ו-21 החלטות סופיות.
- **[docs/WORK_PLAN.md](docs/WORK_PLAN.md)** — תוכנית הביצוע: שלבים 0-7 + בדיקות אימות לכל שלב.

לפני עבודה על נושא — לקרוא את הסעיף הרלוונטי ב-PRD. אם משהו סותר, ה-PRD גובר על הקוד.
כששינוי החלטה מתקבל בשיחה — לעדכן את שני המסמכים באותו רגע כדי שלא יתפצלו.

## פקודות
מנהל החבילות הוא **bun** (יש `bun.lock`).

```bash
bun install          # התקנת תלויות
bun run dev          # הרצת סביבת פיתוח (Vite)
bun run build        # בניית production
bun run lint         # ESLint
bun run format       # Prettier
supabase start       # סטאק Supabase מקומי (דורש Docker) — משלב 0 והלאה
supabase db reset    # איפוס DB מקומי + הרצת כל המיגרציות מחדש
```
אין כרגע framework לבדיקות אוטומטיות. אימות נעשה לפי ה-checklist ב-WORK_PLAN.

## מבנה הקוד
```
src/routes/          # מסלולים (file-based, TanStack Router). routeTree.gen.ts מיוצר אוטומטית — לא לערוך!
src/components/app/  # רכיבי UI משותפים לצד הלקוח (Button, Card, Modal, ProductCard…)
src/components/admin/# רכיבי UI לצד הניהול
src/components/ui/   # shadcn/ui גולמי — לרוב עדיף להשתמש ברכיבי app/admin שמעליו
src/lib/             # לוגיקה טהורה (פורמט, cutoff, תמחור, דוחות)
src/store/           # app-store.tsx — ה-store הישן. נמחק בהדרגה, אין לבנות עליו חדש.
src/data/            # נתוני דמו (catalog/seed/admin-seed). כולם נמחקים — גם הקטלוג הוא דמה.
docs/                # PRD.md + WORK_PLAN.md
```
alias: `@/` → `src/`

## כללי ברזל
1. **שכבת התצוגה נשמרת.** העיצוב הוויזואלי של כל מסך חייב להישאר זהה. משתמשים מחדש ברכיבים
   הקיימים ב-`components/app` ו-`components/admin` — לא כותבים UI מאפס ולא "משפרים" עיצוב ביוזמה.
2. **שכבת הנתונים מוחלפת.** `app-store.tsx`, `data/seed*`, ו-localStorage הולכים להימחק.
   קוד חדש ניגש לנתונים דרך Supabase + TanStack Query, לא דרך ה-store.
3. **אכיפה בשרת, לא רק ב-UI.** כל כלל קריטי (שעת סגירה, נעילת הזמנה מאושרת, חסימת לקוח,
   הרשאות סבב, הפרדת לקוח/אדמין) נאכף ב-RLS או ב-RPC. הסתרת כפתור אינה אבטחה.
4. **`service_role` לעולם לא בצד הלקוח.** רק המפתח הציבורי נכנס ל-bundle של הדפדפן.
5. **לא משאירים קוד מת.** כל שלב מוחק את מה שהוא מחליף. אין "נשאיר ליתר ביטחון".
6. **מחירים הם תמיד לפני מע"מ** בכל המערכת; מע"מ מתווסף רק במסמך הסופי.

## מוסכמות קוד
- **TypeScript מחמיר במיוחד** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
  `noPropertyAccessFromIndexSignature`. לכן שדה אופציונלי נכתב `foo?: string | undefined`,
  וגישה למערך/אינדקס מחזירה `T | undefined` וצריכה בדיקה. לא לעקוף עם `as` או `!`.
- **כל טקסט למשתמש בעברית.** אין מחרוזות באנגלית ב-UI. הערות קוד — בהתאם לסביבה בקובץ.
- **RTL בכל מקום** — להשתמש ב-`start/end` (לא `left/right`) ב-Tailwind.
- **טוקני עיצוב בלבד** — `bg-canvas`, `text-heading`, `bg-primary-soft`, `text-muted-foreground`
  וכו'. לא לכתוב צבעים גולמיים (`#hex`, `bg-gray-200`).
- אייקונים: `lucide-react`. הודעות למשתמש: `sonner` (toast).
- קוד חדש נכתב בסגנון הקבצים שסביבו — אותה צפיפות הערות, אותם שמות, אותם דפוסים.

## git
הפרויקט **נותק לחלוטין מ-Lovable**. התיקייה המקומית הזו היא עותק העבודה היחיד.
ה-`origin` מצביע על המאגר החדש: `github.com/gilitzruya/shney-haofim-bakery`.
לא לבצע commit או push אלא אם התבקשת מפורשות.

**שאריות Lovable שעדיין בקוד** (מטופלות בשלב 0 — ראו WORK_PLAN): הבנייה עדיין תלויה בחבילה
`@lovable.dev/vite-tanstack-config`, שגם קובעת את יעד ה-nitro ל-cloudflare במקום Vercel.
בנוסף: `src/lib/lovable-error-reporting.ts`, `AGENTS.md`, `.lovable/`, ו-README ישן.
