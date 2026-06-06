"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sk_merchant_follows_v1";

export interface FollowRecord {
  slug: string;
  name: string;
  followedAt: number;
}

export function useMerchantFollows() {
  const [follows, setFollows] = useState<FollowRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFollows(
            parsed.filter(
              (r): r is FollowRecord =>
                r && typeof r.slug === "string" && typeof r.name === "string",
            ),
          );
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(follows));
    } catch {
      /* ignore */
    }
  }, [follows, hydrated]);

  const isFollowing = useCallback(
    (slug: string) => follows.some((f) => f.slug === slug),
    [follows],
  );

  const follow = useCallback((slug: string, name: string) => {
    setFollows((prev) => {
      if (prev.some((f) => f.slug === slug)) return prev;
      return [{ slug, name, followedAt: Date.now() }, ...prev];
    });
  }, []);

  const unfollow = useCallback((slug: string) => {
    setFollows((prev) => prev.filter((f) => f.slug !== slug));
  }, []);

  const toggle = useCallback(
    (slug: string, name: string): boolean => {
      if (follows.some((f) => f.slug === slug)) {
        setFollows((prev) => prev.filter((f) => f.slug !== slug));
        return false;
      }
      setFollows((prev) => [{ slug, name, followedAt: Date.now() }, ...prev]);
      return true;
    },
    [follows],
  );

  const clearAll = useCallback(() => setFollows([]), []);

  return {
    follows,
    count: follows.length,
    slugs: follows.map((f) => f.slug),
    isFollowing,
    follow,
    unfollow,
    toggle,
    clearAll,
    hydrated,
  };
}
