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
};

import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/hooks/useToast";
import { ConfirmProvider } from "@/hooks/useConfirm";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lexendDeca.variable} antialiased bg-[#EFF2F7]`}
      >
        <ToastProvider>
          <ConfirmProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 md:ml-[280px]">
                 {children}
              </div>
            </div>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
