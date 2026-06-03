import type { Metadata } from "next";
import { Lexend_Deca } from "next/font/google";
import "./globals.css";

const lexendDeca = Lexend_Deca({
  subsets: ["latin"],
  variable: "--font-lexend-deca",
});

export const metadata: Metadata = {
  title: "SwiftLog - Money Manager",
  description: "Modern Logistics-style Money Management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SwiftLog",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

import Sidebar from "@/components/Sidebar";
import SplashScreen from "@/components/SplashScreen";
import { ToastProvider } from "@/hooks/useToast";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { SuccessModalProvider } from "@/hooks/useSuccessModal";
import { ThemeProvider } from "@/hooks/useTheme";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: apply dark class before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${lexendDeca.variable} antialiased bg-[var(--bg-page)]`}
      >
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <SuccessModalProvider>
                <SplashScreen />
                <div className="flex min-h-screen">
                  <Sidebar />
                  <div className="flex-1 min-w-0 overflow-x-hidden md:ml-[280px]">
                     {children}
                  </div>
                </div>
              </SuccessModalProvider>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
