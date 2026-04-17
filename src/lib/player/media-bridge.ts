"use client";

/**
 * Bridges between our PlayerProvider and the cross-origin YouTube / SoundCloud
 * iframes. Exposes a uniform read of current position (seconds) and dispatches
 * a callback when the underlying media reaches the end.
 *
 * Two realities the caller has to live with:
 *   - Scripts load from third-party origins and can stall. `createMediaBridge`
 *     resolves only after the embed reports "ready" — callers should handle
 *     this as an async init and fall back to wall-clock while awaiting.
 *   - Pause / seek are observable via position polling, not state events, so
 *     the bridge only surfaces the "ended" lifecycle. Pause freezes the
 *     position naturally; seek reports the new position on the next read.
 */

interface YTPlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YTConstructor {
  Player: new (
    element: HTMLIFrameElement,
    config: { events: Record<string, (e: { data: number }) => void> }
  ) => YTPlayer;
  PlayerState: { ENDED: number };
}

interface SCWidget {
  bind: (event: string, handler: (data?: unknown) => void) => void;
  unbind: (event: string) => void;
  seekTo: (milliseconds: number) => void;
}

interface SCNamespace {
  Widget: ((iframe: HTMLIFrameElement) => SCWidget) & {
    Events: Record<"PLAY_PROGRESS" | "FINISH" | "READY", string>;
  };
}

declare global {
  interface Window {
    YT?: YTConstructor;
    SC?: SCNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface MediaBridge {
  getPosition: () => number | null;
  dispose: () => void;
}

export interface MediaBridgeHandlers {
  onEnded?: () => void;
  onReady?: () => void;
  /**
   * Seconds to jump to once the underlying player is ready. YouTube's
   * `start=` URL param handles this for us; SoundCloud ignores the `#t=Ns`
   * hash when `SC.Widget()` wraps the iframe, so the bridge has to call
   * `widget.seekTo()` explicitly.
   */
  startSeconds?: number;
}

let ytApiReady: Promise<void> | null = null;
let scApiReady: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (ytApiReady) return ytApiReady;
  ytApiReady = new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => reject(new Error("YouTube IFrame API failed to load"));
    document.head.appendChild(script);
  });
  return ytApiReady;
}

function loadSoundCloudApi(): Promise<void> {
  if (scApiReady) return scApiReady;
  scApiReady = new Promise<void>((resolve, reject) => {
    if (window.SC?.Widget) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      'script[src="https://w.soundcloud.com/player/api.js"]'
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("SoundCloud API failed to load")),
        { once: true }
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("SoundCloud API failed to load"));
    document.head.appendChild(script);
  });
  return scApiReady;
}

export async function createMediaBridge(
  iframe: HTMLIFrameElement,
  platform: "youtube" | "soundcloud",
  handlers: MediaBridgeHandlers = {}
): Promise<MediaBridge> {
  if (platform === "youtube") {
    await loadYouTubeApi();
    const YT = window.YT;
    if (!YT) throw new Error("YT global missing after load");

    let lastKnownPosition = 0;
    return new Promise<MediaBridge>((resolve) => {
      const player = new YT.Player(iframe, {
        events: {
          onReady: () => {
            handlers.onReady?.();
            resolve({
              getPosition: () => {
                try {
                  const t = player.getCurrentTime();
                  if (typeof t === "number" && Number.isFinite(t) && t >= 0) {
                    lastKnownPosition = t;
                    return t;
                  }
                  return lastKnownPosition;
                } catch {
                  return lastKnownPosition;
                }
              },
              dispose: () => {
                try {
                  player.destroy();
                } catch {
                  // iframe may already be detached — ignore
                }
              },
            });
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.ENDED) handlers.onEnded?.();
          },
        },
      });
    });
  }

  if (platform === "soundcloud") {
    await loadSoundCloudApi();
    const SC = window.SC;
    if (!SC) throw new Error("SC global missing after load");

    const widget = SC.Widget(iframe);
    let lastKnownPosition = 0;
    let disposed = false;

    return new Promise<MediaBridge>((resolve) => {
      widget.bind(SC.Widget.Events.READY, () => {
        handlers.onReady?.();
        if (handlers.startSeconds && handlers.startSeconds > 0) {
          try {
            widget.seekTo(Math.floor(handlers.startSeconds) * 1000);
            lastKnownPosition = Math.floor(handlers.startSeconds);
          } catch {
            // widget not ready / older API — ignore, widget will start at 0
          }
        }
        widget.bind(SC.Widget.Events.PLAY_PROGRESS, (data) => {
          if (disposed) return;
          const payload = data as { currentPosition?: number } | undefined;
          if (payload && typeof payload.currentPosition === "number") {
            lastKnownPosition = payload.currentPosition / 1000;
          }
        });
        widget.bind(SC.Widget.Events.FINISH, () => handlers.onEnded?.());
        resolve({
          getPosition: () => lastKnownPosition,
          dispose: () => {
            disposed = true;
            try {
              widget.unbind(SC.Widget.Events.PLAY_PROGRESS);
              widget.unbind(SC.Widget.Events.FINISH);
              widget.unbind(SC.Widget.Events.READY);
            } catch {
              // ignore
            }
          },
        });
      });
    });
  }

  throw new Error(`Unknown platform: ${platform}`);
}
