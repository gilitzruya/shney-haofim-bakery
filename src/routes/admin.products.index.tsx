import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, GripVertical, Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card } from "@/components/app/card";
import { TextInput } from "@/components/app/form-controls";
import { useStore } from "@/store/app-store";
import type { Category } from "@/data/catalog";

export const Route = createFileRoute("/admin/products/")({
  head: () => ({
    meta: [
      { title: "מוצרים — ניהול המאפייה" },
      { name: "description", content: "ניהול המוצרים והקטגוריות של המאפייה וסדר התצוגה." },
      { property: "og:title", content: "מוצרים — ניהול המאפייה" },
      { property: "og:description", content: "ניהול המוצרים והקטגוריות של המאפייה וסדר התצוגה." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const { catalog, hydrated, reorderCategories, addCategory, removeCategory } = useStore();
  const [newName, setNewName] = useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    addCategory(name);
    setNewName("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = catalog.findIndex((c) => c.id === active.id);
    const newIndex = catalog.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderCategories(arrayMove(catalog, oldIndex, newIndex));
  };

  return (
    <AdminShell>
      <Section className="pt-6 pb-10">
        <h1 className="text-[19px] font-bold text-heading">מוצרים וקטגוריות</h1>
        <p className="mt-1 text-[12.5px] text-black">
          לחיצה על קטגוריה פותחת את המוצרים שלה לעריכה. גרירה בידית מימין משנה את סדר התצוגה בקטלוג הלקוח.
        </p>

        <Card className="mt-4 flex flex-col gap-2">
          <div className="text-[12px] font-semibold text-muted-foreground">הוספת קטגוריה חדשה</div>
          <div className="flex items-center gap-2">
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="לדוגמה: מאפי בוקר"
              aria-label="שם קטגוריה חדשה"
            />
            <Button size="sm" onClick={create} disabled={!newName.trim()}>
              <Plus className="size-4" />
              הוספה
            </Button>
          </div>
        </Card>

        <div className="mt-4 flex flex-col gap-3">
          {!hydrated ? null : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={catalog.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {catalog.map((c) => (
                  <SortableCategoryCard
                    key={c.id}
                    category={c}
                    onRemove={() => removeCategory(c.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </Section>
    </AdminShell>
  );
}

function SortableCategoryCard({
  category,
  onRemove,
}: {
  category: Category;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`flex items-stretch gap-2 p-0 transition-shadow ${
          isDragging ? "shadow-lg" : ""
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          role="button"
          aria-label={`גרירה לשינוי סדר: ${category.name}`}
          className="flex touch-none items-center justify-center rounded-s-xl bg-muted/50 px-2 text-muted-foreground"
        >
          <GripVertical className="size-5" />
        </div>

        <Link
          to="/admin/products/$categoryId"
          params={{ categoryId: category.id }}
          className="flex flex-1 items-center gap-3 py-3 pe-3 no-underline"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Package className="size-4" />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[14.5px] font-bold text-heading">{category.name}</span>
            <span className="text-[11.5px] text-muted-foreground">
              {category.products.length} מוצרים · לצפייה ועריכה
            </span>
          </span>
          <ChevronLeft className="size-5 text-primary" />
        </Link>

        {category.products.length === 0 ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`מחיקת הקטגוריה ${category.name}`}
            className="flex items-center px-2 text-muted-foreground"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </Card>
    </div>
  );
}
