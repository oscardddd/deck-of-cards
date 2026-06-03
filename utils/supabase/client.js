import { createBrowserClient } from "@supabase/ssr";

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function createStubClient() {
  const empty = Promise.resolve({ data: [], error: null });
  const query = () => ({
    select: () => query(),
    insert: () => empty,
    delete: () => query(),
    update: () => query(),
    eq: () => query(),
    order: () => query(),
    single: () => Promise.resolve({ data: null, error: null }),
    then: empty.then.bind(empty),
    catch: empty.catch.bind(empty),
  });
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () =>
        Promise.resolve({ error: { message: "Supabase is not configured (.env.local)." } }),
      signUp: () =>
        Promise.resolve({ error: { message: "Supabase is not configured (.env.local)." } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => query(),
  };
}

export const createClient = () => {
  if (!hasSupabaseEnv()) return createStubClient();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
};
