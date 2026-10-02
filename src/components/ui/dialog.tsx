"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal Dialog Content */}
      <div className="relative z-50 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-md transition-all animate-in zoom-in-95 duration-200">
        {children}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground transition-opacity hover:opacity-100 hover:bg-muted cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </button>
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-left mb-4", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "font-heading text-lg font-semibold leading-tight tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  as: Component = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  const Comp = Component || "div";
  return (
    <Comp
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-border/70 pt-4 mt-6",
        className
      )}
      {...props}
    />
  );
}
