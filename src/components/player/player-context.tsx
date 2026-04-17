"use client";

import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import type { Source } from "@/lib/types/database";
import {
  CLIENT_HEARTBEAT_MS,
  SERVER_HEARTBEAT_MS,
  sendHeartbeat,
} from "@/lib/player/heartbeat";
import {
  writeResume,
  clearResume,
  type ResumeEntry,
} from "@/lib/hooks/use-resume";

interface PlayerState {
  status: "idle" | "active";
  source: Source | null;
  setSlug: string | null;
  setTitle: string | null;
  thumbnailUrl: string | null;
  autoplay: boolean;
  isLoading: boolean;
  startedAt: number | null;
  startPositionSeconds: number;
}

type PlayerAction =
  | {
      type: "PLAY";
      source: Source;
      setSlug: string;
      setTitle: string;
      thumbnailUrl: string | null;
      autoplay: boolean;
      startPositionSeconds: number;
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
    autoplay?: boolean,
    startPositionSeconds?: number
  ) => void;
  stop: () => void;
  markLoaded: () => void;
  registerPositionGetter: (getter: (() => number | null) | null) => void;
}

const initialState: PlayerState = {
  status: "idle",
  source: null,
  setSlug: null,
  setTitle: null,
  thumbnailUrl: null,
  autoplay: false,
  isLoading: false,
  startedAt: null,
  startPositionSeconds: 0,
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
        startedAt: Date.now(),
        startPositionSeconds: action.startPositionSeconds ?? 0,
      };
    case "LOADED":
      return { ...state, isLoading: false };
    case "STOP":
      return initialState;
    default:
      return state;
  }
}

/**
 * Position in seconds. Prefers the media-bridge getter (true iframe currentTime
 * from the YT / SC APIs) and falls back to wall-clock elapsed from PLAY while
 * the bridge is still warming up (iframe mount → onReady typically ~300–800ms).
 */
function currentPosition(
  state: PlayerState,
  bridgeGetter: (() => number | null) | null
): number {
  const bridge = bridgeGetter?.();
  if (typeof bridge === "number" && Number.isFinite(bridge) && bridge >= 0) {
    return Math.floor(bridge);
  }
  if (state.startedAt == null) return state.startPositionSeconds;
  return (
    state.startPositionSeconds +
    Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000))
  );
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Track last server-flushed wall-clock time. When `Date.now() - lastServer`
  // exceeds SERVER_HEARTBEAT_MS, the client-side heartbeat tick also posts.
  const lastServerFlushRef = useRef<number>(0);

  // Set by PersistentIframe once the YT / SC media bridge fires onReady.
  // Cleared on unmount / source change. Heartbeat reads through this and
  // falls back to wall-clock when null.
  const positionGetterRef = useRef<(() => number | null) | null>(null);
  const registerPositionGetter = useCallback(
    (getter: (() => number | null) | null) => {
      positionGetterRef.current = getter;
    },
    []
  );

  const play = useCallback(
    (
      source: Source,
      setSlug: string,
      setTitle: string,
      thumbnailUrl: string | null,
      autoplay = false,
      startPositionSeconds = 0
    ) => {
      dispatch({
        type: "PLAY",
        source,
        setSlug,
        setTitle,
        thumbnailUrl,
        autoplay,
        startPositionSeconds,
      });
    },
    []
  );

  const stop = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "active" && s.source && s.setSlug && s.startedAt != null) {
      sendHeartbeat(
        {
          setSlug: s.setSlug,
          sourceId: s.source.id,
          platform: s.source.platform,
          startedAtISO: new Date(s.startedAt).toISOString(),
          positionSeconds: currentPosition(s, positionGetterRef.current),
          event: "end",
        },
        false
      );
    }
    clearResume();
    positionGetterRef.current = null;
    dispatch({ type: "STOP" });
  }, []);

  const markLoaded = useCallback(() => {
    dispatch({ type: "LOADED" });
  }, []);

  // Fire a `start` heartbeat once per new play session so the server records
  // `(user_id, set_id, started_at)` immediately, not on the first 30s flush.
  useEffect(() => {
    if (
      state.status !== "active" ||
      !state.source ||
      !state.setSlug ||
      state.startedAt == null
    ) {
      return;
    }
    lastServerFlushRef.current = Date.now();
    sendHeartbeat({
      setSlug: state.setSlug,
      sourceId: state.source.id,
      platform: state.source.platform,
      startedAtISO: new Date(state.startedAt).toISOString(),
      positionSeconds: state.startPositionSeconds,
      event: "start",
    });
  }, [
    state.status,
    state.source,
    state.setSlug,
    state.startedAt,
    state.startPositionSeconds,
  ]);

  // Client heartbeat tick: writes localStorage every 5s and forwards to server
  // on 30s boundaries.
  useEffect(() => {
    if (state.status !== "active") return;

    const interval = window.setInterval(() => {
      const s = stateRef.current;
      if (
        s.status !== "active" ||
        !s.source ||
        !s.setSlug ||
        s.startedAt == null
      ) {
        return;
      }

      const position = currentPosition(s, positionGetterRef.current);
      const entry: ResumeEntry = {
        setSlug: s.setSlug,
        setTitle: s.setTitle ?? s.setSlug,
        thumbnailUrl: s.thumbnailUrl,
        platform: s.source.platform,
        sourceId: s.source.id,
        positionSeconds: position,
        updatedAt: Date.now(),
      };
      writeResume(entry);

      if (Date.now() - lastServerFlushRef.current >= SERVER_HEARTBEAT_MS) {
        lastServerFlushRef.current = Date.now();
        sendHeartbeat({
          setSlug: s.setSlug,
          sourceId: s.source.id,
          platform: s.source.platform,
          startedAtISO: new Date(s.startedAt).toISOString(),
          positionSeconds: position,
          event: "heartbeat",
        });
      }
    }, CLIENT_HEARTBEAT_MS);

    return () => window.clearInterval(interval);
  }, [state.status]);

  // Flush a final server beat on tab-hide / pagehide. `sendBeacon` is the only
  // transport browsers guarantee to complete during unload.
  useEffect(() => {
    if (state.status !== "active") return;
    const handleHide = () => {
      const s = stateRef.current;
      if (
        s.status !== "active" ||
        !s.source ||
        !s.setSlug ||
        s.startedAt == null
      ) {
        return;
      }
      sendHeartbeat(
        {
          setSlug: s.setSlug,
          sourceId: s.source.id,
          platform: s.source.platform,
          startedAtISO: new Date(s.startedAt).toISOString(),
          positionSeconds: currentPosition(s, positionGetterRef.current),
          event: "end",
        },
        true
      );
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") handleHide();
    };
    window.addEventListener("pagehide", handleHide);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", handleHide);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [state.status]);

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
    <PlayerContext.Provider
      value={{ state, play, stop, markLoaded, registerPositionGetter }}
    >
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
