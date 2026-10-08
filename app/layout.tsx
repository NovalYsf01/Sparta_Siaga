import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPARTA Siaga - Disaster & Branch Monitoring System",
  description: "Real-time interactive monitoring of physical branches & early disaster alerts for Alfamart networks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-red-500/20 selection:text-red-500">
        {children}
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
