import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG App",
  description: "A Retrieval-Augmented Generation Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
