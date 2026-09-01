-- שלב 7: הפעלת pg_cron ורישום שלושת ה-jobs (הוגדרו כפונקציות בשלבים 3/4, לא היו
-- מתוזמנים עד עכשיו). תדירות של 10 דקות — מועד הסגירה משתנה לפי שעה/יום (cutoff_rules),
-- לכן לא מספיקה הרצה יומית בודדת (ראו WORK_PLAN שלב 7, "החלטה טכנית: איפה רצות המשימות").

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'job_close_upcoming_recurring',
  '*/10 * * * *',
  $$select public.job_close_upcoming_recurring();$$
);

select cron.schedule(
  'job_close_completed_orders',
  '*/10 * * * *',
  $$select public.job_close_completed_orders();$$
);

select cron.schedule(
  'job_expire_stale_drafts',
  '*/10 * * * *',
  $$select public.job_expire_stale_drafts();$$
);
