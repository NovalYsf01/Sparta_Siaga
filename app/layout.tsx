import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  themeColor: "#123B6D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SPARTA Siaga — Monitoring & Mitigasi Bencana Alfamart",
  description: "Pusat Intelijen Mitigasi Bencana & Pemantauan Operasional Cabang PT Sumber Alfaria Trijaya Tbk",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SPARTA SIAGA",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("font-sans", inter.variable)}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-red-500/20 selection:text-red-500">
        <PwaRegister />
          <TooltipProvider>
            {children}
          </TooltipProvider>

          <Toaster
          position="top-right"
          duration={4000}
          toastOptions={{
            classNames: {
              toast: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-4 flex gap-3",
              title: "text-sm font-bold text-slate-900 dark:text-white",
              description: "text-xs text-slate-500 dark:text-slate-400 mt-0.5",
              closeButton: "relative left-auto right-auto top-auto transform-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 border-none rounded-lg p-1.5 transition-colors",
              icon: "mt-0.5 w-5 h-5",
              error: "text-red-600 dark:text-red-400",
              success: "text-emerald-600 dark:text-emerald-400",
              warning: "text-amber-600 dark:text-amber-400",
              info: "text-blue-600 dark:text-blue-400",
            },
          }}
          closeButton 
        />
      </body>
    </html>
  );
}

