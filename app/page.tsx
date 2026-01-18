"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, ChevronRight, Folder, List, MessageSquare, AlertCircle, Loader2, Filter, CheckCircle2, XCircle 
} from "lucide-react";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [allUsulan, setAllUsulan] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsulan: 0, disetujui: 0, ditolak: 0, totalAnggaran: 0 });
  const [expandedSkpd, setExpandedSkpd] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsulanAndAsistensi = useCallback(async (userProfile: any, statusFilter: string) => {
    if (!statusFilter || !userProfile) return;
    
    try {
      const filterValue = String(statusFilter).trim();
      
      // 1. Ambil data usulan tanpa join untuk menghindari error relasi
      let queryUsulan = supabase
        .from("usulan")
        .select(`*`) 
        .eq("status_anggaran", filterValue);

      if (userProfile.role === "SKPD (OPD)") {
        queryUsulan = queryUsulan.eq("kd_skpd", userProfile.kd_skpd);
      }

      const { data: usulanData, error: uErr } = await queryUsulan;
      if (uErr) throw uErr;

      if (usulanData && usulanData.length > 0) {
        // 2. Ambil referensi nama SKPD secara terpisah dari tabel skpd
        const { data: skpdData } = await supabase.from("skpd").select("kode, nama");

        // 3. Ambil data asistensi
        const usulanIds = usulanData.map(u => u.id);
        const { data: asistensiData } = await supabase
          .from("asistensi")
          .select("usulan_id, rekomendasi")
          .in("usulan_id", usulanIds);

        // 4. Gabungkan data secara manual di frontend
        const mergedData = usulanData.map(u => {
          const infoSkpd = skpdData?.find(s => s.kode === u.kd_skpd);
          return {
            ...u,
            nama_skpd_label: infoSkpd?.nama || u.nama_skpd || "SKPD Tidak Terdaftar",
            rekomendasi_tapd: asistensiData?.find(a => a.usulan_id === u.id)?.rekomendasi || null
          };
        });

        setAllUsulan(mergedData);
        setStats({
          totalUsulan: mergedData.length,
          disetujui: mergedData.filter(d => d.tanggal_pengesahan !== null).length,
          ditolak: mergedData.filter(d => d.tanggal_pengesahan === null).length,
          totalAnggaran: mergedData.reduce((acc, curr) => acc + (Number(curr.anggaran) || 0), 0)
        });
      } else {
        setAllUsulan([]);
        setStats({ totalUsulan: 0, disetujui: 0, ditolak: 0, totalAnggaran: 0 });
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setErrorMsg("Gagal memuat data: " + err.message);
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Silakan login kembali.");

        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(prof);

        const { data: settingsData } = await supabase.from("settings").select("*").order("id", { ascending: true });
        setStatusOptions(settingsData || []);

        const activeStatus = settingsData?.find(s => s.is_locked === true);
        setSelectedStatus(activeStatus?.current_status_anggaran || settingsData?.[0]?.current_status_anggaran || "");

      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedStatus && profile) {
      fetchUsulanAndAsistensi(profile, selectedStatus);
    }
  }, [selectedStatus, profile, fetchUsulanAndAsistensi]);

  const renderTableSection = (isApproved: boolean) => {
    const filtered = allUsulan.filter(d => isApproved ? d.tanggal_pengesahan !== null : d.tanggal_pengesahan === null);
    const grouped = filtered.reduce((acc: any, curr: any) => {
      const key = curr.kd_skpd || "NON-SKPD";
      if (!acc[key]) acc[key] = { nama: curr.nama_skpd_label, items: [], total: 0 };
      acc[key].items.push(curr);
      acc[key].total += Number(curr.anggaran) || 0;
      return acc;
    }, {});

    return (
      <div className="mb-10 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`p-4 flex items-center gap-2 font-black text-xs uppercase tracking-widest ${isApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {isApproved ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          Daftar Usulan {isApproved ? 'Disetujui' : 'Belum Disetujui / Ditolak'}
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
            <tr>
              <th className="px-6 py-3 w-2/3">SKPD / Nama Kegiatan</th>
              <th className="px-6 py-3 text-right">Anggaran (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.keys(grouped).length === 0 ? (
              <tr><td colSpan={2} className="p-10 text-center text-xs text-slate-400 italic">Tidak ada data</td></tr>
            ) : (
              Object.keys(grouped).map((kd) => (
                <React.Fragment key={kd + (isApproved ? 'acc' : 'rej')}>
                  <tr className="bg-slate-50/30 cursor-pointer hover:bg-white transition-colors" 
                      onClick={() => setExpandedSkpd(prev => prev.includes(kd + isApproved) ? prev.filter(i => i !== kd + isApproved) : [...prev, kd + isApproved])}>
                    <td className="px-6 py-4 flex items-center gap-3 font-bold text-slate-700 text-xs uppercase">
                      <ChevronRight size={14} className={`transition-transform ${expandedSkpd.includes(kd + isApproved) ? 'rotate-90' : ''}`} />
                      <Folder size={16} className={isApproved ? "text-emerald-500" : "text-rose-400"} />
                      {kd} - {grouped[kd].nama}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 text-xs">
                        <div className="flex flex-col items-end">
                            <span>{grouped[kd].total.toLocaleString('id-ID')}</span>
                            <span className="text-[8px] text-slate-400 font-bold uppercase">{grouped[kd].items.length} ITEM</span>
                        </div>
                    </td>
                  </tr>
                  {expandedSkpd.includes(kd + isApproved) && grouped[kd].items.map((item: any, i: number) => (
                    <tr key={i} className="bg-white">
                      <td className="px-16 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-slate-600 uppercase leading-tight">{item.nama_kegiatan}</span>
                          {item.rekomendasi_tapd && (
                            <div className="flex items-start gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100 italic text-[10px] text-blue-700">
                              <MessageSquare size={12} className="mt-0.5 shrink-0" />
                              <span>Rekomendasi: {item.rekomendasi_tapd}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 italic align-top">{Number(item.anggaran).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen font-sans">
      {/* HEADER DAN FILTER TETAP SAMA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" /> Monitor Realisasi Usulan
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-8">Petugas: {profile?.nama_lengkap} | {profile?.role}</p>
        </div>
        
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
          <label className="text-[10px] font-black text-slate-400 uppercase px-2 flex items-center gap-1"><Filter size={12}/> Tahap Anggaran:</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border-none text-xs font-bold rounded-lg py-2 px-4 focus:ring-0 cursor-pointer text-blue-700"
          >
            {statusOptions.map((opt, idx) => (
              <option key={idx} value={opt.current_status_anggaran}>{opt.current_status_anggaran}</option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200 text-xs font-bold uppercase"><AlertCircle size={16}/> {errorMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Total Disetujui" value={stats.disetujui} sub="ITEM" color="emerald" />
        <StatCard title="Belum Disetujui" value={stats.ditolak} sub="ITEM" color="rose" />
        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border-b-4 border-blue-500">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total Pagu Tahap {selectedStatus}</p>
          <p className="text-xl font-black text-white mt-1">Rp {stats.totalAnggaran.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {renderTableSection(true)}
      {renderTableSection(false)}
    </div>
  );
}

function StatCard({ title, value, sub, color }: any) {
  const baseColor = color === 'emerald' ? 'border-emerald-500 text-emerald-600' : 'border-rose-500 text-rose-600';
  return (
    <div className={`bg-white p-6 rounded-2xl border-b-4 ${baseColor} shadow-sm`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-2xl font-black mt-1 text-slate-900">{value} <span className="text-xs text-slate-300 font-bold uppercase">{sub}</span></p>
    </div>
  );
}
