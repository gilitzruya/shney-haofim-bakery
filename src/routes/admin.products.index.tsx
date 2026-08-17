import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Section } from "@/components/app/app-shell";
import { Button } from "@/components/app/button";
import { Card } from "@/components/app/card";
import { TextInput } from "@/components/app/form-controls";
import { useStore } from "@/store/app-store";

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
  const { catalog, hydrated, moveCategory, renameCategory, addCategory, removeCategory } = useStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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

  return (
    <AdminShell>
      <Section className="pt-6 pb-10">
        <h1 className="text-[19px] font-bold text-heading">מוצרים וקטגוריות</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          סדר הקטגוריות כאן הוא הסדר שהלקוחות רואים בקטלוג.
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
          {!hydrated
            ? null
            : catalog.map((c, i) => (
                <Card key={c.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label={`העלאת ${c.name}`}
                        disabled={i === 0}
                        onClick={() => moveCategory(c.id, -1)}
                        className="rounded-md p-1 text-muted-foreground disabled:opacity-30"
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`הורדת ${c.name}`}
                        disabled={i === catalog.length - 1}
                        onClick={() => moveCategory(c.id, 1)}
                        className="rounded-md p-1 text-muted-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="size-4" />
                      </button>
                    </div>

                    {editingId === c.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <TextInput
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="שם הקטגוריה"
                        />
                        <Button size="sm" onClick={saveEdit}>
                          שמירה
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Link
                          to="/admin/products/$categoryId"
                          params={{ categoryId: c.id }}
                          className="flex flex-1 items-center justify-between gap-2 no-underline"
                        >
                          <span className="text-[14px] font-bold text-heading">{c.name}</span>
                          <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                            {c.products.length} מוצרים
                            <ChevronLeft className="size-4" />
                          </span>
                        </Link>
                      </>
                    )}
                  </div>

                  {editingId === c.id ? null : (
                    <div className="flex items-center gap-2 border-t border-border pt-2">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(c.id, c.name)}>
                        שינוי שם
                      </Button>
                      {c.products.length === 0 ? (
                        <Button variant="ghost" size="sm" onClick={() => removeCategory(c.id)}>
                          <Trash2 className="size-4" />
                          מחיקה
                        </Button>
                      ) : null}
                    </div>
                  )}
                </Card>
              ))}
        </div>
      </Section>
    </AdminShell>
  );
}
