import { Mail, Monitor } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/app/button";
import { Modal } from "@/components/app/modal";
import { WhatsAppIcon } from "@/components/app/whatsapp-icon";
import { GmailIcon, OutlookIcon } from "@/components/icons/mail-brand-icons";
import type { Order } from "@/hooks/use-orders";
import {
  composeUrl,
  MAIL_TARGET_LABELS,
  orderEmailText,
  orderWhatsappText,
  type MailTarget,
  type ShareTarget,
} from "@/lib/order-share";

const MAIL_TARGETS: MailTarget[] = ["gmail", "outlook", "mailto"];

const MAIL_TARGET_ICONS: Record<MailTarget, ReactNode> = {
  gmail: <GmailIcon />,
  outlook: <OutlookIcon />,
  mailto: <Monitor className="size-5 text-muted-foreground" />,
};

/**
 * פותח לשונית חדשה ומנתק ממנה את `opener`. לא משתמשים ב-"noopener" של `window.open`:
 * איתו הפונקציה מחזירה תמיד null — גם כשהלשונית נפתחה — ואין דרך לזהות חסימת חלונות.
 */
function openTab(url: string): boolean {
  const tab = window.open(url, "_blank");
  if (!tab) return false;
  tab.opener = null;
  return true;
}

/**
 * פותח את היעד עם ההזמנה. הזמנה ארוכה מדי לקישור — מועתקת קודם ללוח והקישור נושא בקשה
 * להדביק. מחזיר האם ההזמנה הועתקה (כדי שהקורא יציג הנחיה).
 */
async function openShare(target: ShareTarget, subject: string, body: string): Promise<boolean> {
  const { url, fullUrl, needsPaste } = composeUrl(target, subject, body);

  let pasted = false;
  if (needsPaste) {
    // ההעתקה לפני פתיחת החלון — אחרי שהלשונית החדשה מקבלת פוקוס, הדפדפן חוסם גישה ללוח.
    try {
      await navigator.clipboard.writeText(body);
      pasted = true;
    } catch {
      // אין גישה ללוח (הרשאה / הקשר לא מאובטח) — נופלים לקישור המלא למטה.
    }
  }

  // הזמנה ארוכה שלא הועתקה — עדיף קישור מלא (שאולי ייחתך) מהודעה ריקה.
  const finalUrl = needsPaste && !pasted ? fullUrl : url;

  if (target === "mailto") {
    window.location.href = finalUrl;
  } else if (!openTab(finalUrl)) {
    toast.error("הדפדפן חסם את פתיחת החלון", {
      action: { label: "פתיחה", onClick: () => openTab(finalUrl) },
    });
    return false;
  }
  return needsPaste && pasted;
}

/** הסבר להזמנה ארוכה — הלקוח קורא אותו רגע לפני שהוא עובר ללשונית המייל. */
function PasteNote() {
  return (
    <div className="rounded-[10px] bg-accent-soft px-3 py-2 text-[11.5px] font-semibold leading-relaxed text-accent-foreground">
      אם פרטי ההזמנה לא מופיעים בטיוטה — לחצו בגוף המייל ואז Ctrl+V (או קליק ימני ← הדבקה). ההזמנה
      כבר מועתקת ומוכנה להדבקה.
    </div>
  );
}

interface ShareButtonProps {
  order: Order;
  customerName: string;
  showRound: boolean;
  className: string;
}

/**
 * "שליחה במייל": פותח טיוטת מייל מוכנה (נושא + פירוט ההזמנה) בתוכנת המייל של הלקוח, והוא
 * מוסיף נמענים ושולח מהחשבון שלו. אין שליחה מהשרת. בכל לחיצה הלקוח בוחר מאיזה מייל לשלוח —
 * בלי בחירה שמורה.
 */
export function EmailOrderButton({ order, customerName, showRound, className }: ShareButtonProps) {
  const [picking, setPicking] = useState(false);
  const { subject, body } = orderEmailText(order, customerName, showRound);
  // יעדים שהקישור שלהם קצר מדי להזמנה הזו — שם ההזמנה תועתק וצריך להדביק, ומסבירים מראש.
  const pasteTargets = MAIL_TARGETS.filter((t) => composeUrl(t, subject, body).needsPaste);

  const open = async (target: MailTarget) => {
    setPicking(false);
    if (await openShare(target, subject, body)) {
      toast.success("ההזמנה הועתקה — הדביקו אותה בגוף המייל (Ctrl+V)", { duration: 8000 });
    }
  };

  return (
    <>
      <button type="button" onClick={() => setPicking(true)} className={className}>
        <Mail className="size-3.5" />
        שליחה במייל
      </button>

      <Modal open={picking} title="מאיזה מייל לשלוח?" xClose onClose={() => setPicking(false)}>
        <div className="flex flex-col gap-2.5">
          <div className="text-[12.5px] leading-relaxed text-muted-foreground">
            תיפתח טיוטת מייל עם פירוט ההזמנה — מוסיפים נמענים ושולחים.
          </div>
          {pasteTargets.length === MAIL_TARGETS.length ? <PasteNote /> : null}
          {MAIL_TARGETS.map((target) => (
            <div key={target} className="flex flex-col gap-1">
              <Button
                variant="secondary"
                className="gap-2 font-semibold"
                onClick={() => void open(target)}
              >
                {MAIL_TARGET_ICONS[target]}
                {MAIL_TARGET_LABELS[target]}
              </Button>
              {pasteTargets.length < MAIL_TARGETS.length && pasteTargets.includes(target) ? (
                <PasteNote />
              ) : null}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

/**
 * "שליחה בוואטסאפ": פותח את וואטסאפ (אפליקציה בטלפון, Web/Desktop במחשב) עם ההזמנה כהודעה
 * מוכנה, והלקוח בוחר למי לשלוח.
 */
export function WhatsAppOrderButton({
  order,
  customerName,
  showRound,
  className,
}: ShareButtonProps) {
  const send = async () => {
    const text = orderWhatsappText(order, customerName, showRound);
    if (await openShare("whatsapp", "", text)) {
      toast.success("ההזמנה הועתקה — אם הפרטים לא מופיעים בהודעה, לחצו בשדה ההודעה ואז Ctrl+V", {
        duration: 8000,
      });
    }
  };

  return (
    <button type="button" onClick={() => void send()} className={className}>
      <WhatsAppIcon className="size-3.5" />
      שליחה בוואטסאפ
    </button>
  );
}
