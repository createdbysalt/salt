"use client";

import dynamic from "next/dynamic";
import PlaysLoading from "./loading";

const PlaysPage = dynamic(
  () => import("@/app/_features/plays/components/PlaysPage").then((mod) => mod.PlaysPage),
  {
    loading: () => <PlaysLoading />,
    ssr: false,
  }
);

export default function PlaysRoute() {
  return <PlaysPage />;
}
