import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atur Uang — Catatan Keuangan",
  description: "Kelola pemasukan dan pengeluaranmu dengan mudah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
