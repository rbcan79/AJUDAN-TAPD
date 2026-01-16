"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, Users, Database, LogOut, 
  Menu, ChevronLeft, Shield, ClipboardCheck, Settings, BookOpen 
} from "lucide-react";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userData, setUserData] = useState<{ name: string; role: string; avatar?: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("nama_lengkap, role, avatars") 
        .eq("id", userId)
        .single();

      if (data) {
        setUserData({
          name: data.nama_lengkap,
          role: data.role ? data.role.trim() : "GUEST",
          avatar: data.avatars 
        });
      }
    } catch (err) {
      console.error("Gagal memuat profil:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) fetchProfile(user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUserData(null);
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const allMenuItems = [
    { name: "DASHBOARD", path: "/", icon: <LayoutDashboard size={20} />, roles: ["superadmin", "ADMIN", "TAPD", "SKPD (OPD)"] },
    { name: "USER MANAGEMENT", path: "/register", icon: <Users size={20} />, roles: ["superadmin", "ADMIN"] },
    { name: "USULAN KEGIATAN", path: "/usulan", icon: <Database size={20} />, roles: ["superadmin", "SKPD (OPD)"] },
    { name: "ASISTENSI TAPD", path: "/asistensi", icon: <ClipboardCheck size={20} />, roles: ["superadmin", "TAPD"] },
    { name: "PENGESAHAN USULAN", path: "/pengesahan", icon: <BookOpen size={20} />, roles: ["superadmin", "ADMIN"] },
    { name: "KONFIGURASI ADMIN", path: "/admin", icon: <Settings size={20} />, roles: ["superadmin"] },
  ];

  const filteredMenus = allMenuItems.filter((item) => {
    if (!userData || userData.role === "GUEST") return item.name === "DASHBOARD";
    return item.roles.includes(userData.role);
  });

  return (
    <div className={`bg-[#002855] min-h-screen text-white transition-all duration-300 flex flex-col h-screen sticky top-0 ${isCollapsed ? "w-20" : "w-64"}`}>
      
      {/* HEADER: UPDATE FOTO PRIA BERJAS SESUAI LAMPIRAN */}
      <div className="p-4 border-b border-blue-900/50 flex items-center justify-between bg-[#001e40]">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            {/* Foto Pria Berjas dari folder public */}
            <div className="w-10 h-10 rounded-full border-2 border-blue-400 overflow-hidden shrink-0 shadow-lg bg-white">
              <img 
                src="/ajudan-pria.png" 
                alt="Ajudan Logo" 
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="flex flex-col">
                <h1 className="text-sm font-black italic uppercase tracking-tighter leading-none">
                AJUDAN
                </h1>
                <h1 className="text-sm font-black italic uppercase tracking-tighter leading-none text-blue-400">
                TAPD
                </h1>
            </div>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-blue-800 rounded-lg mx-auto transition-colors">
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* PROFIL LOGIN */}
      <div className={`p-4 border-b border-blue-900/50 flex items-center gap-3 bg-[#002855]/50 ${isCollapsed ? "justify-center" : ""}`}>
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full border-2 border-blue-400 overflow-hidden bg-white shadow-xl flex items-center justify-center">
            {userData?.avatar ? (
              <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="bg-blue-600 w-full h-full flex items-center justify-center text-white font-black text-xs">
                {userData?.name?.substring(0, 1) || "U"}
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#002855] rounded-full"></div>
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden text-left">
            <p className="text-[10px] font-black uppercase italic text-white truncate leading-none mb-1">{userData?.name || "MEMUAT..."}</p>
            <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest leading-none">{userData?.role || "GUEST"}</p>
          </div>
        )}
      </div>
      
      {/* NAVIGASI MENU */}
      <nav className="flex-1 p-3 space-y-1.5 mt-2 overflow-y-auto">
        {filteredMenus.map((item) => (
          <Link 
            key={item.path} 
            href={item.path} 
            className={`flex items-center gap-4 px-3 py-2.5 rounded-xl text-[9px] font-bold transition-all uppercase italic tracking-widest group ${
              pathname === item.path ? "bg-blue-600 shadow-lg text-white" : "text-blue-200 hover:bg-blue-800/60 hover:text-white"
            }`}
          >
            <span className={pathname === item.path ? "text-white" : "text-blue-400 group-hover:text-white"}>{item.icon}</span>
            {!isCollapsed && <span className="truncate">{item.name}</span>}
          </Link>
        ))}
      </nav>

      {/* TOMBOL KELUAR - BERSIH TOTAL & LAYER PALING ATAS */}
      <div className="p-3 border-t border-blue-900/50 bg-[#001e40] relative z-[9999]">
        <button 
          onClick={async () => { 
            if(confirm("Apakah anda yakin ingin keluar sistem?")) {
              await supabase.auth.signOut(); 
              router.push("/login"); 
            }
          }} 
          className="flex items-center gap-4 px-4 py-3 w-full text-[9px] font-bold text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all uppercase italic group"
        >
          <LogOut size={20} className="shrink-0 group-hover:translate-x-1 transition-transform" />
          {!isCollapsed && <span className="tracking-widest">KELUAR SISTEM</span>}
        </button>
      </div>
    </div>
  );
}