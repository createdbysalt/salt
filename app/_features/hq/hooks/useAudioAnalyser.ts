"use client";

import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 28;
const IDLE_BAR = 0.1;

function initialBars(): number[] {
  return Array.from({ length: BAR_COUNT }, () => IDLE_BAR);
}

function averageLevel(data: Uint8Array): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    sum += data[i] ?? 0;
  }
  return sum / data.length / 255;
}

export function useAudioAnalyser(
  audioElement: HTMLAudioElement | null,
  isActive: boolean,
) {
  const [bars, setBars] = useState<number[]>(initialBars);
  const [level, setLevel] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedElementRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!audioElement || !isActive) {
      setBars(initialBars());
      setLevel(0);
      return;
    }

    let cancelled = false;

    const start = async () => {
      if (!contextRef.current) {
        contextRef.current = new AudioContext();
      }

      const context = contextRef.current;
      if (context.state === "suspended") {
        await context.resume();
      }

      if (!analyserRef.current) {
        const analyser = context.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;
        analyserRef.current = analyser;
      }

      if (connectedElementRef.current !== audioElement) {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
        sourceRef.current = context.createMediaElementSource(audioElement);
        sourceRef.current.connect(analyserRef.current!);
        analyserRef.current!.connect(context.destination);
        connectedElementRef.current = audioElement;
      }

      const analyser = analyserRef.current!;
      const bufferLength = analyser.frequencyBinCount;
      const data = new Uint8Array(bufferLength);

      const tick = () => {
        if (cancelled) return;

        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(bufferLength / BAR_COUNT));
        const nextBars = Array.from({ length: BAR_COUNT }, (_, index) => {
          const startIndex = index * step;
          const endIndex = Math.min(startIndex + step, bufferLength);
          let sum = 0;
          for (let i = startIndex; i < endIndex; i += 1) {
            sum += data[i] ?? 0;
          }
          const avg = sum / (endIndex - startIndex);
          return Math.max(IDLE_BAR, avg / 255);
        });

        setBars(nextBars);
        setLevel(averageLevel(data));
        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
    };
  }, [audioElement, isActive]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      void contextRef.current?.close();
      contextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
      connectedElementRef.current = null;
    };
  }, []);

  return { bars, level };
}
