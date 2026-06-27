import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CatatDuit - Money Manager",
  description: "Aplikasi pencatat keuangan pribadi modern",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-32x32.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CatatDuit",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

import Sidebar from "@/components/Sidebar";
import SplashScreen from "@/components/SplashScreen";
import ContentWrapper from "@/components/ContentWrapper";
import { ToastProvider } from "@/hooks/useToast";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { SuccessModalProvider } from "@/hooks/useSuccessModal";
import { ThemeProvider } from "@/hooks/useTheme";
import { SidebarProvider } from "@/hooks/useSidebar";

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
        className={`${spaceMono.variable} antialiased bg-[var(--bg-page)] font-sans`}
      >
        <ThemeProvider>
          <SidebarProvider>
            <ToastProvider>
              <ConfirmProvider>
                <SuccessModalProvider>
                  <SplashScreen />
                  <div className="flex min-h-screen">
                    <Sidebar />
                    <ContentWrapper>
                      {children}
                    </ContentWrapper>
                  </div>
                </SuccessModalProvider>
              </ConfirmProvider>
            </ToastProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
