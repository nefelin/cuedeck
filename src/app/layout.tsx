import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loopstation — practice bookmarks for YouTube",
  description: "Bookmark and loop tool for YouTube practice sessions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
