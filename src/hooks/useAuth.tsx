import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { OFFLINE_KEYS, cacheMedia, offlineFirst, readCached } from "@/lib/offline/store";
import {
  getOfflineSession,
  getOfflineSessionAsync,
  setOfflineSession,
} from "@/lib/offline/credentials";
import { isOnlineNow } from "@/lib/offline/connectivity";

type ProfileSummary = {
  display_name: string | null;
  avatar_url: string | null;
};

function nameFromUser(user: User | null) {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : null;
  return name?.trim() || user.email?.split("@")[0] || null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile(authUser: User | null) {
      if (!authUser) {
        if (active) setProfile(null);
        return;
      }
      // Offline-first: header/avatar/name must render with no connection.
      const data = await offlineFirst<ProfileSummary | null>(
        OFFLINE_KEYS.profile,
        async () => {
          const { data: row } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", authUser.id)
            .maybeSingle();
          return (row as ProfileSummary | null) ?? null;
        },
        authUser.id,
      ).catch(() => null);
      if (active) setProfile(data ?? null);
      if (data) {
        const avatarUrl = data.avatar_url ? await cacheMedia(data.avatar_url, authUser.id) : null;
        await setOfflineSession({
          id: authUser.id,
          email: authUser.email ?? null,
          displayName: data.display_name?.trim() || nameFromUser(authUser),
          avatarUrl: avatarUrl ?? data.avatar_url,
        });
      }
    }

    async function applyOfflineFallback() {
      const cached = (await getOfflineSessionAsync()) ?? getOfflineSession();
      if (!cached || !active) return false;
      setUser({
        id: cached.user.id,
        email: cached.user.email ?? undefined,
        user_metadata: {
          full_name: cached.user.displayName ?? undefined,
          avatar_url: cached.user.avatarUrl ?? undefined,
        },
      } as unknown as User);
      const cachedProfile = await readCached<ProfileSummary>(OFFLINE_KEYS.profile, cached.user.id);
      if (active) {
        setProfile(
          cachedProfile ?? {
            display_name: cached.user.displayName,
            avatar_url: cached.user.avatarUrl ?? null,
          },
        );
      }
      return true;
    }

    void applyOfflineFallback().then((restored) => {
      if (restored && active) setLoading(false);
    });

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setLoading(false);
          setOfflineSession({
            id: data.session.user.id,
            email: data.session.user.email ?? null,
            displayName: nameFromUser(data.session.user),
          });
          void loadProfile(data.session.user);
        } else {
          const restored = await applyOfflineFallback();
          if (!restored && active) {
            setSession(null);
            setUser(null);
          }
          if (active) setLoading(false);
        }
      })
      .catch(async () => {
        await applyOfflineFallback();
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!active) return;
      if (!s && getOfflineSession()) {
        // Keep the offline member signed in when the network drops.
        if (!isOnlineNow()) return;
      }
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        setOfflineSession({
          id: s.user.id,
          email: s.user.email ?? null,
          displayName: nameFromUser(s.user),
        });
      }
      void loadProfile(s?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const displayName = profile?.display_name?.trim() || nameFromUser(user);

  return { session, user, profile, displayName, loading };
}
