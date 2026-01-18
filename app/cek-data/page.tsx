"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Users, Building2, ChevronRight, ChevronDown, 
  List, CheckCircle2, Clock, XCircle, ShieldCheck, 
  Search, Loader2, User
} from "lucide-react";

export default function CekDataPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"usulan" | "tapd">("usulan");
  
  // States Filter
  const [skpdList, setSkpdList] = useState<any[]>([]);
  const [statusAnggaranList, setStatusAnggaranList] = useState<any[]>([]);
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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push("/login");

        const { data: prof } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
        if (prof?.role !== "superadmin" && prof?.role !== "ADMIN") return router.push("/");

        const [resSkpd, resSettings, resUsers] = await Promise.all([
          supabase.from("skpd").select("kode, nama").order("kode"),
          supabase.from("settings").select("current_status_anggaran, is_locked"),
          supabase.from("profiles").select("id, nama_lengkap, role, avatar_url").eq("role", "TAPD")
        ]);

        if (resSkpd.data) setSkpdList(resSkpd.data);
        if (resSettings.data) {
          setStatusAnggaranList(resSettings.data);
          const active = resSettings.data.find(s => s.is_locked);
          if (active) setSelectedStatus(active.current_status_anggaran);
        }
        if (resUsers.data) setTapdUsers(resUsers.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [router]);

  // 2. Fetch Data
  const fetchData = useCallback(async () => {
    let uQuery = supabase.from("usulan").select("*");
    if (selectedStatus !== "all") uQuery = uQuery.eq("status_anggaran", selectedStatus);
    
    const [resUsulan, resAsistensi] = await Promise.all([
      uQuery.order("kd_skpd"),
      supabase.from("asistensi").select("usulan_id, user_id, rekomendasi")
    ]);

    setRawUsulan(resUsulan.data || []);
    setAsistensiList(resAsistensi.data || []);
  }, [selectedStatus]);

  useEffect(() => { if (!loading) fetchData(); }, [fetchData, loading]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- LOGIKA: TEAM TAPD (DIKELOMPOKKAN PER SKPD) ---
  const getTapdGroupedData = (tapdUserId: string) => {
    const filtered = rawUsulan.filter(u => u.nama_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()));
    const grouped: any = {};

    filtered.forEach(u => {
      if (!grouped[u.kd_skpd]) {
        grouped[u.kd_skpd] = { 
          namaSkpd: skpdList.find(s => s.kode === u.kd_skpd)?.nama || u.nama_skpd, 
          items: [] 
        };
      }
      const check = asistensiList.find(a => a.usulan_id === u.id && a.user_id === tapdUserId);
      let statusInfo = { label: "PENDING", color: "bg-slate-100 text-slate-400", Icon: Clock };

      if (check) {
        if (check.rekomendasi === "SETUJU") statusInfo = { label: "SETUJU", color: "bg-emerald-500 text-white", Icon: CheckCircle2 };
        else if (check.rekomendasi === "TOLAK") statusInfo = { label: "TOLAK", color: "bg-rose-500 text-white", Icon: XCircle };
      }
      grouped[u.kd_skpd].items.push({ ...u, statusInfo });
    });
    return grouped;
  };

  // --- LOGIKA: DAFTAR USULAN (DIKELOMPOKKAN PER SKPD) ---
  const getUsulanGroupedData = () => {
    const filtered = rawUsulan.filter(u => u.nama_kegiatan.toLowerCase().includes(searchTerm.toLowerCase()));
    const grouped: any = {};

    filtered.forEach(u => {
      if (!grouped[u.kd_skpd]) {
        grouped[u.kd_skpd] = { 
          namaSkpd: skpdList.find(s => s.kode === u.kd_skpd)?.nama || u.nama_skpd, 
          items: [] 
        };
      }
      const tapdStatus = tapdUsers.map(t => {
        const check = asistensiList.find(a => a.usulan_id === u.id && a.user_id === t.id);
        return { 
          nama: t.nama_lengkap, 
          avatar: t.avatar_url,
          rekomendasi: check ? check.rekomendasi : "PENDING" 
        };
      });
      grouped[u.kd_skpd].items.push({ ...u, tapdStatus });
    });
    return grouped;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-indigo-600 mr-2" />
      <span className="font-black text-slate-400 uppercase italic">Sinkronisasi Data...</span>
    </div>
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      
      {/* HEADER & CONTROLS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#002855] text-white rounded-2xl shadow-lg"><ShieldCheck size={24} /></div>
            <div>
              <h1 className="text-sm font-black uppercase italic leading-none">Monitoring Evaluasi TAPD</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Sistem Kendali Superadmin</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto justify-end">
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Cari Kegiatan..." 
                className="w-full text-[10px] font-bold pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl outline-none"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode("tapd")} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${viewMode === 'tapd' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                <Users size={14} className="inline mr-2"/> TEAM TAPD
              </button>
              <button onClick={() => setViewMode("usulan")} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${viewMode === 'usulan' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                <List size={14} className="inline mr-2"/> DAFTAR USULAN
              </button>
            </div>

            <select className="text-[10px] font-black px-4 py-2.5 bg-[#002855] text-white rounded-xl outline-none border-none cursor-pointer" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="all">SEMUA STATUS</option>
              {statusAnggaranList.map((s, i) => <option key={i} value={s.current_status_anggaran}>{s.current_status_anggaran}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW: DAFTAR USULAN (DIKELOMPOKKAN PER SKPD + FOTO TAPD) */}
      {viewMode === "usulan" && (
        <div className="space-y-4">
          {Object.keys(getUsulanGroupedData()).map((kd) => {
            const group = getUsulanGroupedData()[kd];
            return (
              <div key={kd} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div onClick={() => toggleNode(kd)} className="p-4 bg-slate-50/50 flex items-center gap-3 cursor-pointer hover:bg-slate-100 border-b border-slate-100">
                  {expandedNodes.includes(kd) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <Building2 size={16} className="text-indigo-600" />
                  <span className="text-[11px] font-black uppercase text-slate-700">{kd} - {group.namaSkpd}</span>
                </div>

                {expandedNodes.includes(kd) && (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-[8px] font-black text-slate-400 uppercase border-b border-slate-100 bg-slate-50/30">
                          <th className="px-4 py-3 text-left">Nama Kegiatan / Usulan</th>
                          <th className="px-4 py-3 text-right">Pagu Anggaran</th>
                          <th className="px-4 py-3 text-center">Status Rekomendasi TAPD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {group.items.map((u: any) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-4 text-[10px] font-black text-slate-700 uppercase italic leading-tight">{u.nama_kegiatan}</td>
                            <td className="px-4 py-4 text-right text-[10px] font-black text-slate-500">Rp {Number(u.anggaran).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-4">
                              <div className="flex justify-center -space-x-2 hover:space-x-1 transition-all">
                                {u.tapdStatus.map((t: any, idx: number) => (
                                  <div key={idx} className="relative group">
                                    {/* Avatar Frame */}
                                    <div className={`w-9 h-9 rounded-full border-2 bg-white overflow-hidden shadow-sm transition-transform group-hover:scale-110 z-[${10-idx}] ${
                                      t.rekomendasi === 'SETUJU' ? 'border-emerald-500' : 
                                      t.rekomendasi === 'TOLAK' ? 'border-rose-500' : 
                                      'border-slate-200'
                                    }`}>
                                      {t.avatar ? (
                                        <img src={t.avatar} className="w-full h-full object-cover" alt={t.nama} />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                          <User size={14} />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Status Icon Overlay */}
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-white text-white ${
                                      t.rekomendasi === 'SETUJU' ? 'bg-emerald-500' : 
                                      t.rekomendasi === 'TOLAK' ? 'bg-rose-500' : 
                                      'bg-slate-400'
                                    }`}>
                                      {t.rekomendasi === 'SETUJU' ? <CheckCircle2 size={8} /> : 
                                       t.rekomendasi === 'TOLAK' ? <XCircle size={8} /> : 
                                       <Clock size={8} />}
                                    </div>

                                    {/* Hover Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 shadow-xl">
                                      <div className="bg-[#002855] text-white text-[7px] font-black py-1 px-2 rounded whitespace-nowrap uppercase tracking-tighter">
                                        {t.nama} : {t.rekomendasi}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: TEAM TAPD (DIKELOMPOKKAN PER SKPD - TETAP SAMA) */}
      {viewMode === "tapd" && (
        <div className="space-y-4">
          {tapdUsers.map((user) => {
            const groupedData = getTapdGroupedData(user.id);
            return (
              <div key={user.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div onClick={() => toggleNode(user.id)} className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-all border-b border-slate-100">
                  {expandedNodes.includes(user.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <div className="w-10 h-10 bg-[#002855] rounded-xl overflow-hidden flex items-center justify-center shadow-md">
                    {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <span className="text-white text-xs font-black">{user.nama_lengkap.charAt(0)}</span>}
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-700">{user.nama_lengkap}</h3>
                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest italic">Monitoring Per SKPD</p>
                  </div>
                </div>

                {expandedNodes.includes(user.id) && (
                  <div className="p-4 bg-slate-50/30 space-y-6">
                    {Object.keys(groupedData).map((kd) => (
                      <div key={kd} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600 flex items-center gap-2">
                          <Building2 size={12} /> {kd} - {groupedData[kd].namaSkpd}
                        </div>
                        <table className="w-full">
                          <tbody className="divide-y divide-slate-50">
                            {groupedData[kd].items.map((u: any) => (
                              <tr key={u.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-[10px] font-bold text-slate-700 uppercase italic leading-tight">{u.nama_kegiatan}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase ${u.statusInfo.color}`}>
                                    <u.statusInfo.Icon size={10} /> {u.statusInfo.label}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
