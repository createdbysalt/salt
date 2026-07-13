"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { fetchPlaysTabData } from "@/app/_features/plays/actions/fetch-plays-tab-data";
import type { PlaysActivityView, PlaysTab } from "@/app/_features/plays/load-plays-page-data";
import {
  playsTabCacheKey,
  syncPlaysUrl,
  type PlaysActivityViewUi,
} from "@/app/_features/plays/plays-tab-routing";
import { EMPTY_CONNECTORS, type PlaysTabData } from "@/app/_features/plays/plays-tab-data";
import type { ActivityView } from "../components/ActivityViewToggle";

export { EMPTY_CONNECTORS, type PlaysTabData };

function cacheKey(tab: PlaysTab, activityView: ActivityView): string {
  return playsTabCacheKey(tab, activityView as PlaysActivityViewUi);
}

export function usePlaysTabCache(initial: {
  tab: PlaysTab;
  activityView: ActivityView;
  queueFilter?: "needs_you" | "auto_handled" | "learning";
  data: PlaysTabData;
}) {
  const [tab, setTab] = useState<PlaysTab>(initial.tab);
  const [activityView, setActivityView] = useState<ActivityView>(initial.activityView);
  const [queueFilter, setQueueFilter] = useState<"needs_you" | "auto_handled" | "learning">(
    initial.queueFilter ?? "needs_you",
  );
  const [cache, setCache] = useState<Record<string, PlaysTabData>>(() => ({
    [cacheKey(initial.tab, initial.activityView)]: initial.data,
  }));
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeKey = cacheKey(tab, activityView);
  const activeData = cache[activeKey];

  const ensureTabData = useCallback(
    (nextTab: PlaysTab, nextActivityView: ActivityView) => {
      const key = cacheKey(nextTab, nextActivityView);
      if (cache[key]) {
        return;
      }

      setLoadingKey(key);
      startTransition(() => {
        void fetchPlaysTabData({
          tab: nextTab,
          activityView: nextActivityView as PlaysActivityView,
        })
          .then((data: PlaysTabData) => {
            setCache((current) => ({
              ...current,
              [key]: data,
            }));
          })
          .finally(() => {
            setLoadingKey((current) => (current === key ? null : current));
          });
      });
    },
    [cache],
  );

  const handleTabChange = useCallback(
    (nextTab: PlaysTab) => {
      setTab(nextTab);
      setQueueFilter("needs_you");
      syncPlaysUrl(nextTab, "needs_you", activityView);
      ensureTabData(nextTab, activityView);
    },
    [activityView, ensureTabData],
  );

  const handleQueueFilterChange = useCallback((nextFilter: "needs_you" | "auto_handled" | "learning") => {
    setQueueFilter(nextFilter);
    syncPlaysUrl(tab, nextFilter as "needs_you" | "auto_handled", activityView);
  }, [activityView, tab]);

  const handleActivityViewChange = useCallback(
    (nextView: ActivityView) => {
      setTab("activity");
      setActivityView(nextView);
      syncPlaysUrl("activity", queueFilter, nextView);
      ensureTabData("activity", nextView);
    },
    [ensureTabData, queueFilter],
  );

  const invalidateActiveTab = useCallback(() => {
    // Background refresh — keep showing current data while fetching. Deleting
    // the cache entry first caused a permanent skeleton: ensureTabData's stale
    // closure still saw the old entry and skipped the refetch.
    startTransition(() => {
      void fetchPlaysTabData({
        tab,
        activityView: activityView as PlaysActivityView,
      }).then((data: PlaysTabData) => {
        setCache((current) => ({
          ...current,
          [activeKey]: data,
        }));
      });
    });
  }, [activeKey, activityView, tab, startTransition]);

  const isTabLoading = useMemo(
    () => (loadingKey === activeKey && isPending) || !activeData,
    [activeData, activeKey, isPending, loadingKey],
  );

  return {
    tab,
    activityView,
    queueFilter,
    activeData,
    isTabLoading,
    handleTabChange,
    handleQueueFilterChange,
    handleActivityViewChange,
    invalidateActiveTab,
  };
}
