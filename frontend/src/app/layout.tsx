import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DART - Dreamshot Annotation & Ranking Tool",
  description: "A comprehensive tool for annotating and ranking dreamshots",
  keywords: ["dreamshot", "annotation", "ranking", "tool", "dart"],
  authors: [{ name: "DART Team" }],
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎯</text></svg>",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎯</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    title: "DART - Dreamshot Annotation & Ranking Tool",
    description: "A comprehensive tool for annotating and ranking dreamshots",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className}`}>
        <SessionProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
