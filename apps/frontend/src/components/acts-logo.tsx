import type React from "react";
import { cn } from "../lib/utils";

interface ActsLogoProps {
  className?: string;
  imageClassName?: string;
  tagline?: string;
  taglineClassName?: string;
}

export function ActsLogo({
  className,
  imageClassName,
  tagline,
  taglineClassName
}: ActsLogoProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <img alt="ACTS" className={cn("h-10 w-auto", imageClassName)} src="/acts-logo.svg" />
      {tagline ? (
        <p className={cn("text-[11px] font-medium uppercase tracking-[0.26em] text-slate-500", taglineClassName)}>
          {tagline}
        </p>
      ) : null}
    </div>
  );
}
