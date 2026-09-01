import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/lib/api/client";
import { applyRuntimeCatalog } from "@/data/catalog";
import type { Category, Product, Unit } from "@/data/catalog";
import { compressImageToBlob } from "@/lib/image-upload";

const BUCKET = "product-images";

export const catalogQueryKey = ["catalog"] as const;

type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  sku: string | null;
  unit: string;
  price: number;
  min_qty: number;
  step: number;
  available: boolean;
  unavailable_reason: string | null;
  weight_grams: number | null;
  note: string | null;
  image_path: string | null;
  position: number;
};

function imageUrlFor(path: string | null): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function toProduct(row: ProductRow): Product {
  const imageUrl = imageUrlFor(row.image_path);
  return {
    id: row.id,
    name: row.name,
    unit: row.unit as Unit,
    price: row.price,
    minQty: row.min_qty,
    step: row.step,
    available: row.available,
    ...(row.unavailable_reason ? { unavailableReason: row.unavailable_reason } : {}),
    ...(row.sku ? { sku: row.sku } : {}),
    ...(row.weight_grams ? { weightGrams: row.weight_grams } : {}),
    ...(row.note ? { note: row.note } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

async function fetchCatalog(): Promise<Category[]> {
  const [{ data: categories, error: catError }, { data: products, error: prodError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, position")
        .order("position", { ascending: true }),
      supabase
        .from("products")
        .select(
          "id, category_id, name, sku, unit, price, min_qty, step, available, unavailable_reason, weight_grams, note, image_path, position",
        )
        .is("deleted_at", null)
        .order("position", { ascending: true }),
    ]);
  if (catError) throw catError;
  if (prodError) throw prodError;

  return (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    products: (products ?? []).filter((p) => p.category_id === c.id).map(toProduct),
  }));
}

/** קטלוג הקטגוריות/מוצרים מה-DB. מזין את אינדקס ה-runtime הגלובלי (`data/catalog.ts`),
 * שנצרך סינכרונית מחוץ ל-React (`lib/format.ts`'s `linesTotal`, ודוחות/תמחור הניהול). */
export function useCatalog() {
  const query = useQuery({ queryKey: catalogQueryKey, queryFn: fetchCatalog });

  useEffect(() => {
    if (query.data) applyRuntimeCatalog(query.data);
  }, [query.data]);

  return { categories: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: catalogQueryKey });
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async (name: string) => {
      const current = queryClient.getQueryData<Category[]>(catalogQueryKey) ?? [];
      const { error } = await supabase
        .from("categories")
        .insert({ name, position: current.length });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useRenameCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("categories").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useRemoveCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          throw new Error("אי אפשר למחוק קטגוריה שהיו בה מוצרים בעבר (גם אם נמחקו)");
        }
        throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async (categories: Category[]) => {
      const results = await Promise.all(
        categories.map((c, index) =>
          supabase.from("categories").update({ position: index }).eq("id", c.id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    // Optimistic: dnd-kit's drop should reflect the new order immediately, not after
    // the round-trip — otherwise the card visibly snaps back before the refetch lands.
    onMutate: async (categories) => {
      await queryClient.cancelQueries({ queryKey: catalogQueryKey });
      const previous = queryClient.getQueryData<Category[]>(catalogQueryKey);
      queryClient.setQueryData(catalogQueryKey, categories);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(catalogQueryKey, context.previous);
    },
    onSettled: invalidate,
  });
}

async function uploadProductImage(productId: string, file: File): Promise<string> {
  const blob = await compressImageToBlob(file);
  // לא משתמשים בשם הקובץ המקורי במפתח האחסון — קובץ עם שם בעברית (או כל תו שאינו
  // ASCII) גורם ל-Storage לדחות את ההעלאה עם 400. crypto.randomUUID() גם מבטל התנגשויות
  // בין שתי העלאות באותה מילישנייה.
  const path = `${productId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
  });
  if (error) throw error;
  return path;
}

export interface ProductFormInput {
  name: string;
  sku: string;
  unit: Unit;
  price: number;
  minQty: number;
  step: number;
  weightGrams?: number | undefined;
  note?: string | undefined;
  imageFile?: File | undefined;
  removeImage?: boolean | undefined;
}

export function useAddProduct() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async ({ categoryId, input }: { categoryId: string; input: ProductFormInput }) => {
      const current = queryClient.getQueryData<Category[]>(catalogQueryKey) ?? [];
      const category = current.find((c) => c.id === categoryId);
      const { data: inserted, error } = await supabase
        .from("products")
        .insert({
          category_id: categoryId,
          name: input.name,
          sku: input.sku,
          unit: input.unit,
          price: input.price,
          min_qty: input.minQty,
          step: input.step,
          weight_grams: input.weightGrams ?? null,
          note: input.note ?? null,
          position: category?.products.length ?? 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (input.imageFile && inserted) {
        try {
          const path = await uploadProductImage(inserted.id, input.imageFile);
          const { error: imgError } = await supabase
            .from("products")
            .update({ image_path: path })
            .eq("id", inserted.id);
          if (imgError) throw imgError;
        } catch (imageStepError) {
          // ההוספה כולה חייבת להיות atomic מנקודת המבט של המשתמש — אם התמונה נכשלת,
          // "נכשל" צריך להיות אמיתי, לא מוצר יתום בלי תמונה ובלי שהמנהל יודע שהוא קיים.
          await supabase.from("products").delete().eq("id", inserted.id);
          throw imageStepError;
        }
      }
    },
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async ({
      productId,
      patch,
    }: {
      productId: string;
      patch: Partial<ProductFormInput> & { available?: boolean };
    }) => {
      let imagePath: string | null | undefined;
      if (patch.imageFile) imagePath = await uploadProductImage(productId, patch.imageFile);
      else if (patch.removeImage) imagePath = null;

      const { error } = await supabase
        .from("products")
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.sku !== undefined ? { sku: patch.sku } : {}),
          ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
          ...(patch.price !== undefined ? { price: patch.price } : {}),
          ...(patch.minQty !== undefined ? { min_qty: patch.minQty } : {}),
          ...(patch.step !== undefined ? { step: patch.step } : {}),
          ...(patch.weightGrams !== undefined ? { weight_grams: patch.weightGrams ?? null } : {}),
          ...(patch.note !== undefined ? { note: patch.note ?? null } : {}),
          ...(patch.available !== undefined ? { available: patch.available } : {}),
          ...(imagePath !== undefined ? { image_path: imagePath } : {}),
        })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useRemoveProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
