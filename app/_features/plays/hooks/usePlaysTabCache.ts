"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { fetchPlaysTabData } from "@/app/_features/plays/actions/fetch-plays-tab-data";
import type { PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import {
  syncPlaysUrl,
  type PlaysQueueFilterUi,
} from "@/app/_features/plays/plays-tab-routing";
import type { PlaysTabData } from "@/app/_features/plays/plays-tab-data";

export function usePlaysTabCache(initial: {
  tab: PlaysTab;
  queueFilter?: PlaysQueueFilterUi;
  data: PlaysTabData;
}) {
  const [tab, setTab] = useState<PlaysTab>(initial.tab);
  const [queueFilter, setQueueFilter] = useState<PlaysQueueFilterUi>(
    initial.queueFilter ?? "needs_you",
  );
  const [cache, setCache] = useState<Record<string, PlaysTabData>>(() => ({
    [initial.tab]: initial.data,
  }));
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeData = cache[tab];

  const ensureTabData = useCallback(
    (nextTab: PlaysTab) => {
      if (cache[nextTab]) {
        return;
      }

      setLoadingKey(nextTab);
      startTransition(() => {
        void fetchPlaysTabData({ tab: nextTab })
          .then((data: PlaysTabData) => {
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
    (nextTab: PlaysTab) => {
      setTab(nextTab);
      setQueueFilter("needs_you");
      syncPlaysUrl(nextTab, "needs_you");
      ensureTabData(nextTab);
    },
    [ensureTabData],
  );

  const handleQueueFilterChange = useCallback((nextFilter: PlaysQueueFilterUi) => {
    setQueueFilter(nextFilter);
    syncPlaysUrl(tab, nextFilter);
  }, [tab]);

  const invalidateActiveTab = useCallback(() => {
    // Background refresh — keep showing current data while fetching. Deleting
    // the cache entry first caused a permanent skeleton: ensureTabData's stale
    // closure still saw the old entry and skipped the refetch.
    startTransition(() => {
      void fetchPlaysTabData({ tab }).then((data: PlaysTabData) => {
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
    queueFilter,
    activeData,
    isTabLoading,
    handleTabChange,
    handleQueueFilterChange,
    invalidateActiveTab,
  };
}
