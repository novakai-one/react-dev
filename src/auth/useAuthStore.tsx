// ── Auth store ───────────────────────────────────────────────────────────────
// Single source of truth for "is someone signed in". Mirrors Supabase's auth
// session into zustand so components can react to it.
//
// The onAuthStateChange listener is wired once, at module load — it fires on the
// initial session restore, on sign-in, and on sign-out, so we never poll.
// status starts "loading" until that first event lands.

import { create } from "zustand"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"

type AuthStatus = "loading" | "signed-in" | "signed-out"

interface AuthStore {
    status: AuthStatus
    session: Session | null
    user: User | null
    // Email + password sign in. Returns an error message, or null on success.
    signIn: (email: string, password: string) => Promise<string | null>
    // Create an account. With email confirmation OFF (see SUPABASE_SETUP.md) the
    // session is established immediately; otherwise the user must confirm by email
    // before a session exists — signUpResult.session is null until then.
    signUp: (email: string, password: string) => Promise<string | null>
    signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>(() => ({
    status: "loading",
    session: null,
    user: null,

    signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return error ? error.message : null
    },

    signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) return error.message
        // No session back means email confirmation is on — tell the caller.
        if (!data.session) return "Check your email to confirm your account, then sign in."
        return null
    },

    signOut: async () => {
        await supabase.auth.signOut()
    },
}))

// Wire the listener once. setSession runs on first load (session restore),
// on sign-in, and on sign-out.
function setSession(session: Session | null): void {
    useAuthStore.setState({
        session,
        user: session?.user ?? null,
        status: session ? "signed-in" : "signed-out",
    })
}

supabase.auth.getSession().then(({ data }) => setSession(data.session))
supabase.auth.onAuthStateChange((_event, session) => setSession(session))
