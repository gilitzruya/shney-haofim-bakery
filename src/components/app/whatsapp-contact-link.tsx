import { WhatsAppIcon } from "./whatsapp-icon";

import { BAKERY_CONTACT } from "@/data/catalog";

const WHATSAPP_HREF = `https://wa.me/972${BAKERY_CONTACT.whatsapp.replace(/\D/g, "").slice(1)}`;

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
        "flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition-transform active:scale-[0.98] no-underline " +
        (className ?? "")
      }
    >
      <WhatsAppIcon className="size-5 text-white" />
      <span>{showNumber ? `${label} — ${BAKERY_CONTACT.whatsapp}` : label}</span>
    </a>
  );
}
