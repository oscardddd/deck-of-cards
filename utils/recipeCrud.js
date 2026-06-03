/**
 * Custom recipe CRUD.
 * - Logged in + Supabase configured: sync to `custom_recipes` table (per user_id).
 * - Otherwise: localStorage on this browser only.
 */

const CUSTOM_RECIPES_KEY = "custom_recipes";

// Cloud custom_recipes ids start at 1 (identity column) and would collide with
// the built-in recipes (ids 1–10). Offset cloud ids into a separate numeric
// range so every recipe in the deck has a unique id. The real DB row id is
// recovered by subtracting the offset for update/delete.
const CLOUD_ID_OFFSET = 1_000_000;
const toClientId = (rowId) => CLOUD_ID_OFFSET + Number(rowId);
const toDbId = (clientId) => Number(clientId) - CLOUD_ID_OFFSET;

export function isCloudEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function readStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_RECIPES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(recipes) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_RECIPES_KEY, JSON.stringify(recipes));
  } catch {}
}

function nextId(builtinRecipes = []) {
  const all = [...builtinRecipes, ...readStorage()];
  const max = all.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  return max + 1;
}

function validateRecipe(recipe) {
  if (!recipe?.title?.trim()) {
    return { ok: false, error: "Title is required." };
  }
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.filter(Boolean)
    : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps.filter(Boolean) : [];
  if (ingredients.length === 0) {
    return { ok: false, error: "At least one ingredient is required." };
  }
  if (steps.length === 0) {
    return { ok: false, error: "At least one step is required." };
  }
  return { ok: true };
}

function normalizePayload(payload) {
  return {
    title: payload.title.trim(),
    subtitle: payload.subtitle?.trim() ?? "",
    time: payload.time?.trim() ?? "",
    cost: payload.cost?.trim() ?? "",
    level: payload.level?.trim() ?? "Beginner",
    tag: payload.tag?.trim() ?? "Quick Meal",
    image: payload.image?.trim() ?? "🍽️",
    ingredients: payload.ingredients.map((s) => String(s).trim()).filter(Boolean),
    steps: payload.steps.map((s) => String(s).trim()).filter(Boolean),
    why: payload.why?.trim() ?? "",
  };
}

function payloadToRow(payload) {
  const n = normalizePayload(payload);
  return {
    title: n.title,
    subtitle: n.subtitle,
    time: n.time,
    cost: n.cost,
    level: n.level,
    tag: n.tag,
    image: n.image,
    ingredients: n.ingredients,
    steps: n.steps,
    why: n.why,
  };
}

function rowToRecipe(row) {
  return {
    id: toClientId(row.id),
    title: row.title,
    subtitle: row.subtitle,
    time: row.time,
    cost: row.cost,
    level: row.level,
    tag: row.tag,
    image: row.image,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    why: row.why,
    isCustom: true,
  };
}

export function getCustomRecipes() {
  return readStorage();
}

/** Pull this user's recipes from Supabase into localStorage cache. */
export async function syncCustomRecipesFromCloud(supabase, userId) {
  if (!userId || !isCloudEnabled()) return getCustomRecipes();

  const { data, error } = await supabase
    .from("custom_recipes")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: true });

  if (error) {
    console.warn("custom_recipes sync failed:", error.message);
    return getCustomRecipes();
  }

  const recipes = (data ?? []).map(rowToRecipe);
  writeStorage(recipes);
  return recipes;
}

export function addRecipe(payload, builtinRecipes = []) {
  const check = validateRecipe(payload);
  if (!check.ok) return { ok: false, error: check.error };

  const recipes = readStorage();
  const n = normalizePayload(payload);
  const recipe = { id: payload.id ?? nextId(builtinRecipes), ...n, isCustom: true };

  recipes.push(recipe);
  writeStorage(recipes);
  return { ok: true, recipe };
}

export async function addRecipeAsync(supabase, userId, payload, builtinRecipes = []) {
  const check = validateRecipe(payload);
  if (!check.ok) return { ok: false, error: check.error };

  if (userId && isCloudEnabled()) {
    const { data, error } = await supabase
      .from("custom_recipes")
      .insert({ user_id: userId, ...payloadToRow(payload) })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    const recipe = rowToRecipe(data);
    writeStorage([...readStorage(), recipe]);
    return { ok: true, recipe };
  }

  return addRecipe(payload, builtinRecipes);
}

export function updateRecipe(id, updates) {
  const recipes = readStorage();
  const index = recipes.findIndex((r) => r.id === id);
  if (index === -1) {
    return { ok: false, error: `Recipe ${id} not found.` };
  }

  const merged = { ...recipes[index], ...updates, id };
  const check = validateRecipe(merged);
  if (!check.ok) return { ok: false, error: check.error };

  recipes[index] = { ...normalizePayload(merged), id, isCustom: true };
  writeStorage(recipes);
  return { ok: true, recipe: recipes[index] };
}

export async function updateRecipeAsync(supabase, userId, id, updates) {
  const recipes = readStorage();
  const existing = recipes.find((r) => r.id === id);
  if (!existing) return { ok: false, error: `Recipe ${id} not found.` };

  const merged = { ...existing, ...updates, id };
  const check = validateRecipe(merged);
  if (!check.ok) return { ok: false, error: check.error };

  if (userId && isCloudEnabled()) {
    const { data, error } = await supabase
      .from("custom_recipes")
      .update(payloadToRow(merged))
      .eq("user_id", userId)
      .eq("id", toDbId(id))
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    const recipe = rowToRecipe(data);
    writeStorage(recipes.map((r) => (r.id === id ? recipe : r)));
    return { ok: true, recipe };
  }

  return updateRecipe(id, updates);
}

export function deleteRecipe(id) {
  const recipes = readStorage();
  const next = recipes.filter((r) => r.id !== id);
  if (next.length === recipes.length) {
    return { ok: false, error: `Recipe ${id} not found.` };
  }
  writeStorage(next);
  return { ok: true };
}

export async function deleteRecipeAsync(supabase, userId, id) {
  if (userId && isCloudEnabled()) {
    const { error } = await supabase
      .from("custom_recipes")
      .delete()
      .eq("user_id", userId)
      .eq("id", toDbId(id));
    if (error) return { ok: false, error: error.message };
    writeStorage(readStorage().filter((r) => r.id !== id));
    return { ok: true };
  }
  return deleteRecipe(id);
}

export function searchRecipes(recipes, { query = "", tag = "All" } = {}) {
  const q = query.trim().toLowerCase();
  return recipes.filter((recipe) => {
    const matchesTag = tag === "All" || recipe.tag === tag;
    if (!q) return matchesTag;
    const haystack = [
      recipe.title,
      recipe.subtitle,
      recipe.tag,
      recipe.level,
      ...(recipe.ingredients ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return matchesTag && haystack.includes(q);
  });
}

export function mergeWithBuiltin(builtinRecipes) {
  const custom = getCustomRecipes();
  const builtinIds = new Set(builtinRecipes.map((r) => r.id));
  const onlyCustom = custom.filter((r) => !builtinIds.has(r.id));
  return [...builtinRecipes, ...onlyCustom];
}
