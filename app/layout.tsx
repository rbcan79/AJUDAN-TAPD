import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

// Menggunakan font Inter untuk tampilan yang bersih dan profesional ala SIPD
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
        <div className="flex h-screen w-full overflow-hidden">
          {/* SIDEBAR: Komponen navigasi utama. 
            Pastikan file berada di /components/Sidebar.tsx
          */}
          <Sidebar />

          {/* MAIN CONTENT AREA: 
            Area ini akan otomatis menyesuaikan lebar saat sidebar dikecilkan.
            'overflow-y-auto' memastikan konten bisa di-scroll secara mandiri.
          */}
          <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            {/* Header Tipis (Opsional - Memberi kesan Enterprise) */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Tahun Anggaran 2026
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xs">AD</span>
                </div>
              </div>
            </header>

            {/* Area Konten Dinamis */}
            <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}