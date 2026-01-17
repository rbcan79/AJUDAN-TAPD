"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, Users, Database, LogOut, 
  Menu, ChevronLeft, Search, ClipboardCheck, Settings, BookOpen
} from "lucide-react";

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userData, setUserData] = useState<{ name: string; role: string; avatar?: string } | null>(null);
  const [statusAnggaran, setStatusAnggaran] = useState<string>(""); 
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === "/login";

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (!isAuthPage) router.push("/login");
        setIsReady(true);
        return;
      }

      // Ambil Profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("nama_lengkap, role, avatars")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserData({
          name: profile.nama_lengkap,
          role: profile.role ? profile.role.trim() : "GUEST",
          avatar: profile.avatars 
        });
      }

      // Ambil Status Anggaran (Query Kolom current_status_anggaran jika is_locked = true)
      const { data: settings } = await supabase
        .from("settings")
        .select("current_status_anggaran")
        .eq("is_locked", true) 
        .maybeSingle();
      
      if (settings) setStatusAnggaran(settings.current_status_anggaran);
      
      setIsReady(true);
    };

    checkSession();
  }, [pathname, router, isAuthPage]);

  if (isAuthPage) return <>{children}</>;

  if (!isReady) {
    return (
      <div className="h-screen w-full bg-[#002855] flex items-center justify-center text-white font-bold italic">
        MEMUAT SISTEM...
      </div>
    );
  }

  const allMenuItems = [
    { name: "DASHBOARD", path: "/", icon: <LayoutDashboard size={18} />, roles: ["superadmin", "ADMIN", "TAPD", "SKPD (OPD)"] },
    { name: "USER MANAGEMENT", path: "/register", icon: <Users size={18} />, roles: ["superadmin", "ADMIN", "TAPD", "SKPD (OPD)"] },
    { name: "CEK DATA", path: "/cek-data", icon: <Search size={18} />, roles: ["superadmin", "ADMIN"] }, 
    { name: "USULAN KEGIATAN", path: "/usulan", icon: <Database size={18} />, roles: ["superadmin", "SKPD (OPD)"] },
    { name: "ASISTENSI TAPD", path: "/asistensi", icon: <ClipboardCheck size={18} />, roles: ["superadmin", "TAPD"] },
    { name: "PENGESAHAN USULAN", path: "/pengesahan", icon: <BookOpen size={18} />, roles: ["superadmin", "ADMIN"] },
    { name: "KONFIGURASI ADMIN", path: "/admin", icon: <Settings size={18} />, roles: ["superadmin"] },
  ];

  const filteredMenus = allMenuItems.filter((item) => {
    if (!userData) return item.name === "DASHBOARD";
    return item.roles.includes(userData.role);
  });

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* SIDEBAR LEFT */}
      <aside className={`bg-[#002855] text-white transition-all duration-300 flex flex-col h-full shrink-0 ${isCollapsed ? "w-20" : "w-64"}`}>
        <div className="p-4 border-b border-blue-900/50 flex items-center justify-between bg-[#001e40] min-h-[73px]">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-blue-400 overflow-hidden shrink-0 bg-white">
                <img src="/ajudan-wanita.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black italic leading-none">AJUDAN</span>
                <span className="text-sm font-black italic leading-none text-blue-400">TAPD</span>
              </div>
            </div>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-blue-800 rounded-lg mx-auto">
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Profil Section */}
        <div className={`p-4 border-b border-blue-900/50 flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="w-10 h-10 rounded-full border-2 border-blue-400 overflow-hidden bg-white shrink-0">
            {userData?.avatar ? <img src={userData.avatar} className="w-full h-full object-cover" /> : <div className="text-blue-600 font-bold flex items-center justify-center h-full">U</div>}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden text-left">
              <p className="text-[10px] font-black uppercase italic truncate mb-1">{userData?.name || "MEMUAT..."}</p>
              <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">{userData?.role || "GUEST"}</p>
            </div>
          )}
        </div>
        
        {/* Navigasi */}
        <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto">
          {filteredMenus.map((item) => (
            <Link key={item.path} href={item.path} className={`flex items-center gap-4 px-3 py-2.5 rounded-xl text-[9px] font-bold transition-all uppercase italic tracking-widest group ${pathname === item.path ? "bg-blue-600 text-white shadow-lg" : "text-blue-200 hover:bg-blue-800/60 hover:text-white"}`}>
              {item.icon}
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-blue-900/50 bg-[#001e40]">
          <button onClick={async () => { if(confirm("Keluar?")) { await supabase.auth.signOut(); router.push("/login"); } }} className="flex items-center gap-4 px-4 py-3 w-full text-[9px] font-bold text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all uppercase italic group">
            <LogOut size={20} />
            {!isCollapsed && <span>KELUAR SISTEM</span>}
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-[73px] bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex flex-col text-left">
            <h2 className="text-[16px] font-[1000] text-gray-900 tracking-tighter leading-none uppercase">
              TAHUN ANGGARAN 2026
            </h2>
            <p className="text-[11px] font-extrabold text-blue-700 uppercase mt-1 tracking-wide">
              {statusAnggaran ? `● ${statusAnggaran}` : "● MEMUAT STATUS..."}
            </p>
          </div>
          <div /> {/* Logo AD Hilang Total */}
        </header>

        {/* INI BAGIAN PALING PENTING: MENGELUARKAN HALAMAN */}
        <div className="flex-1 overflow-auto bg-gray-50">
           {children}
        </div>
      </main>
    </div>
  );
}
