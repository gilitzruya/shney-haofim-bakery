import halfBaguette from "@/assets/products/half-baguette.jpg";

/** Product id -> product photo (white background). */
export const PRODUCT_IMAGES: Record<string, string> = {
  c1_1: halfBaguette,
};

export function productImage(id: string): string | undefined {
  return PRODUCT_IMAGES[id];
}
