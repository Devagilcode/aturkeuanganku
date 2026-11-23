import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DAUA — Devagil Atur Uang Anda",
  description: "Catat transaksi, kelola anggaran, dan capai target tabungan bersama DAUA.",
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
