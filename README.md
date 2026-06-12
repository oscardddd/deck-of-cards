# Recipe Deck of Cards

A Next.js prototype for browsing simple, student-friendly recipes as a swipeable
deck of cards. Search and filter recipes, shuffle for a random pick, save
favorites, add your own recipes, and see a small "taste profile" based on what
you browse.

## Requirements

- Node.js 18 or newer

## Run locally

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal:

```text
http://localhost:3000
```

The app runs out of the box in **local-only mode** — recipes, favorites, and
browsing history are kept in your browser. No account or backend is required to
review it.

## Optional: enable sign-in and cross-device sync

Sign-in, saved-recipe sync, and custom-recipe sync are powered by Supabase and
are optional. To turn them on, copy the example env file and fill in your own
Supabase project values:

```bash
cp .env.local.example .env.local
```

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

The SQL for the required tables lives in `supabase/`. Without these values the
app simply skips the cloud features and stays in local-only mode.

## Main files

```text
src/App.jsx                 Main UI and app logic
src/ModifyRecipesModal.jsx  Add / edit / delete custom recipes
utils/recipeCrud.js         Recipe storage (localStorage + Supabase)
```
