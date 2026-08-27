# מאפיית שני האופים — מערכת הזמנות סיטונאית

אפליקציית web בעברית (RTL, mobile-first, PWA) לניהול הזמנות סיטונאיות של מאפיית שני האופים.
לקוחות עסקיים מזמינים מוצרים; בעל המאפייה מנהל הזמנות ודוחות תחת `/admin`.

הפרויקט נבנה מחדש על תשתית Supabase (Postgres + Auth + Storage + Realtime), אחרי ניתוק
מלא מאב-הטיפוס שנוצר ב-Lovable. פירוט מלא של הכללים העסקיים, מודל הנתונים ותוכנית העבודה
נמצא ב-[docs/PRD.md](docs/PRD.md) וב-[docs/WORK_PLAN.md](docs/WORK_PLAN.md).

## פיתוח

מנהל החבילות הוא [bun](https://bun.sh).

```bash
bun install          # התקנת תלויות
bun run dev           # הרצת סביבת פיתוח (Vite)
bun run build         # בניית production
bun run lint          # ESLint
bun run format        # Prettier
supabase start        # סטאק Supabase מקומי (דורש Docker)
supabase db reset     # איפוס DB מקומי + הרצת כל המיגרציות מחדש
```

## מבנה

```
src/routes/          # מסלולים (file-based, TanStack Router)
src/components/app/   # רכיבי UI לצד הלקוח
src/components/admin/ # רכיבי UI לצד הניהול
src/lib/              # לוגיקה טהורה + שכבת API
supabase/             # מיגרציות, RLS, seed
docs/                 # PRD.md + WORK_PLAN.md
```

## פריסה

Vercel (TanStack Start / nitro `vercel` preset) + Supabase מאוחסן. פירוט מלא בשלב 7 של
[WORK_PLAN.md](docs/WORK_PLAN.md).
