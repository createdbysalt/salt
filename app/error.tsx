"use client";

import { Landing2ErrorPage } from "@/app/_features/marketing/landing2/Landing2ErrorPage";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <Landing2ErrorPage error={error} reset={reset} />;
}
