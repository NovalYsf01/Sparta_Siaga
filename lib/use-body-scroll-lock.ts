"use client";

import { useEffect } from "react";

/**
 * Custom hook to lock body scrolling when a modal or dialog is open.
 * Restores original body overflow and padding on close or unmount.
 * Prevents background page movement and scroll chaining.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (typeof window === "undefined" || !isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent horizontal layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}
