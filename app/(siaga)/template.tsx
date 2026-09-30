"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function SiagaTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // A small delay ensures the initial render has opacity-0,
    // then browser paints, then we set opacity-100 to trigger CSS transition.
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      className={`flex-1 flex flex-col w-full h-full transition-all duration-[200ms] ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
    >
      {children}
    </div>
  );
}
