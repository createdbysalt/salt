import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLearnPublicEnabled } from "@/app/_features/marketing/marketing-public-surfaces";

export default function LayoutBlog({ children }: { children: ReactNode }) {
  if (!isLearnPublicEnabled()) {
    notFound();
  }

  return children;
}
