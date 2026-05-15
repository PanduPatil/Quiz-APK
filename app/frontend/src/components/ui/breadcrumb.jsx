import React from "react";
import { cn } from "@/lib/utils";

export const Breadcrumb = React.forwardRef(({ className, ...props }, ref) => (
  <nav ref={ref} aria-label="breadcrumb" className={cn("text-sm", className)} {...props} />
));
Breadcrumb.displayName = "Breadcrumb";
export const BreadcrumbList = React.forwardRef(({ className, ...props }, ref) => (
  <ol ref={ref} className={cn("flex flex-wrap items-center gap-1.5 text-zinc-500", className)} {...props} />
));
BreadcrumbList.displayName = "BreadcrumbList";
export const BreadcrumbItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
));
BreadcrumbItem.displayName = "BreadcrumbItem";
export const BreadcrumbLink = React.forwardRef(({ className, ...props }, ref) => (
  <a ref={ref} className={cn("transition-colors hover:text-zinc-950", className)} {...props} />
));
BreadcrumbLink.displayName = "BreadcrumbLink";
export const BreadcrumbPage = React.forwardRef(({ className, ...props }, ref) => (
  <span ref={ref} role="link" aria-disabled="true" aria-current="page" className={cn("font-normal text-zinc-950", className)} {...props} />
));
BreadcrumbPage.displayName = "BreadcrumbPage";
export const BreadcrumbSeparator = ({ children = "/", className, ...props }) => <li role="presentation" aria-hidden="true" className={cn("text-zinc-400", className)} {...props}>{children}</li>;
