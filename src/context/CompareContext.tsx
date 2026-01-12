"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { PlayerPosition } from "@/lib/types";

// Minimal player data for selection (avoid full PlayerNormalized to reduce memory)
export interface ComparePlayer {
  id: number;
  name: string;
  teamShortName: string;
  position: PlayerPosition;
}

interface CompareContextValue {
  selectedA: ComparePlayer | null;
  selectedB: ComparePlayer | null;
  selectPlayer: (player: ComparePlayer) => void;
  remove: (id: number) => void;
  clear: () => void;
  swap: () => void;
  setFromIds: (a: number, b: number) => void;
  isSelected: (id: number) => boolean;
  canSelect: () => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selectedA, setSelectedA] = useState<ComparePlayer | null>(null);
  const [selectedB, setSelectedB] = useState<ComparePlayer | null>(null);

  const selectPlayer = useCallback((player: ComparePlayer) => {
    // Prevent duplicate selection
    if (selectedA?.id === player.id || selectedB?.id === player.id) {
      // Deselect if already selected
      if (selectedA?.id === player.id) {
        setSelectedA(selectedB);
        setSelectedB(null);
      } else {
        setSelectedB(null);
      }
      return;
    }

    // Fill A first, then B
    if (!selectedA) {
      setSelectedA(player);
    } else if (!selectedB) {
      setSelectedB(player);
    } else {
      // Both set - replace A (cycle: A→B becomes B, new becomes A)
      setSelectedA(selectedB);
      setSelectedB(player);
    }
  }, [selectedA, selectedB]);

  const remove = useCallback((id: number) => {
    if (selectedA?.id === id) {
      setSelectedA(selectedB);
      setSelectedB(null);
    } else if (selectedB?.id === id) {
      setSelectedB(null);
    }
  }, [selectedA, selectedB]);

  const clear = useCallback(() => {
    setSelectedA(null);
    setSelectedB(null);
  }, []);

  const swap = useCallback(() => {
    const temp = selectedA;
    setSelectedA(selectedB);
    setSelectedB(temp);
  }, [selectedA, selectedB]);

  const setFromIds = useCallback((a: number, b: number) => {
    // This will be called from Compare page to sync URL params
    // We only have IDs here, so we just set placeholder data
    // The actual player names will be loaded when the player data is fetched
    if (a && !selectedA) {
      setSelectedA({ id: a, name: `Player ${a}`, teamShortName: "", position: "MID" });
    }
    if (b && !selectedB) {
      setSelectedB({ id: b, name: `Player ${b}`, teamShortName: "", position: "MID" });
    }
  }, [selectedA, selectedB]);

  const isSelected = useCallback((id: number) => {
    return selectedA?.id === id || selectedB?.id === id;
  }, [selectedA, selectedB]);

  const canSelect = useCallback(() => {
    return !selectedA || !selectedB;
  }, [selectedA, selectedB]);

  return (
    <CompareContext.Provider
      value={{
        selectedA,
        selectedB,
        selectPlayer,
        remove,
        clear,
        swap,
        setFromIds,
        isSelected,
        canSelect,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompareSelection() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompareSelection must be used within CompareProvider");
  }
  return context;
}
