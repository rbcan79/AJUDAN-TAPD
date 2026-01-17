import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

// Menggunakan font Inter untuk tampilan profesional
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "E-PLANNING | Enterprise System",
  description: "Sistem Manajemen Perencanaan Terintegrasi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-[#f4f7fe] text-slate-900 overflow-hidden`}>
        {/* STRUKTUR TERPADU:
          Kita membungkus 'children' langsung ke dalam komponen Sidebar.
          Ini akan menghilangkan logo AD di pojok kanan dan memastikan 
          Tahun Anggaran 2026 hanya muncul satu kali dengan format yang tegas.
        */}
        <Sidebar>
          {children}
        </Sidebar>
      </body>
    </html>
  );
}
