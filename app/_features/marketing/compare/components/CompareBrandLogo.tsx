"use client";

import { useEffect, useRef, useState } from "react";

type CompareBrandLogoProps = {
  /** Pre-built CDN URLs from a server component — keeps SSR and hydration in sync. */
  candidates: string[];
  alt?: string;
  fallbackLabel?: string;
  wrapperClassName?: string;
  imgClassName?: string;
  fallbackClassName?: string;
};

/** Brandfetch can return a 200 transparent placeholder — treat tiny images as a miss. */
function isLikelyEmptyAsset(img: HTMLImageElement): boolean {
  return img.naturalWidth <= 8 || img.naturalHeight <= 8;
}

function isLocalCompareLogo(src: string): boolean {
  return src.startsWith("/compare/logos/");
}

export function CompareBrandLogo({
  candidates,
  alt = "",
  fallbackLabel,
  wrapperClassName,
  imgClassName,
  fallbackClassName = "text-2xl font-semibold text-muted-foreground/60",
}: CompareBrandLogoProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (candidates.length === 0) {
      setShowFallback(Boolean(fallbackLabel));
      return;
    }

    const src = candidates[candidateIndex];
    if (resolvedSrc === src) {
      return;
    }

    const img = imgRef.current;
    if (!img) {
      return;
    }

    const advanceOrFallback = () => {
      setCandidateIndex((current) => {
        if (current >= candidates.length - 1) {
          setShowFallback(Boolean(fallbackLabel));
          return current;
        }
        return current + 1;
      });
    };

    const evaluateLoaded = () => {
      if (isLikelyEmptyAsset(img)) {
        advanceOrFallback();
        return;
      }

      if (src && isLocalCompareLogo(src)) {
        setResolvedSrc(src);
      }
    };

    const handleError = () => {
      advanceOrFallback();
    };

    img.addEventListener("load", evaluateLoaded);
    img.addEventListener("error", handleError);

    if (img.complete) {
      if (img.naturalWidth === 0) {
        handleError();
      } else {
        evaluateLoaded();
      }
    }

    return () => {
      img.removeEventListener("load", evaluateLoaded);
      img.removeEventListener("error", handleError);
    };
  }, [candidateIndex, candidates, fallbackLabel, resolvedSrc]);

  if (candidates.length === 0 || showFallback) {
    if (!fallbackLabel) {
      return null;
    }

    return (
      <div className={wrapperClassName}>
        <span className={fallbackClassName} aria-hidden>
          {fallbackLabel.slice(0, 1)}
        </span>
      </div>
    );
  }

  const src = candidates[candidateIndex] ?? candidates[0];

  return (
    <div className={wrapperClassName}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={imgClassName}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
