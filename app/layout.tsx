import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financify - Smart Money Management",
  description: "Kelola keuangan Anda dengan bijak.",
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
        className={`${quicksand.variable} antialiased bg-slate-50`}
      >
        <ToastProvider>
          <ConfirmProvider>
            <Sidebar />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
