"use client";

import { useCallback, useRef, useState } from "react";
import type { HqBriefingData } from "@/app/_features/plays/types";
import type { HqSideRailData } from "../types";
import type { DailyBriefing } from "../briefing/types";
import {
  generateBriefingScript,
  generateBriefingScriptFromDaily,
  estimateDuration,
} from "../utils/briefing-script";

type AudioState = "idle" | "loading" | "playing" | "paused" | "error";

const CACHE_KEY_PREFIX = "salt-briefing-audio-v5-";

/**
 * Cheap stable hash so the cached audio is keyed to the exact script text.
 * Without this, a same-day data refresh kept playing the old recording
 * while the page showed the new briefing.
 */
function hashScript(script: string): string {
  let hash = 5381;
  for (let i = 0; i < script.length; i++) {
    hash = ((hash << 5) + hash + script.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function getTodayKey(script: string): string {
  const date = new Date();
  return `${CACHE_KEY_PREFIX}${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${hashScript(script)}`;
}

function getCachedAudio(script: string): string | null {
  if (typeof window === "undefined") return null;
  const key = getTodayKey(script);

  // Clear old cache entries
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith(CACHE_KEY_PREFIX) && k !== key) {
      localStorage.removeItem(k);
    }
  });

  const cached = localStorage.getItem(key);

  // Validate it's a proper data URL
  if (cached && !cached.startsWith("data:audio/")) {
    localStorage.removeItem(key);
    return null;
  }

  return cached;
}

function setCachedAudio(script: string, dataUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getTodayKey(script), dataUrl);
  } catch {
    // localStorage full or unavailable - continue without caching
  }
}

function clearCachedAudio(script: string): void {
  if (typeof window === "undefined") return;
  const key = getTodayKey(script);
  localStorage.removeItem(key);
}

export function useBriefingAudio(
  userName: string,
  briefing: HqBriefingData,
  sideRail: HqSideRailData,
  dailyBriefing?: DailyBriefing | null
) {
  const [state, setState] = useState<AudioState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // When a stored daily briefing exists, read exactly what the hero shows.
  // The template script is the fallback for days without a generated briefing.
  const script = dailyBriefing
    ? generateBriefingScriptFromDaily(userName, dailyBriefing)
    : generateBriefingScript(userName, briefing, sideRail);
  const estimatedSeconds = durationSeconds > 0 ? Math.ceil(durationSeconds) : estimateDuration(script);

  const detachAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.ontimeupdate = null;
    audio.onloadedmetadata = null;
    audio.onended = null;
    audio.oncanplaythrough = null;
    audio.onerror = null;
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      detachAudioListeners(audioRef.current);
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setAudioElement(null);
    setCurrentSeconds(0);
    setDurationSeconds(0);
    setState("idle");
  }, [detachAudioListeners]);

  const play = useCallback(async () => {
    // If already playing, pause
    if (state === "playing" && audioRef.current) {
      audioRef.current.pause();
      setState("paused");
      return;
    }

    // If paused, resume
    if (state === "paused" && audioRef.current) {
      await audioRef.current.play();
      setState("playing");
      return;
    }

    setState("loading");
    setError(null);

    try {
      // Check cache first
      const cachedDataUrl = getCachedAudio(script);
      let audioBlob: Blob;

      if (cachedDataUrl) {
        // Convert cached data URL back to blob
        const [header, base64] = cachedDataUrl.split(",");
        const mimeMatch = header?.match(/:(.*?);/);
        const mime = mimeMatch?.[1] ?? "audio/mpeg";
        const binary = atob(base64 ?? "");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: mime });
      } else {
        // Fetch from API
        const response = await fetch("/api/briefing/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: script }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to generate audio");
        }

        audioBlob = await response.blob();
      }

      // Debug: log blob info
      console.log("[briefing audio] blob size:", audioBlob.size, "type:", audioBlob.type);

      if (audioBlob.size === 0) {
        throw new Error("Received empty audio data");
      }

      // Convert blob to data URL (avoids blob: URL security restrictions)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to convert audio to data URL"));
          }
        };
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(audioBlob);
      });

      // Cache for later
      setCachedAudio(script, dataUrl);

      const audio = new Audio();
      audioRef.current = audio;
      setAudioElement(audio);

      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setDurationSeconds(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        setCurrentSeconds(audio.currentTime);
      };

      // Set up event handlers before setting src
      const playPromise = new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => {
          console.log("[briefing audio] ready to play");
          resolve();
        };
        audio.onerror = () => {
          const errorCode = audio.error?.code;
          const errorMsg = audio.error?.message ?? "Unknown audio error";
          console.error("[briefing audio] load error:", errorCode, errorMsg);
          reject(new Error(`Audio load failed: ${errorMsg}`));
        };
      });

      audio.onended = () => {
        setCurrentSeconds(0);
        setState("idle");
        detachAudioListeners(audio);
        audioRef.current = null;
        setAudioElement(null);
      };

      // Set source and load
      audio.src = dataUrl;
      audio.load();

      // Wait for ready
      await playPromise;

      // Play
      await audio.play();
      setState("playing");
    } catch (err) {
      console.error("[briefing audio] error:", err);
      clearCachedAudio(script); // Clear potentially corrupted cache
      setState("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [state, script, detachAudioListeners]);

  const togglePause = useCallback(async () => {
    if (!audioRef.current) return;

    if (state === "playing") {
      audioRef.current.pause();
      setState("paused");
      return;
    }

    if (state === "paused") {
      await audioRef.current.play();
      setState("playing");
    }
  }, [state]);

  return {
    state,
    error,
    estimatedSeconds,
    durationSeconds,
    currentSeconds,
    audioElement,
    script,
    play,
    stop,
    togglePause,
  };
}
