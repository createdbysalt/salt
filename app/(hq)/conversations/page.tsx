"use client";

import dynamic from "next/dynamic";
import ConversationsLoading from "./loading";

const ConversationsPage = dynamic(
  () => import("./ConversationsPageClient").then((mod) => mod.ConversationsPageClient),
  {
    loading: () => <ConversationsLoading />,
    ssr: false,
  }
);

export default function ConversationsRoute() {
  return <ConversationsPage />;
}
