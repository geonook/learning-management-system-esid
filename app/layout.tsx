import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

// Force dynamic rendering for all routes (required for AuthProvider context)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learning Management System ESID",
  description:
    "Full-stack Learning Management System with Next.js + TypeScript + Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider> */}
        {children}
      </body>
    </html>
  );
}
