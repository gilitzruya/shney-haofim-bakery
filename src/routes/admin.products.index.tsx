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
import { ChevronLeft, GripVertical, Plus, Trash2 } from "lucide-react";
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
  const { catalog, hydrated, reorderCategories, renameCategory, addCategory, removeCategory } = useStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) renameCategory(editingId, editName.trim());
    setEditingId(null);
  };

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
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          סדר הקטגוריות כאן הוא הסדר שהלקוחות רואים בקטלוג. אפשר לגרור קטגוריה כדי לשנות את מיקומה.
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

        <div className="mt-4 flex flex-col gap-2">
          {!hydrated ? null : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={catalog.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {catalog.map((c) => (
                  <SortableCategoryCard
                    key={c.id}
                    category={c}
                    isEditing={editingId === c.id}
                    editName={editName}
                    onEditNameChange={setEditName}
                    onSaveEdit={saveEdit}
                    onStartEdit={() => startEdit(c.id, c.name)}
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
  isEditing,
  editName,
  onEditNameChange,
  onSaveEdit,
  onStartEdit,
  onRemove,
}: {
  category: Category;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (value: string) => void;
  onSaveEdit: () => void;
  onStartEdit: () => void;
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
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="גרירה לשינוי סדר"
            className="rounded-md p-1 text-muted-foreground"
          >
            <GripVertical className="size-5" />
          </button>

          {isEditing ? (
            <div className="flex flex-1 items-center gap-2">
              <TextInput
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                aria-label="שם הקטגוריה"
              />
              <Button size="sm" onClick={onSaveEdit}>
                שמירה
              </Button>
            </div>
          ) : (
            <>
              <Link
                to="/admin/products/$categoryId"
                params={{ categoryId: category.id }}
                className="flex flex-1 items-center justify-between gap-2 no-underline"
              >
                <span className="text-[14px] font-bold text-heading">{category.name}</span>
                <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                  {category.products.length} מוצרים
                  <ChevronLeft className="size-4" />
                </span>
              </Link>
            </>
          )}
        </div>

        {isEditing ? null : (
          <div className="flex items-center gap-2 border-t border-border pt-2">
            <Button variant="ghost" size="sm" onClick={onStartEdit}>
              שינוי שם
            </Button>
            {category.products.length === 0 ? (
              <Button variant="ghost" size="sm" onClick={onRemove}>
                <Trash2 className="size-4" />
                מחיקה
              </Button>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
