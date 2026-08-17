import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/app/button";
import { TextArea, TextInput } from "@/components/app/form-controls";
import { Modal } from "@/components/app/modal";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

/** מנקה מספר טלפון ישראלי לפורמט בינלאומי לוואטסאפ. */
export function waPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

export function inviteMessage({
  customerName,
  phone,
  appUrl,
}: {
  customerName: string;
  phone: string;
  appUrl: string;
}): string {
  return [
    `שלום ${customerName || ""}`.trim() + ",",
    "פתחנו לכם חשבון במערכת ההזמנות של מאפיית שני האופים 🥖",
    "",
    `קישור לאפליקציה: ${appUrl}`,
    `שם משתמש: ${phone}`,
    `סיסמה זמנית: ${phone}`,
    "",
    "בכניסה הראשונה תתבקשו להחליף את הסיסמה הזמנית לסיסמה אישית.",
    "לאחר מכן אפשר לבצע הזמנות ישירות מהאפליקציה.",
    "",
    "בכל שאלה אנחנו כאן 🙂",
  ].join("\n");
}

/** חלון שליחת פרטי התחברות ללקוח חדש בוואטסאפ. */
export function CustomerInviteModal({
  open,
  customerName,
  phone,
  appUrl,
  onClose,
}: {
  open: boolean;
  customerName: string;
  phone: string;
  appUrl: string;
  onClose: () => void;
}) {
  const [target, setTarget] = useState(phone);
  const [message, setMessage] = useState(() => inviteMessage({ customerName, phone, appUrl }));

  useEffect(() => {
    if (!open) return;
    setTarget(phone);
    setMessage(inviteMessage({ customerName, phone, appUrl }));
  }, [open, phone, customerName, appUrl]);

  const send = () => {
    const to = waPhone(target);
    if (to.length < 9) {
      toast.error("מספר הטלפון של הלקוח חסר או שגוי");
      return;
    }
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    toast.success("ההודעה נפתחה בוואטסאפ לשליחה");
    onClose();
  };

  const copy = () => {
    void navigator.clipboard?.writeText(message).then(
      () => toast.success("ההודעה הועתקה"),
      () => toast.error("ההעתקה נכשלה"),
    );
  };

  return (
    <Modal open={open} title="שליחת פרטי התחברות ללקוח" xClose onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="text-[12.5px] leading-relaxed text-muted-foreground">
          הלקוח נשמר. אפשר לשלוח לו עכשיו בוואטסאפ קישור לאפליקציה, שם משתמש וסיסמה זמנית
          (שניהם מספר הטלפון שלו) והנחיה להחליף סיסמה בכניסה הראשונה.
        </div>

        <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-foreground">
          מספר וואטסאפ
          <TextInput
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="tel"
            dir="ltr"
            className="text-right"
            placeholder="050-0000000"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-foreground">
          תוכן ההודעה
          <TextArea value={message} onChange={(e) => setMessage(e.target.value)} rows={9} />
        </label>

        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1 font-semibold py-2.5" onClick={copy}>
            <Copy className="size-4" />
            העתקה
          </Button>
          <Button
            className="flex-1 gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white py-2.5"
            onClick={send}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-white/20">
              <WhatsAppIcon className="size-5" />
            </span>
            שליחה ללקוח
          </Button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[12.5px] font-semibold text-muted-foreground"
        >
          דילוג
        </button>
      </div>
    </Modal>
  );
}
