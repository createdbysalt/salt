"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { TYPE_META, type GraphNode, type NodeType } from "../types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

export function GraphDetailPanel({
  node,
  neighbors,
  onClose,
  onFocusNode,
}: {
  node: GraphNode & { degree: number };
  neighbors: GraphNode[];
  onClose: () => void;
  onFocusNode: (id: string) => void;
}) {
  const router = useRouter();
  const meta = TYPE_META[node.type];

  // Group neighbors by type for scannable display
  const grouped = neighbors.reduce<Record<NodeType, GraphNode[]>>(
    (acc, n) => {
      (acc[n.type] ||= []).push(n);
      return acc;
    },
    { person: [], org: [], work: [], billing: [], file: [], note: [], conversation: [], meeting: [], resource: [] }
  );

  // Phrase about the record itself: prefer the cached AI narrative (same
  // "Summary" + "Worth attention" as the record's overview page), else fall
  // back to a deterministic line from the node's own fields.
  const cachedSummary = node.summary?.trim();
  const cachedAttention = node.worthAttention?.trim();
  const attentionIsNotable = cachedAttention && !/^nothing\b/i.test(cachedAttention);

  const TYPE_FALLBACKS: Record<NodeType, string> = {
    person: "A person in your memory.",
    org: "An organization in your memory.",
    work: "A piece of work in your memory.",
    billing: "A billing record.",
    file: "A resource.",
    note: "A note.",
    conversation: "A conversation.",
    meeting: "A meeting.",
    resource: "A resource.",
  };
  const context = node.sublabel
    ? `${node.sublabel.charAt(0).toUpperCase()}${node.sublabel.slice(1)}.`
    : TYPE_FALLBACKS[node.type];
  const fallback =
    node.recordStatus === "inactive"
      ? `${context.slice(0, -1)} — quiet lately, worth a look.`
      : context;

  const base = cachedSummary ?? fallback;
  // AI narratives are full sentences; deterministic flags are lowercase
  // continuations meant to follow an em dash.
  const phrase =
    attentionIsNotable && cachedAttention
      ? /^[a-z]/.test(cachedAttention)
        ? `${base.replace(/\.$/, "")} — ${cachedAttention}.`
        : `${base} ${cachedAttention}`
      : base;

  return (
    <motion.aside
      initial={{ x: 32, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 32, opacity: 0 }}
      transition={{ duration: 0.32, ease: APPLE_EASE }}
      className="absolute bottom-4 right-4 w-[340px] z-20 max-h-[calc(100%-5.5rem)] rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-[var(--shadow-lift)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="relative p-5 border-b border-border/60">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 size-7 grid place-items-center rounded-full hover:bg-foreground/5 text-muted-foreground"
          aria-label="Close"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span
            className="size-2 rounded-full"
            style={{ background: meta.color }}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {meta.label}
          </span>
        </div>

        <h3 className="font-display text-2xl tracking-tight leading-tight pr-6">
          {node.label}
        </h3>
        {node.sublabel && (
          <p className="text-sm text-muted-foreground mt-1">{node.sublabel}</p>
        )}

        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{phrase}</p>

        {node.href && (
          <button
            onClick={() => router.push(node.href!)}
            className="mt-4 w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition"
          >
            Open record
            <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
          </button>
        )}
      </div>

      {/* Neighbors */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {neighbors.length > 0 && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
            Connections
          </p>
        )}
        {(Object.keys(grouped) as NodeType[]).map((type) => {
          const items = grouped[type];
          if (items.length === 0) return null;
          return (
            <div key={type}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: TYPE_META[type].color }}
                />
                {TYPE_META[type].label}
                <span className="text-muted-foreground/60 tabular-nums">
                  {items.length}
                </span>
              </p>
              <ul className="space-y-0.5">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => onFocusNode(n.id)}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-foreground/5 transition"
                    >
                      <p className="text-sm text-foreground truncate leading-tight">
                        {n.label}
                      </p>
                      {n.sublabel && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {n.sublabel}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </motion.aside>
  );
}
