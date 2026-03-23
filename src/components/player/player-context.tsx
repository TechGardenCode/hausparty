"use client";

import { createContext, useContext, useReducer, useCallback } from "react";
import type { Source } from "@/lib/types/database";

interface PlayerState {
  status: "idle" | "active";
  source: Source | null;
  setSlug: string | null;
  setTitle: string | null;
  thumbnailUrl: string | null;
  autoplay: boolean;
}

type PlayerAction =
  | {
      type: "PLAY";
      source: Source;
      setSlug: string;
      setTitle: string;
      thumbnailUrl: string | null;
      autoplay: boolean;
    }
  | { type: "STOP" };

interface PlayerContextValue {
  state: PlayerState;
  play: (
    source: Source,
    setSlug: string,
    setTitle: string,
    thumbnailUrl: string | null,
    autoplay?: boolean
  ) => void;
  stop: () => void;
}

const initialState: PlayerState = {
  status: "idle",
  source: null,
  setSlug: null,
  setTitle: null,
  thumbnailUrl: null,
  autoplay: false,
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "PLAY":
      return {
        status: "active",
        source: action.source,
        setSlug: action.setSlug,
        setTitle: action.setTitle,
        thumbnailUrl: action.thumbnailUrl,
        autoplay: action.autoplay,
      };
    case "STOP":
      return initialState;
    default:
      return state;
  }
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);

  const play = useCallback(
    (
      source: Source,
      setSlug: string,
      setTitle: string,
      thumbnailUrl: string | null,
      autoplay = false
    ) => {
      dispatch({ type: "PLAY", source, setSlug, setTitle, thumbnailUrl, autoplay });
    },
    []
  );

  const stop = useCallback(() => {
    dispatch({ type: "STOP" });
  }, []);

  return (
    <PlayerContext.Provider value={{ state, play, stop }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return ctx;
}
