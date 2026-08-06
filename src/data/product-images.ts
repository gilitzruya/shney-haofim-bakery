import halfBaguette from "@/assets/products/half-baguette.jpg";
import longBaguette from "@/assets/products/בגט_ארוך.webp.asset.json";
import sesameRoll from "@/assets/products/לחמניית_שומשום.webp.asset.json";
import burgerRoll from "@/assets/products/לחמניית_המבורגר.webp.asset.json";
import americanBagel from "@/assets/products/בייגל_אמריקאי.webp.asset.json";
import toastBagel from "@/assets/products/בייגל_טוסט.webp.asset.json";
import challah from "@/assets/products/חלה_רגילה.webp.asset.json";
import chocolatePastry from "@/assets/products/מאפה_שוקולד.webp.asset.json";
import cinnamonPastry from "@/assets/products/מאפה_קינמון.webp.asset.json";
import cheeseBurekas from "@/assets/products/בורקס_גבינה.webp.asset.json";
import pizzaBurekas from "@/assets/products/בורקס_פיצה.webp.asset.json";
import pita from "@/assets/products/פיתה.webp.asset.json";
import pitaToast from "@/assets/products/פיתה_טוסט.webp.asset.json";

/** Product id -> product photo (white background). */
export const PRODUCT_IMAGES: Record<string, string> = {
  c1_1: halfBaguette,
  c1_2: longBaguette.url,
  c2_1: sesameRoll.url,
  c2_2: burgerRoll.url,
  c3_1: toastBagel.url,
  c3_2: americanBagel.url,
  c5_1: challah.url,
  c6_1: chocolatePastry.url,
  c6_2: cinnamonPastry.url,
  c7_1: cheeseBurekas.url,
  c7_2: pizzaBurekas.url,
};

export function productImage(id: string): string | undefined {
  return PRODUCT_IMAGES[id];
}
