import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Script from "next/script"; // Menambahkan import Script Next.js

// Menggunakan font Inter untuk tampilan profesional
const inter = Inter({ subsets: ["latin"] });

// Solusi untuk menghilangkan peringatan "Unsupported metadata themeColor"
export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export const metadata: Metadata = {
  title: "AJUDAN TAPD",
  description: "Sistem Asistensi Usulan Perencanaan Terintegrasi",
  // Konfigurasi PWA agar logo dan nama muncul di menu HP
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AJUDAN TAPD",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* Menambahkan Library Jitsi Meet agar fitur Video Conference Aktif.
          Strategy "beforeInteractive" memastikan library siap sebelum halaman Rapat dibuka.
        */}
        <Script 
          src="https://meet.jit.si/external_api.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body className={`${inter.className} bg-[#f4f7fe] text-slate-900 overflow-hidden`}>
        {/* Pemicu otomatis agar tombol "Instal Aplikasi" muncul di HP */}
        <ServiceWorkerRegister />

        {/* Fasilitas Sidebar dan struktur layout tetap dipertahankan sesuai aslinya */}
        <Sidebar>
          {children}
        </Sidebar>
      </body>
    </html>
  );
}
