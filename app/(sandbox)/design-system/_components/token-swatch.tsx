"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "./copy-button";

interface TokenSwatchProps {
  name: string;
  variable: string;
  usage: string;
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function getComputedColor(variable: string): { computed: string; hex: string } {
  if (typeof window === "undefined") {
    return { computed: "", hex: "" };
  }
  
  const tempEl = document.createElement("div");
  tempEl.style.color = `var(${variable})`;
  document.body.appendChild(tempEl);
  
  const computed = window.getComputedStyle(tempEl).color;
  const hex = rgbToHex(computed);
  
  document.body.removeChild(tempEl);
  
  return { computed, hex };
}

export function TokenSwatch({ name, variable, usage }: TokenSwatchProps) {
  const [colors, setColors] = useState({ computed: "", hex: "" });

  useEffect(() => {
    setColors(getComputedColor(variable));
  }, [variable]);

  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        {/* Color Swatch */}
        <div
          className="h-12 w-12 flex-shrink-0 rounded-md border border-border shadow-sm"
          style={{ backgroundColor: `var(${variable})` }}
        />
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{name}</div>
          <code className="text-xs text-muted-foreground font-mono block mt-1">
            {variable}
          </code>
          <div className="text-xs text-muted-foreground mt-1">{usage}</div>
          {colors.hex && (
            <div className="text-xs font-mono text-muted-foreground mt-1">
              {colors.hex}
            </div>
          )}
        </div>

        {/* Copy Buttons */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <CopyButton value={`var(${variable})`} size="icon" variant="ghost" />
          {colors.hex && (
            <CopyButton value={colors.hex} size="icon" variant="ghost" />
          )}
        </div>
      </div>
    </div>
  );
}

