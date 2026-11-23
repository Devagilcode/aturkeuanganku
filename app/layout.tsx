import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devagil | DAUA",
  description: "Devagil Atur Uang Anda: catat transaksi, kelola anggaran, dan capai target tabungan bersama DAUA.",
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
