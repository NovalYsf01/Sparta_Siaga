"use client";

import { useEffect } from "react";

// Global reference counter for nested/stacked modals
let activeLockCount = 0;
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";
let originalHtmlOverflow = "";

/**
 * Custom hook to lock body & html scrolling when any modal or dialog is open.
 * Uses reference counting to support nested modals seamlessly.
 * Restores original body & html overflow and padding when all modals close.
 * Prevents background page movement, touch rubber-banding, and scroll chaining.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (typeof window === "undefined" || !isLocked) return;

    if (activeLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalBodyPaddingRight = document.body.style.paddingRight;
      originalHtmlOverflow = document.documentElement.style.overflow;

      // Calculate scrollbar width to prevent horizontal layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    activeLockCount++;

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.paddingRight = originalBodyPaddingRight;
        document.documentElement.style.overflow = originalHtmlOverflow;
      }
    };
  }, [isLocked]);
}
