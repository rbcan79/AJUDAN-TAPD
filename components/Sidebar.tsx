"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, Users, Database, LogOut, 
  Menu, ChevronLeft, Search, ClipboardCheck, Settings, BookOpen, Megaphone 
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
  if (!isReady) return <div className="h-screen w-full bg-[#002855]" />;

  const allMenuItems = [
    { name: "DASHBOARD", path: "/", icon: <LayoutDashboard size={18} />, roles: ["superadmin", "ADMIN", "TAPD", "SKPD (OPD)"] },
    { name: "USER MANAGEMENT", path: "/register", icon: <Users size={18} />, roles: ["superadmin", "ADMIN", "TAPD", "SKPD (OPD)"] },
    { name: "CEK DATA", path: "/cek-data", icon: <Search size={18} />, roles: ["superadmin", "ADMIN"] }, 
    { name: "USULAN KEGIATAN", path: "/usulan", icon: <Database size={18} />, roles: ["superadmin", "SKPD (OPD)"] },
    { name: "ASISTENSI TAPD", path: "/asistensi", icon: <ClipboardCheck size={18} />, roles: ["superadmin", "TAPD"] },
    { name: "PENGESAHAN USULAN", path: "/pengesahan", icon: <BookOpen size={18} />, roles: ["superadmin", "ADMIN"] },
    // MENU BARU: BUAT PENGUMUMAN
    { name: "BUAT PENGUMUMAN", path: "/pengumuman", icon: <Megaphone size={18} />, roles: ["superadmin", "ADMIN"] },
    { name: "KONFIGURASI ADMIN", path: "/admin", icon: <Settings size={18} />, roles: ["superadmin"] },
  ];

  const filteredMenus = allMenuItems.filter((item) => {
    if (!userData) return item.name === "DASHBOARD";
    return item.roles.includes(userData.role);
  });

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden font-sans">
      <aside className={`bg-[#002855] text-white transition-all duration-300 flex flex-col h-full shrink-0 shadow-2xl z-20 ${isCollapsed ? "w-20" : "w-64"}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#001e40] min-h-[73px]">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-blue-400 overflow-hidden shrink-0 bg-white">
                <img src="/ajudan-wanita.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic leading-none uppercase">AJUDAN</span>
                <span className="text-sm font-black italic leading-none text-blue-400 uppercase">TAPD</span>
              </div>
            </div>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-blue-800 rounded-lg mx-auto">
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <div className={`p-4 border-b border-white/10 flex items-center gap-3 bg-[#002855]/50 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="w-10 h-10 rounded-full border-2 border-blue-400 overflow-hidden bg-white shrink-0 shadow-md">
            {userData?.avatar ? <img src={userData.avatar} className="w-full h-full object-cover" /> : <div className="text-blue-600 font-bold flex items-center justify-center h-full text-xs">U</div>}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden text-left">
              <p className="text-[10px] font-black uppercase italic text-white truncate mb-1">{userData?.name || "MEMUAT..."}</p>
              <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">{userData?.role || "GUEST"}</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-3 space-y-1.5 mt-2 overflow-y-auto">
          {filteredMenus.map((item) => (
            <Link key={item.path} href={item.path} className={`flex items-center gap-4 px-3 py-2.5 rounded-xl text-[9px] font-bold transition-all uppercase italic tracking-widest group ${pathname === item.path ? "bg-blue-600 text-white shadow-lg" : "text-blue-200 hover:bg-blue-800/60 hover:text-white"}`}>
              {item.icon}
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 bg-[#001e40]">
          <button onClick={async () => { if(confirm("Yakin ingin keluar?")) { await supabase.auth.signOut(); router.push("/login"); } }} className="flex items-center gap-4 px-4 py-3 w-full text-[9px] font-bold text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all uppercase italic group">
            <LogOut size={20} />
            {!isCollapsed && <span>KELUAR SISTEM</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-[105px] bg-[#002855] border-b border-white/10 flex items-center justify-between px-8 shrink-0 shadow-xl z-10">
          <div className="flex items-center gap-6">
            <div className="h-20 w-auto bg-white p-1.5 rounded-xl shadow-lg shrink-0 flex items-center justify-center border border-white/20">
              <img src="/sjjgp.png" alt="Logo Sijunjung Geopark" className="h-full w-auto object-contain" />
            </div>
            <div className="flex flex-col text-left">
              <h2 className="text-[20px] font-[1000] text-white tracking-tighter leading-none uppercase">TAHUN ANGGARAN 2026</h2>
              <p className="text-[12px] font-extrabold text-blue-400 uppercase mt-2 tracking-wider italic">
                {statusAnggaran ? `● ${statusAnggaran}` : "● MEMUAT STATUS..."}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center">
             <div className="w-14 h-14 rounded-full border-2 border-blue-400 overflow-hidden bg-white shadow-lg flex items-center justify-center">
                <img src="/ajudan-wanita1.png" alt="Ajudan Wanita" className="w-full h-full object-cover object-top" />
             </div>
             <span className="text-[11px] font-serif font-black italic tracking-tighter mt-1 leading-none text-blue-400 uppercase">AJUDAN TAPD</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-8 scroll-smooth">
           {children}
        </div>
      </main>
    </div>
  );
}
