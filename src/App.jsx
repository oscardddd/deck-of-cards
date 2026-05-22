"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Shuffle, Heart, Clock, DollarSign, ChefHat,
  ChevronLeft, ChevronRight, Star, Utensils, Flame,
  Bookmark, X, CheckCircle2, LogIn, LogOut, User,
} from "lucide-react";
import { createClient } from "../utils/supabase/client";

const supabase = createClient();

const recipes = [
  {
    id: 1,
    title: "Egg Fried Rice",
    subtitle: "Fast, cheap, and beginner-friendly",
    time: "15 min",
    cost: "$6",
    level: "Beginner",
    tag: "Quick Meal",
    image: "🍳",
    ingredients: ["Cooked rice", "Eggs", "Green onion", "Soy sauce", "Frozen vegetables"],
    steps: [
      "Heat a pan with a little oil.",
      "Scramble the eggs and set them aside.",
      "Add rice and vegetables to the pan.",
      "Mix in eggs, soy sauce, and green onion."
    ],
    why: "Good for busy students because it uses leftovers and takes less than 20 minutes."
  },
  {
    id: 2,
    title: "Chicken Wrap",
    subtitle: "No complicated cooking required",
    time: "20 min",
    cost: "$9",
    level: "Beginner",
    tag: "Protein",
    image: "🌯",
    ingredients: ["Tortilla", "Chicken", "Lettuce", "Tomato", "Sauce"],
    steps: [
      "Warm the tortilla for 20 seconds.",
      "Add chicken, lettuce, tomato, and sauce.",
      "Fold the bottom first, then roll tightly.",
      "Cut in half and serve."
    ],
    why: "Works well when students want something portable and filling."
  },
  {
    id: 3,
    title: "Tomato Pasta",
    subtitle: "Comfort food with simple ingredients",
    time: "25 min",
    cost: "$8",
    level: "Easy",
    tag: "Comfort",
    image: "🍝",
    ingredients: ["Pasta", "Tomato sauce", "Garlic", "Olive oil", "Cheese"],
    steps: [
      "Boil pasta until soft.",
      "Cook garlic with oil in a pan.",
      "Add tomato sauce and simmer.",
      "Mix pasta with sauce and top with cheese."
    ],
    why: "A reliable option for students who want an easy dinner without decision fatigue."
  },
  {
    id: 4,
    title: "Tuna Rice Bowl",
    subtitle: "A low-effort meal for busy days",
    time: "10 min",
    cost: "$5",
    level: "Beginner",
    tag: "No-Cook",
    image: "🍚",
    ingredients: ["Rice", "Canned tuna", "Mayo", "Seaweed", "Cucumber"],
    steps: [
      "Put warm rice in a bowl.",
      "Mix tuna with mayo.",
      "Add tuna, cucumber, and seaweed on top.",
      "Mix before eating."
    ],
    why: "Useful for people who are tired and do not want to fully cook."
  }
];

const filters = ["All", "Quick Meal", "Protein", "Comfort", "No-Cook"];

export default function App() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Auth state
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Listen to sign-in / sign-out events
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load this user's saved recipes whenever they log in
  useEffect(() => {
    if (!user) { setSaved([]); return; }
    supabase
      .from("favorites")
      .select("recipe_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setSaved(data.map((r) => r.recipe_id));
      });
  }, [user]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesFilter = activeFilter === "All" || recipe.tag === activeFilter;
      const matchesQuery = `${recipe.title} ${recipe.subtitle} ${recipe.ingredients.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query]);

  const currentRecipe = filteredRecipes[index % Math.max(filteredRecipes.length, 1)];

  const nextCard = () => {
    if (filteredRecipes.length === 0) return;
    setIndex((prev) => (prev + 1) % filteredRecipes.length);
  };

  const previousCard = () => {
    if (filteredRecipes.length === 0) return;
    setIndex((prev) => (prev - 1 + filteredRecipes.length) % filteredRecipes.length);
  };

  const randomCard = () => {
    if (filteredRecipes.length <= 1) return;
    let newIndex = index;
    while (newIndex === index) {
      newIndex = Math.floor(Math.random() * filteredRecipes.length);
    }
    setIndex(newIndex);
  };

  const toggleSave = async (recipeId) => {
    // Prompt login if not authenticated
    if (!user) { setShowAuthModal(true); return; }

    const isSaved = saved.includes(recipeId);
    if (isSaved) {
      setSaved((prev) => prev.filter((id) => id !== recipeId)); // optimistic
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("recipe_id", recipeId);
    } else {
      setSaved((prev) => [...prev, recipeId]); // optimistic
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, recipe_id: recipeId });
    }
  };

  const changeFilter = (filter) => {
    setActiveFilter(filter);
    setIndex(0);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    if (authMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
      } else {
        setShowAuthModal(false);
        setEmail("");
        setPassword("");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthMessage("Account created! Check your email to confirm, then sign in.");
        setAuthMode("signin");
      }
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const openAuthModal = () => {
    setAuthError("");
    setAuthMessage("");
    setEmail("");
    setPassword("");
    setAuthMode("signin");
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-orange-700 shadow-sm ring-1 ring-orange-100">
              <Utensils size={16} /> Beginner Chop Prototype
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Recipe Deck of Cards</h1>
            <p className="mt-2 max-w-2xl text-base text-slate-600 md:text-lg">
              Swipe through simple recipe cards, choose a meal quickly, and open a step-by-step guide when ready to cook.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            {user ? (
              <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-100">
                <User size={16} className="text-orange-500" />
                <span className="max-w-[160px] truncate text-sm font-medium text-slate-700">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600"
              >
                <LogIn size={16} /> Sign in to save recipes
              </button>
            )}

            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Testing goal</p>
              <p className="mt-1 max-w-xs text-sm text-slate-700">
                Can students find a low-cost, low-effort recipe without feeling overwhelmed?
              </p>
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[1fr_390px]">
          <section className="rounded-[2rem] bg-white/75 p-5 shadow-xl shadow-orange-100/70 ring-1 ring-white md:p-8">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Choose your next meal</h2>
                <p className="mt-1 text-sm text-slate-500">Browse cards by swiping, searching, or using filters.</p>
              </div>
              <button
                onClick={randomCard}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Shuffle size={17} /> Shake / Shuffle
              </button>
            </div>

            <div className="mb-5 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIndex(0);
                  }}
                  placeholder="Search by ingredient or recipe..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => changeFilter(filter)}
                    className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      activeFilter === filter
                        ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-orange-50"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[80px_1fr_80px] md:items-center">
              <button
                onClick={previousCard}
                className="hidden h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-100 transition hover:-translate-x-1 hover:bg-slate-50 md:flex"
                aria-label="Previous card"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="relative min-h-[480px]">
                {filteredRecipes.length === 0 ? (
                  <div className="flex min-h-[480px] items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center">
                    <div>
                      <p className="text-5xl">🔍</p>
                      <h3 className="mt-4 text-xl font-semibold">No recipe found</h3>
                      <p className="mt-2 text-sm text-slate-500">Try another ingredient or filter.</p>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentRecipe.id}
                      initial={{ opacity: 0, x: 80, rotate: 4 }}
                      animate={{ opacity: 1, x: 0, rotate: 0 }}
                      exit={{ opacity: 0, x: -80, rotate: -4 }}
                      transition={{ duration: 0.28 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -80) nextCard();
                        if (info.offset.x > 80) previousCard();
                      }}
                      className="mx-auto max-w-md cursor-grab active:cursor-grabbing"
                    >
                      <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-orange-200/70 ring-1 ring-orange-100">
                        <div className="relative bg-gradient-to-br from-orange-400 to-amber-300 p-6 text-white">
                          <div className="absolute right-5 top-5 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold backdrop-blur">
                            {currentRecipe.tag}
                          </div>
                          <div className="flex h-44 items-center justify-center text-8xl">
                            {currentRecipe.image}
                          </div>
                          <div className="mt-2 flex items-center gap-1 text-sm font-medium">
                            <Star size={16} fill="currentColor" /> Student-friendly pick
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-3xl font-bold tracking-tight">{currentRecipe.title}</h3>
                              <p className="mt-2 text-slate-500">{currentRecipe.subtitle}</p>
                            </div>
                            <button
                              onClick={() => toggleSave(currentRecipe.id)}
                              className={`rounded-full p-3 transition ${
                                saved.includes(currentRecipe.id)
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500"
                              }`}
                              aria-label="Save recipe"
                            >
                              <Heart size={20} fill={saved.includes(currentRecipe.id) ? "currentColor" : "none"} />
                            </button>
                          </div>

                          <div className="mt-5 grid grid-cols-3 gap-3">
                            <InfoPill icon={<Clock size={17} />} label="Time" value={currentRecipe.time} />
                            <InfoPill icon={<DollarSign size={17} />} label="Cost" value={currentRecipe.cost} />
                            <InfoPill icon={<ChefHat size={17} />} label="Level" value={currentRecipe.level} />
                          </div>

                          <div className="mt-5">
                            <p className="text-sm font-semibold text-slate-700">Ingredients</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {currentRecipe.ingredients.map((ingredient) => (
                                <span key={ingredient} className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-700 ring-1 ring-orange-100">
                                  {ingredient}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedRecipe(currentRecipe)}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600"
                          >
                            Start Cooking <Flame size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              <button
                onClick={nextCard}
                className="hidden h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-100 transition hover:translate-x-1 hover:bg-slate-50 md:flex"
                aria-label="Next card"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="mt-5 flex justify-center gap-3 md:hidden">
              <button onClick={previousCard} className="rounded-full bg-white p-4 shadow-md ring-1 ring-slate-100">
                <ChevronLeft />
              </button>
              <button onClick={nextCard} className="rounded-full bg-white p-4 shadow-md ring-1 ring-slate-100">
                <ChevronRight />
              </button>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl shadow-slate-300">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Prototype tasks</h2>
                <Bookmark size={22} />
              </div>
              <div className="mt-5 space-y-4">
                <Task text="Find one meal under $10." />
                <Task text="Move to the next card without using search." />
                <Task text="Open a recipe and understand the first step." />
                <Task text="Save one recipe you would actually try." />
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/85 p-6 shadow-lg shadow-orange-100 ring-1 ring-white">
              <h2 className="text-xl font-semibold">Saved recipes</h2>
              <p className="mt-1 text-sm text-slate-500">
                {user ? "Synced to your account." : "Sign in to save across devices."}
              </p>
              <div className="mt-4 space-y-3">
                {saved.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
                    {user
                      ? "No recipes saved yet. Tap the heart on a card."
                      : "Sign in and tap the heart to save recipes."}
                  </div>
                ) : (
                  recipes
                    .filter((recipe) => saved.includes(recipe.id))
                    .map((recipe) => (
                      <div key={recipe.id} className="flex items-center gap-3 rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-100">
                        <div className="text-2xl">{recipe.image}</div>
                        <div>
                          <p className="font-semibold">{recipe.title}</p>
                          <p className="text-xs text-slate-500">{recipe.time} · {recipe.cost}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/85 p-6 shadow-lg shadow-orange-100 ring-1 ring-white">
              <h2 className="text-xl font-semibold">User testing notes</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ask users to think aloud while completing the tasks. Record where they hesitate, what labels confuse them, and whether the card format makes choosing food easier.
              </p>
            </div>
          </aside>
        </main>
      </div>

      {/* Recipe detail modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-6xl">{selectedRecipe.image}</div>
                  <h2 className="mt-3 text-3xl font-bold">{selectedRecipe.title}</h2>
                  <p className="mt-2 text-slate-500">{selectedRecipe.why}</p>
                </div>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="rounded-full bg-slate-100 p-3 text-slate-500 transition hover:bg-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <InfoPill icon={<Clock size={17} />} label="Time" value={selectedRecipe.time} />
                <InfoPill icon={<DollarSign size={17} />} label="Cost" value={selectedRecipe.cost} />
                <InfoPill icon={<ChefHat size={17} />} label="Level" value={selectedRecipe.level} />
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">What you need</h3>
                  <div className="mt-3 space-y-2">
                    {selectedRecipe.ingredients.map((ingredient) => (
                      <div key={ingredient} className="flex items-center gap-2 rounded-xl bg-orange-50 p-3 text-sm text-orange-800 ring-1 ring-orange-100">
                        <CheckCircle2 size={17} /> {ingredient}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Cooking steps</h3>
                  <div className="mt-3 space-y-3">
                    {selectedRecipe.steps.map((step, stepIndex) => (
                      <div key={step} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Step {stepIndex + 1}</p>
                        <p className="mt-1 text-sm text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecipe(null)}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-4 font-semibold text-white transition hover:bg-slate-800"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {authMode === "signin" ? "Sign in" : "Create account"}
                </h2>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {authMode === "signin"
                  ? "Sign in to save and sync your favorite recipes."
                  : "Create a free account to save recipes across devices."}
              </p>

              <form onSubmit={handleAuth} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {authError && (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
                    {authError}
                  </p>
                )}
                {authMessage && (
                  <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-100">
                    {authMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-4 font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:opacity-60"
                >
                  {authLoading
                    ? "Please wait…"
                    : authMode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                {authMode === "signin" ? "No account yet? " : "Already have an account? "}
                <button
                  onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); setAuthMessage(""); }}
                  className="font-semibold text-orange-500 hover:underline"
                >
                  {authMode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoPill({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Task({ text }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
      <CheckCircle2 className="mt-0.5 shrink-0 text-orange-300" size={18} />
      <p className="text-sm leading-5 text-slate-100">{text}</p>
    </div>
  );
}
