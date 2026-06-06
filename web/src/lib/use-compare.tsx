"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Coupon } from "@/lib/types";

const MAX_COMPARE = 4;

interface UseCompareResult {
  selected: Coupon[];
  selectedIds: Set<number>;
  count: number;
  isSelected: (id: number) => boolean;
  isFull: boolean;
  toggle: (coupon: Coupon) => boolean; // returns new selected state
  remove: (id: number) => void;
  clear: () => void;
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const CompareCtx = createContext<UseCompareResult | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);

  const selectedIds = useMemo(() => new Set(selected.map((c) => c.id)), [selected]);

  const isSelected = useCallback((id: number) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((coupon: Coupon): boolean => {
    let nowSelected = false;
    setSelected((prev) => {
      if (prev.some((c) => c.id === coupon.id)) {
        return prev.filter((c) => c.id !== coupon.id);
      }
      if (prev.length >= MAX_COMPARE) {
        // silently ignore — UI should disable button
        return prev;
      }
      nowSelected = true;
      return [...prev, coupon];
    });
    return nowSelected;
  }, []);

  const remove = useCallback((id: number) => {
    setSelected((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
    setShowModal(false);
  }, []);

  const openModal = useCallback(() => {
    if (selected.length >= 2) setShowModal(true);
  }, [selected.length]);

  const closeModal = useCallback(() => setShowModal(false), []);

  const value = useMemo<UseCompareResult>(
    () => ({
      selected,
      selectedIds,
      count: selected.length,
      isSelected,
      isFull: selected.length >= MAX_COMPARE,
      toggle,
      remove,
      clear,
      showModal,
      openModal,
      closeModal,
    }),
    [selected, selectedIds, isSelected, toggle, remove, clear, showModal, openModal, closeModal],
  );

  return <CompareCtx.Provider value={value}>{children}</CompareCtx.Provider>;
}

export function useCompare(): UseCompareResult {
  const ctx = useContext(CompareCtx);
  if (!ctx) {
    // Fallback: return inert stub so components rendered outside provider don't crash
    return {
      selected: [],
      selectedIds: new Set(),
      count: 0,
      isSelected: () => false,
      isFull: false,
      toggle: () => false,
      remove: () => {},
      clear: () => {},
      showModal: false,
      openModal: () => {},
      closeModal: () => {},
    };
  }
  return ctx;
}

export const COMPARE_LIMIT = MAX_COMPARE;
