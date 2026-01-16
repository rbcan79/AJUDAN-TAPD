"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Users, Building2, ClipboardList, ChevronRight, ChevronDown, 
  LayoutGrid, List, CheckCircle2, Clock, XCircle, ShieldCheck, 
  Search, AlertCircle
} from "lucide-react";

export default function CekDataPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"usulan" | "tapd">("tapd");
  
  // States Filter
  const [skpdList, setSkpdList] = useState<any[]>([]);
  const [statusAnggaranList, setStatusAnggaranList] = useState<any[]>([]);
  const [selectedSkpd, setSelectedSkpd] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // States Data
  const [rawUsulan, setRawUsulan] = useState<any[]>([]);
  const [asistensiList, setAsistensiList] = useState<any[]>([]);
  const [tapdUsers, setTapdUsers] = useState<any[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  // 1. Inisialisasi & Proteksi Admin
  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (prof?.role !== "superadmin" && prof?.role !== "ADMIN") return router.push("/");

      // Ambil Data Referensi
      const [{ data: skpds }, { data: settings }, { data: users }] = await Promise.all([
        supabase.from("skpd").select("kode, nama").order("kode"),
        supabase.from("settings").select("current_status_anggaran, is_locked"),
        supabase.from("profiles").select("id, nama_lengkap, role").eq("role", "TAPD")
      ]);

      if (skpds) setSkpdList(skpds);
      if (settings) {
        setStatusAnggaranList(settings);
        const active = settings.find(s => s.is_locked);
        if (active) setSelectedStatus(active.current_status_anggaran);
      }
      if (users) setTapdUsers(users);
      
      setLoading(false);
    };
    initPage();
  }, [router]);

  // 2. Fetch Data Usulan & Asistensi
  const fetchData = useCallback(async () => {
    let uQuery = supabase.from("usulan").select("*");
    if (selectedSkpd !== "all") uQuery = uQuery.eq("kd_skpd", selectedSkpd);
    if (selectedStatus !== "all") uQuery = uQuery.eq("status_anggaran", selectedStatus);
    
    const [{ data: usulans }, { data: asistensi }] = await Promise.all([
      uQuery.order("kd_skpd"),
      supabase.from("asistensi").select("usulan_id, user_id, rekomendasi")
    ]);

    setRawUsulan(usulans || []);
    setAsistensiList(asistensi || []);
  }, [selectedSkpd, selectedStatus]);

  useEffect(() => { if (!loading) fetchData(); }, [fetchData, loading]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- LOGIKA VIEW: BERDASARKAN TEAM TAPD ---
  const getTapdTree = () => {
    return tapdUsers.map(user => {
      const items = rawUsulan
        .filter(u => u.nama_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(u => {
          const check = asistensiList.find(a => a.usulan_id === u.id && a.user_id === user.id);
          let statusLabel = "BELUM DIASISTENSI";
          let color = "text-slate-400 bg-slate-100 border-slate-200";
          let Icon = Clock;

          if (check) {
            if (check.rekomendasi === "SETUJU") {
              statusLabel = "DISETUJUI";
              color = "text-emerald-600 bg-emerald-50 border-emerald-200";
              Icon = CheckCircle2;
            } else {
              statusLabel = "TIDAK DISETUJUI";
              color = "text-rose-600 bg-rose-50 border-rose-200";
              Icon = XCircle;
            }
          }
          return { ...u, statusLabel, color, Icon };
        });

      const selesai = items.filter(i => i.statusLabel !== "BELUM DIASISTENSI").length;
      return { ...user, items, totalSelesai: selesai };
    });
  };

  // --- LOGIKA VIEW: BERDASARKAN DAFTAR USULAN ---
  const getUsulanTree = () => {
    const grouped: any = {};
    const filteredUsulan = rawUsulan.filter(u => u.nama_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()));

    filteredUsulan.forEach(u => {
      if (!grouped[u.kd_skpd]) {
        grouped[u.kd_skpd] = { 
          nama: skpdList.find(s => s.kode === u.kd_skpd)?.nama || u.nama_skpd, 
          items: [] 
        };
      }
      
      const statusPerTapd = tapdUsers.map(t => {
        const check = asistensiList.find(a => a.usulan_id === u.id && a.user_id === t.id);
        return { 
          nama: t.nama_lengkap, 
          status: check ? check.rekomendasi : "BELUM" 
        };
      });

      grouped[u.kd_skpd].items.push({ ...u, tapdStatus: statusPerTapd });
    });
    return grouped;
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 italic">MEMUAT SISTEM MONITORING...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      
      {/* HEADER & CONTROLS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><ShieldCheck size={24} /></div>
            <div>
              <h1 className="text-sm font-black uppercase italic leading-none">Monitoring Evaluasi TAPD</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Sistem Kendali Superadmin</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
            {/* SEARCH BOX */}
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Kegiatan..." 
                className="w-full text-[10px] font-bold pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 ring-indigo-500/20"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* SWITCHER VIEW */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode("tapd")} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all ${viewMode === 'tapd' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}
              >
                <Users size={14} /> TEAM TAPD
              </button>
              <button 
                onClick={() => setViewMode("usulan")} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all ${viewMode === 'usulan' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}
              >
                <List size={14} /> DAFTAR USULAN
              </button>
            </div>

            <select 
              className="text-[10px] font-black px-4 py-2.5 bg-slate-100 rounded-xl outline-none cursor-pointer border-none"
              value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">SEMUA STATUS</option>
              {statusAnggaranList.map((s, i) => <option key={i} value={s.current_status_anggaran}>{s.current_status_anggaran}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* CONTENT: BERDASARKAN TEAM TAPD */}
      {viewMode === "tapd" && (
        <div className="space-y-4">
          {getTapdTree().map((tapd) => (
            <div key={tapd.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div 
                onClick={() => toggleNode(tapd.id)} 
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-all border-b border-transparent"
              >
                {expandedNodes.includes(tapd.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-xs">
                  {tapd.nama_lengkap.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-tight">{tapd.nama_lengkap}</h3>
                  <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-slate-400 uppercase">
                    <span>PROGRESS ASISTENSI</span>
                    <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
                    <span className="text-indigo-600 font-black">{tapd.totalSelesai} / {tapd.items.length} SELESAI</span>
                  </div>
                </div>
                <div className="hidden md:block w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-700" 
                    style={{ width: `${(tapd.totalSelesai / (tapd.items.length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              {expandedNodes.includes(tapd.id) && (
                <div className="p-4 bg-slate-50/40 space-y-2 border-t border-slate-50">
                  {tapd.items.length > 0 ? (
                    tapd.items.map((u: any) => (
                      <div key={u.id} className="ml-8 bg-white border border-slate-200 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-indigo-300 transition-all shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-indigo-500 uppercase">{u.kd_skpd} - {u.nama_skpd}</span>
                          <span className="text-[10px] font-bold text-slate-700 uppercase italic leading-tight">{u.nama_kegiatan}</span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase ${u.color}`}>
                          <u.Icon size={12} /> {u.statusLabel}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-[10px] font-bold text-slate-400 italic uppercase">Tidak ada data usulan</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CONTENT: BERDASARKAN DAFTAR USULAN */}
      {viewMode === "usulan" && (
        <div className="space-y-4">
          {Object.keys(getUsulanTree()).map((kd) => {
            const group = getUsulanTree()[kd];
            return (
              <div key={kd} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div 
                  onClick={() => toggleNode(kd)} 
                  className="p-4 bg-slate-50/50 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-all"
                >
                  {expandedNodes.includes(kd) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <Building2 size={16} className="text-indigo-600" />
                  <span className="text-[11px] font-black uppercase text-slate-700">{kd} - {group.nama}</span>
                  <span className="ml-auto text-[9px] font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">{group.items.length} USULAN</span>
                </div>

                {expandedNodes.includes(kd) && (
                  <div className="p-4 space-y-5">
                    {group.items.map((u: any) => (
                      <div key={u.id} className="ml-6 border-l-2 border-slate-200 pl-5 relative">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 bg-slate-200 rounded-full"></div>
                        <div className="flex justify-between items-start mb-3">
                           <h4 className="text-[11px] font-black text-slate-800 uppercase italic tracking-tight">○ {u.nama_kegiatan}</h4>
                           <span className="text-[10px] font-black text-slate-400">Rp {Number(u.anggaran).toLocaleString('id-ID')}</span>
                        </div>

                        {/* Grid Status TAPD */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {u.tapdStatus.map((t: any, idx: number) => (
                            <div key={idx} className={`flex items-center justify-between p-2.5 rounded-xl border text-[8px] font-bold transition-all ${
                              t.status === 'BELUM' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                              <div className="flex flex-col truncate pr-2">
                                <span className="text-[7px] text-slate-400 uppercase leading-none mb-1">PERSONIL TAPD:</span>
                                <span className="uppercase truncate">{t.nama}</span>
                              </div>
                              <span className={`px-2 py-1 rounded-md text-[7px] font-black text-white ${t.status === 'BELUM' ? 'bg-rose-500' : 'bg-emerald-600'}`}>
                                {t.status === 'BELUM' ? 'PENDING' : t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}