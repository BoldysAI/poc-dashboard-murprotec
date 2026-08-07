import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { DashboardDataProvider } from "@/contexts/dashboard-data-context";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MurProtec — Dashboards Financiers",
  description:
    "POC dashboards Trésorerie Groupe et Reporting Financier — Murpro Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <DashboardDataProvider>{children}</DashboardDataProvider>
      </body>
    </html>
  );
}
