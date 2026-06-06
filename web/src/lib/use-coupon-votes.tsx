"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sk_coupon_votes_v1";

export type VoteValue = "works" | "expired";

interface VoteEntry {
  vote: VoteValue;
  votedAt: number;
}

type VoteMap = Record<number, VoteEntry>;

export function useCouponVotes() {
  const [votes, setVotes] = useState<VoteMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setVotes(parsed);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
    } catch {
      /* ignore */
    }
  }, [votes, hydrated]);

  const getVote = useCallback(
    (couponId: number): VoteValue | null => votes[couponId]?.vote ?? null,
    [votes],
  );

  const setVote = useCallback((couponId: number, vote: VoteValue) => {
    setVotes((prev) => ({
      ...prev,
      [couponId]: { vote, votedAt: Date.now() },
    }));
  }, []);

  const clearVote = useCallback((couponId: number) => {
    setVotes((prev) => {
      const next = { ...prev };
      delete next[couponId];
      return next;
    });
  }, []);

  const stats = useCallback(() => {
    const all = Object.values(votes);
    return {
      total: all.length,
      works: all.filter((v) => v.vote === "works").length,
      expired: all.filter((v) => v.vote === "expired").length,
    };
  }, [votes]);

  return { getVote, setVote, clearVote, stats, hydrated };
}
