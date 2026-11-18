import { cn } from "@/lib/utils";

// לוגואים של שירותי מייל בצבעי המותג המקוריים — חריג מכוון לכלל "טוקני עיצוב בלבד",
// כמו הירוק של וואטסאפ: הלקוח מזהה את השירות לפי הלוגו.

export function GmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="52 42 88 66" className={cn("size-5", className)} aria-hidden="true">
      <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
      <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
      <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
      <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
      <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
    </svg>
  );
}

export function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-5", className)} aria-hidden="true">
      {/* מעטפה */}
      <rect x="11" y="8" width="19" height="17" rx="2" fill="#28a8ea" />
      <path d="M11 10.5l9.5 7 9.5-7" fill="none" stroke="#0a2767" strokeWidth="1.4" />
      {/* אריח ה-O */}
      <rect x="2" y="6" width="17" height="20" rx="2.5" fill="#0078d4" />
      <ellipse cx="10.5" cy="16" rx="4" ry="5" fill="none" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}
