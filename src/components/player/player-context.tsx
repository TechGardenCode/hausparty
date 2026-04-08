"use client";

import { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type { Source } from "@/lib/types/database";

interface PlayerState {
  status: "idle" | "active";
  source: Source | null;
  setSlug: string | null;
  setTitle: string | null;
  thumbnailUrl: string | null;
  autoplay: boolean;
  isLoading: boolean;
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
  | { type: "LOADED" }
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
  markLoaded: () => void;
}

const initialState: PlayerState = {
  status: "idle",
  source: null,
  setSlug: null,
  setTitle: null,
  thumbnailUrl: null,
  autoplay: false,
  isLoading: false,
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
        isLoading: true,
      };
    case "LOADED":
      return { ...state, isLoading: false };
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

  const markLoaded = useCallback(() => {
    dispatch({ type: "LOADED" });
  }, []);

  // MediaSession: publish metadata and wire transport controls to the player.
  // Note: our audio/video lives inside a cross-origin iframe (YouTube /
  // SoundCloud), so the parent page does not own an audio focus session and
  // the OS lockscreen controls will only fire when the user is already
  // playing via our bridge. Metadata still shows up in browsers that surface
  // it (tab media indicator, macOS Now Playing for some sources). Native
  // <audio> sources would get full lockscreen controls for free.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;

    if (state.status !== "active" || !state.source) {
      ms.metadata = null;
      ms.playbackState = "none";
      return;
    }

    ms.metadata = new MediaMetadata({
      title: state.setTitle ?? "hausparty",
      artist: state.source.platform === "youtube" ? "YouTube" : "SoundCloud",
      album: "hausparty",
      artwork: state.thumbnailUrl
        ? [{ src: state.thumbnailUrl, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
    ms.playbackState = "playing";

    const handlePause = () => {
      dispatch({ type: "STOP" });
    };

    try {
      ms.setActionHandler("pause", handlePause);
      ms.setActionHandler("stop", handlePause);
      // play/previous/next intentionally unset — we can't drive the iframe
      // from the parent page, and declaring unsupported handlers is worse
      // than letting the OS grey them out.
      ms.setActionHandler("play", null);
      ms.setActionHandler("previoustrack", null);
      ms.setActionHandler("nexttrack", null);
    } catch {
      // Safari < 15 throws on unsupported actions — swallow.
    }

    return () => {
      try {
        ms.setActionHandler("pause", null);
        ms.setActionHandler("stop", null);
      } catch {
        // ignore
      }
    };
  }, [state.status, state.source, state.setTitle, state.thumbnailUrl]);

  return (
    <PlayerContext.Provider value={{ state, play, stop, markLoaded }}>
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
