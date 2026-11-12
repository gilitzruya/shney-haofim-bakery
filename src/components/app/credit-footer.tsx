import { cn } from "@/lib/utils";

/** קרדיט המפתחת — מופיע בתחתית כל דפי האתר (צד לקוח, ניהול, כניסה, 404/שגיאה). לא מודפס. */
export function CreditFooter({ className }: { className?: string | undefined }) {
  return (
    <footer className={cn("px-3.5 pt-4 pb-5 text-center print:hidden", className)}>
      <a
        href="https://gili-digital.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-semibold text-primary no-underline hover:underline"
      >
        {'פותח ע"י גילי צרויה - פתרונות דיגיטל חכמים לעסקים'}
      </a>
    </footer>
  );
}
