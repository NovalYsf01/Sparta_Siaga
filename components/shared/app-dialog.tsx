"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Shared SPARTA SIAGA modal surface based on shadcn/Mira (Base UI).
 *
 * DialogContent renders in a body portal, so modals remain centered even when
 * the page, sidebar, or a transformed/scrolling parent moves. Every caller
 * keeps its own header, scrollable body and footer inside this common shell.
 */
export function AppDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="!z-[6000] !bg-slate-950/75 backdrop-blur-xs"
        className={cn(
          "!z-[6001] !flex !w-[calc(100vw-1rem)] !max-w-none !max-h-[92dvh] !min-h-0 !gap-0 !overflow-hidden !rounded-2xl !border-0 !bg-transparent !p-0 !shadow-none !ring-0 sm:!w-[calc(100vw-2rem)]",
          className
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {description || title}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
