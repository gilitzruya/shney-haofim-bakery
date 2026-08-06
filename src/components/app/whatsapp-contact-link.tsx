import { WhatsAppIcon } from "./whatsapp-icon";

import { BAKERY_CONTACT } from "@/data/catalog";

const digits = BAKERY_CONTACT.whatsapp.replace(/\D/g, "");
const WHATSAPP_HREF = `https://wa.me/972${digits.slice(1)}`;

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return value;
}

export function WhatsAppContactLink({
  className,
  label = "שליחת הודעה בוואטסאפ",
  showNumber = true,
}: {
  className?: string;
  label?: string;
  showNumber?: boolean;
}) {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer"
      className={
        "flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition-transform active:scale-[0.98] no-underline whitespace-nowrap " +
        (className ?? "")
      }
    >
      <WhatsAppIcon className="size-5 text-white" />
      <span dir="ltr">
        {showNumber ? `${label} — ${formatPhone(BAKERY_CONTACT.whatsapp)}` : label}
      </span>
    </a>
  );
}

