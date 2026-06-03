"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, ChefHat } from "lucide-react";
import {
  getCustomRecipes,
  addRecipeAsync,
  updateRecipeAsync,
  deleteRecipeAsync,
  isCloudEnabled,
} from "../utils/recipeCrud";

const TAGS = ["Quick Meal", "Protein", "Comfort", "No-Cook"];
const LEVELS = ["Beginner", "Easy"];

const emptyForm = () => ({
  title: "",
  subtitle: "",
  time: "15 min",
  cost: "$5",
  level: "Beginner",
  tag: "Quick Meal",
  image: "🍽️",
  ingredientsText: "",
  stepsText: "",
  why: "",
});

function formFromRecipe(recipe) {
  return {
    title: recipe.title ?? "",
    subtitle: recipe.subtitle ?? "",
    time: recipe.time ?? "",
    cost: recipe.cost ?? "",
    level: recipe.level ?? "Beginner",
    tag: recipe.tag ?? "Quick Meal",
    image: recipe.image ?? "🍽️",
    ingredientsText: (recipe.ingredients ?? []).join("\n"),
    stepsText: (recipe.steps ?? []).join("\n"),
    why: recipe.why ?? "",
  };
}

function payloadFromForm(form) {
  return {
    title: form.title,
    subtitle: form.subtitle,
    time: form.time,
    cost: form.cost,
    level: form.level,
    tag: form.tag,
    image: form.image,
    ingredients: form.ingredientsText.split("\n").map((s) => s.trim()).filter(Boolean),
    steps: form.stepsText.split("\n").map((s) => s.trim()).filter(Boolean),
    why: form.why,
  };
}

export default function ModifyRecipesModal({
  open,
  onClose,
  builtinRecipes,
  onRecipesChange,
  user,
  supabase,
}) {
  const [customList, setCustomList] = useState([]);
  const [mode, setMode] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refreshList = () => setCustomList(getCustomRecipes());
  const synced = Boolean(user && isCloudEnabled());

  useEffect(() => {
    if (open) {
      refreshList();
      setMode("list");
      setEditingId(null);
      setForm(emptyForm());
      setError("");
    }
  }, [open, user]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAdd = async () => {
    setSaving(true);
    const result = await addRecipeAsync(
      supabase,
      user?.id,
      payloadFromForm(form),
      builtinRecipes,
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refreshList();
    onRecipesChange();
    setMode("list");
    setForm(emptyForm());
    setError("");
  };

  const handleUpdate = async () => {
    setSaving(true);
    const result = await updateRecipeAsync(
      supabase,
      user?.id,
      editingId,
      payloadFromForm(form),
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refreshList();
    onRecipesChange();
    setMode("list");
    setEditingId(null);
    setError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this recipe?")) return;
    setSaving(true);
    const result = await deleteRecipeAsync(supabase, user?.id, id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refreshList();
    onRecipesChange();
    setError("");
  };

  const startEdit = (recipe) => {
    setEditingId(recipe.id);
    setForm(formFromRecipe(recipe));
    setMode("edit");
    setError("");
  };

  const startAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setMode("add");
    setError("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-2">
                <ChefHat className="text-orange-500" size={22} />
                <h2 className="text-2xl font-bold">Modify Recipes</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {mode === "list" && (
                <>
                  <p className="text-sm text-slate-500">
                    Add your own cards to the deck. Built-in recipes (Egg Fried Rice, etc.) stay unchanged.
                  </p>
                  {synced ? (
                    <p className="mt-2 rounded-2xl bg-green-50 px-3 py-2 text-xs text-green-800 ring-1 ring-green-100">
                      Signed in — recipes sync to your account (same as favorites).
                    </p>
                  ) : (
                    <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
                      {user
                        ? "Cloud sync unavailable (Supabase not configured on this deploy)."
                        : "Sign in to save custom recipes across devices. While logged out, recipes stay on this browser only."}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={startAdd}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                  >
                    <Plus size={18} /> Add new recipe
                  </button>

                  <div className="mt-5 space-y-3">
                    {customList.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                        No custom recipes yet. Tap &quot;Add new recipe&quot; to create one.
                      </div>
                    ) : (
                      customList.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="flex items-center gap-3 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-100"
                        >
                          <span className="text-3xl">{recipe.image}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{recipe.title}</p>
                            <p className="text-xs text-slate-500">
                              {recipe.tag} · {recipe.time} · {recipe.cost}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEdit(recipe)}
                            className="rounded-xl bg-white p-2.5 text-slate-600 ring-1 ring-slate-200 transition hover:bg-orange-100 hover:text-orange-700"
                            aria-label="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(recipe.id)}
                            className="rounded-xl bg-white p-2.5 text-slate-600 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {(mode === "add" || mode === "edit") && (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (saving) return;
                    if (mode === "add") handleAdd();
                    else handleUpdate();
                  }}
                >
                  <h3 className="text-lg font-semibold">
                    {mode === "add" ? "New recipe" : "Edit recipe"}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Title *" value={form.title} onChange={(v) => setField("title", v)} />
                    <Field label="Emoji" value={form.image} onChange={(v) => setField("image", v)} placeholder="🍳" />
                    <Field label="Subtitle" value={form.subtitle} onChange={(v) => setField("subtitle", v)} className="sm:col-span-2" />
                    <Field label="Time" value={form.time} onChange={(v) => setField("time", v)} />
                    <Field label="Cost" value={form.cost} onChange={(v) => setField("cost", v)} />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Level</label>
                      <select
                        value={form.level}
                        onChange={(e) => setField("level", e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Tag</label>
                      <select
                        value={form.tag}
                        onChange={(e) => setField("tag", e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                      >
                        {TAGS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Ingredients * <span className="font-normal text-slate-400">(one per line)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={form.ingredientsText}
                      onChange={(e) => setField("ingredientsText", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                      placeholder={"Eggs\nRice\nSoy sauce"}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Steps * <span className="font-normal text-slate-400">(one per line)</span>
                    </label>
                    <textarea
                      rows={5}
                      value={form.stepsText}
                      onChange={(e) => setField("stepsText", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                      placeholder={"Heat the pan\nAdd ingredients"}
                    />
                  </div>

                  <Field label="Why students will like it" value={form.why} onChange={(v) => setField("why", v)} className="sm:col-span-2" />

                  {error && (
                    <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setMode("list"); setError(""); }}
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:opacity-60"
                    >
                      {saving ? "Saving…" : mode === "add" ? "Add recipe" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, value, onChange, placeholder, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
      />
    </div>
  );
}
