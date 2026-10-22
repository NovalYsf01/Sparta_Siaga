"use client";

import { useEffect, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

let dialogScrollLockCount = 0;
let savedMainOverflow = "";
let savedMainOverscroll = "";
let savedBodyOverflow = "";
let savedHtmlOverflow = "";

function acquireDialogScrollLock() {
  if (typeof window === "undefined") return;
  if (dialogScrollLockCount === 0) {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      savedMainOverflow = mainEl.style.overflow;
      savedMainOverscroll = mainEl.style.overscrollBehavior;
      mainEl.style.overflow = "hidden";
      mainEl.style.overscrollBehavior = "none";
    }
    savedBodyOverflow = document.body.style.overflow;
    savedHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  dialogScrollLockCount++;
}

function releaseDialogScrollLock() {
  if (typeof window === "undefined") return;
  dialogScrollLockCount = Math.max(0, dialogScrollLockCount - 1);
  if (dialogScrollLockCount === 0) {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.style.overflow = savedMainOverflow;
      mainEl.style.overscrollBehavior = savedMainOverscroll;
    }
    document.body.style.overflow = savedBodyOverflow;
    document.documentElement.style.overflow = savedHtmlOverflow;
  }
}

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
  useEffect(() => {
    if (!open) return;
    acquireDialogScrollLock();
    return () => {
      releaseDialogScrollLock();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="!z-[6000] !bg-slate-950/75 backdrop-blur-xs overscroll-contain"
        className={cn(
          "!z-[6001] !flex !flex-col !items-center !justify-center !w-[calc(100vw-1rem)] !max-w-none !max-h-[92dvh] !min-h-0 !gap-0 !overflow-hidden !overscroll-contain !rounded-2xl !border-0 !bg-transparent !p-0 !shadow-none !ring-0 sm:!w-[calc(100vw-2rem)]",
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
