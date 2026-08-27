import halfBaguette from "@/assets/products/half-baguette.jpg";
import longBaguette from "@/assets/products/בגט_ארוך.webp";
import sesameRoll from "@/assets/products/לחמניית_שומשום.webp";
import burgerRoll from "@/assets/products/לחמניית_המבורגר.webp";
import americanBagel from "@/assets/products/בייגל_אמריקאי.webp";
import toastBagel from "@/assets/products/בייגל_טוסט.webp";
import challah from "@/assets/products/חלה_רגילה.webp";
import chocolatePastry from "@/assets/products/מאפה_שוקולד.webp";
import cinnamonPastry from "@/assets/products/מאפה_קינמון.webp";
import cheeseBurekas from "@/assets/products/בורקס_גבינה.webp";
import pizzaBurekas from "@/assets/products/בורקס_פיצה.webp";
import pita from "@/assets/products/פיתה.webp";
import pitaToast from "@/assets/products/פיתה_טוסט.webp";

/** Product id -> product photo (white background). */
export const PRODUCT_IMAGES: Record<string, string> = {
  c1_1: halfBaguette,
  c1_2: longBaguette,
  c2_1: sesameRoll,
  c2_2: burgerRoll,
  c3_1: toastBagel,
  c3_2: americanBagel,
  c5_1: challah,
  c4_1: pita,
  c4_2: pitaToast,
  c6_1: chocolatePastry,
  c6_2: cinnamonPastry,
  c7_1: cheeseBurekas,
  c7_2: pizzaBurekas,
};

export function productImage(id: string): string | undefined {
  return PRODUCT_IMAGES[id];
}

/** Photo for a product: uploaded image wins over the bundled catalog photo. */
export function productPhoto(product: { id: string; imageUrl?: string }): string | undefined {
  return product.imageUrl || PRODUCT_IMAGES[product.id];
}
