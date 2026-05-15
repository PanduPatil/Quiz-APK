import React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  const styles = variant === "outline"
    ? "border border-zinc-300 bg-white text-zinc-900"
    : "bg-zinc-900 text-white";

  return (
    <span
      className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium", styles, className)}
      {...props}
    />
  );
}
