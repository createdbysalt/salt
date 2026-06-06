import type { ReactNode } from "react";
import { cn } from "@repo/utils";
import {
  landing2ColumnClass,
  landing2FrameClass,
  landing2GutterClass,
} from "./landing2-layout";

export function Landing2Container({
  children,
  className,
  columnClassName,
}: {
  children: ReactNode;
  className?: string;
  columnClassName?: string;
}) {
  return (
    <div className={cn(landing2GutterClass, className)}>
      <div className={landing2FrameClass}>
        <div className={cn(landing2ColumnClass, columnClassName)}>{children}</div>
      </div>
    </div>
  );
}
