import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Apex PL — Premier League Insight Playground",
  description: "Curiosity-driven Premier League insights powered by live FPL data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-bg-0 text-text`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
