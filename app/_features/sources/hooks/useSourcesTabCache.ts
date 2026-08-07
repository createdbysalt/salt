"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { fetchSourcesTabData } from "@/app/_features/sources/actions/fetch-sources-tab-data";
import {
  syncSourcesUrl,
  type SourcesTab,
} from "@/app/_features/sources/sources-tab-routing";
import type { SourcesTabData } from "@/app/_features/sources/sources-tab-data";

export function useSourcesTabCache(initial: {
  tab: SourcesTab;
  data: SourcesTabData;
}) {
  const [tab, setTab] = useState<SourcesTab>(initial.tab);
  const [cache, setCache] = useState<Record<string, SourcesTabData>>(() => ({
    [initial.tab]: initial.data,
  }));
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeData = cache[tab];

  const ensureTabData = useCallback(
    (nextTab: SourcesTab) => {
      if (cache[nextTab]) {
        return;
      }

      setLoadingKey(nextTab);
      startTransition(() => {
        void fetchSourcesTabData({ tab: nextTab })
          .then((data: SourcesTabData) => {
            setCache((current) => ({
              ...current,
              [nextTab]: data,
            }));
          })
          .finally(() => {
            setLoadingKey((current) => (current === nextTab ? null : current));
          });
      });
    },
    [cache],
  );

  const handleTabChange = useCallback(
    (nextTab: SourcesTab) => {
      setTab(nextTab);
      syncSourcesUrl(nextTab);
      ensureTabData(nextTab);
    },
    [ensureTabData],
  );

  const invalidateActiveTab = useCallback(() => {
    // Background refresh — keep showing current data while fetching.
    startTransition(() => {
      void fetchSourcesTabData({ tab }).then((data: SourcesTabData) => {
        setCache((current) => ({
          ...current,
          [tab]: data,
        }));
      });
    });
  }, [tab, startTransition]);

  const isTabLoading = useMemo(
    () => (loadingKey === tab && isPending) || !activeData,
    [activeData, isPending, loadingKey, tab],
  );

  return {
    tab,
    activeData,
    isTabLoading,
    handleTabChange,
    invalidateActiveTab,
  };
}
