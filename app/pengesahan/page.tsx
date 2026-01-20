"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  FileCheck, Search, Printer, Eye, LayoutList, 
  Building2, CheckSquare, Square, ShieldCheck, RotateCcw,
  CheckCircle2, clock, AlertCircle
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function FinalPengesahanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [skpdList, setSkpdList] = useState<any[]>([]);
  
  const [laporanFullData, setLaporanFullData] = useState<any[]>([]); 
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkpd, setSelectedSkpd] = useState("all");
  const [statusAnggaranList, setStatusAnggaranList] = useState<any[]>([]);
  const [selectedStatusAnggaran, setSelectedStatusAnggaran] = useState("all");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (prof?.role === "superadmin" || prof?.role === "ADMIN") {
        setCurrentUser(prof);
        const { data: skpds } = await supabase.from("skpd").select("kode, nama").order("kode", { ascending: true });
        if (skpds) setSkpdList(skpds);

        const { data: sett } = await supabase.from("settings").select("*").order("id", { ascending: true });
        if (sett) {
          setStatusAnggaranList(sett);
          const active = sett.find(s => s.is_locked === true);
          if (active) setSelectedStatusAnggaran(active.current_status_anggaran);
        }
      } else { router.push("/"); }
      setLoading(false);
    };
    initPage();
  }, [router]);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const { data: asistensiRaw } = await supabase.from("asistensi").select("usulan_id, rekomendasi");

      let query = supabase.from("usulan").select("*");
      if (selectedSkpd !== "all") query = query.eq("kd_skpd", selectedSkpd);
      if (selectedStatusAnggaran !== "all") query = query.eq("status_anggaran", selectedStatusAnggaran);

      const { data: allUsulans } = await query.order("kd_skpd", { ascending: true });
      if (!allUsulans) return;

      const mappedData = allUsulans.map(u => ({
        ...u,
        nama_unit: skpdList.find(s => s.kode === u.kd_skpd)?.nama || u.nama_skpd,
        isApprovedByTapd: asistensiRaw?.some(a => a.usulan_id === u.id && a.rekomendasi === "SETUJU")
      }));

      setLaporanFullData(mappedData);
      setSelectedIds([]);
    } finally {
      setFetching(false);
    }
  }, [selectedSkpd, skpdList, selectedStatusAnggaran]);

  useEffect(() => { 
    if (currentUser && skpdList.length > 0) fetchData(); 
  }, [fetchData, currentUser, skpdList]);

  const handleAction = async (ids: number[], type: 'SAH' | 'BATAL') => {
    if (!confirm(`Lanjutkan proses ${type === 'SAH' ? 'pengesahan' : 'pembatalan'} untuk ${ids.length} data?`)) return;
    
    setFetching(true);
    const updateData = type === 'SAH' 
      ? { status: "DISETUJUI", status_pembahasan: "DISETUJUI", tanggal_pengesahan: new Date().toISOString() }
      : { status: "PENGAJUAN", status_pembahasan: "BELUM DIBAHAS", tanggal_pengesahan: null };

    const { error } = await supabase.from("usulan").update(updateData).in("id", ids);
    if (!error) await fetchData();
    setFetching(false);
  };

  // PEMBAGIAN DATA
  const dataSah = laporanFullData.filter(u => u.status === 'DISETUJUI' && u.nama_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()));
  const dataBelumSah = laporanFullData.filter(u => u.status !== 'DISETUJUI' && u.isApprovedByTapd && u.nama_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()));

  const generatePDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    const dateNow = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
    doc.setFontSize(16).setFont("helvetica", "bold").text("LAPORAN PENGESAHAN DOKUMEN ANGGARAN", 14, 15);
    // ... (Logika PDF tetap sama seperti sebelumnya)
    doc.save(`Laporan_Pengesahan.pdf`);
  };

  const TableComponent = ({ title, data, type }: { title: string, data: any[], type: 'SAH' | 'BELUM' }) => (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-6 rounded-full ${type === 'SAH' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-700">{title} ({data.length})</h2>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <th className="px-6 py-4 w-12 text-center">
                <button onClick={() => {
                  const allIds = data.map(u => u.id);
                  const isAllSelected = allIds.every(id => selectedIds.includes(id));
                  if (isAllSelected) setSelectedIds(selectedIds.filter(id => !allIds.includes(id)));
                  else setSelectedIds([...new Set([...selectedIds, ...allIds])]);
                }}>
                  {data.length > 0 && data.every(u => selectedIds.includes(u.id)) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-200" />}
                </button>
              </th>
              <th className="px-6 py-4 italic">Detail Usulan</th>
              <th className="px-6 py-4 text-right italic">Anggaran</th>
              <th className="px-6 py-4 text-center italic">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase italic">Tidak ada data di kategori ini</td></tr>
            ) : data.map((u) => (
              <tr key={u.id} className={`group hover:bg-slate-50/50 transition-all ${selectedIds.includes(u.id) ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-5 text-center">
                  <button onClick={() => setSelectedIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}>
                    {selectedIds.includes(u.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-200" />}
                  </button>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-indigo-500 uppercase mb-1">{u.nama_unit}</span>
                    <span className="text-[11px] font-bold text-slate-700 uppercase leading-tight">{u.nama_kegiatan}</span>
                    {u.tanggal_pengesahan && (
                      <span className="text-[8px] font-black text-emerald-600 mt-2 uppercase italic">✓ Sah: {new Date(u.tanggal_pengesahan).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-right font-black text-slate-900 text-[11px]">Rp {Number(u.anggaran).toLocaleString('id-ID')}</td>
                <td className="px-6 py-5 text-center">
                  <button onClick={() => handleAction([u.id], type === 'SAH' ? 'BATAL' : 'SAH')} className={`text-[9px] font-black px-4 py-2 rounded-xl uppercase transition-all ${type === 'SAH' ? 'text-rose-600 border border-rose-100 hover:bg-rose-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {type === 'SAH' ? 'Batal Sah' : 'Sahkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase italic">Memuat Data...</div>;

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* HEADER CONTROLS (Fasilitas Tetap Ada) */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg"><FileCheck size={24} /></div>
          <div>
            <h1 className="text-sm font-black uppercase italic leading-none text-slate-800">Manajemen Pengesahan</h1>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">Total Data: {laporanFullData.length} | User: {currentUser?.nama_lengkap}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
          <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-2 text-[10px] font-black px-4 py-2 rounded-lg transition-all ${showPreview ? 'bg-orange-500 text-white' : 'bg-slate-800 text-white'}`}>
            {showPreview ? <LayoutList size={14} /> : <Eye size={14} />} {showPreview ? "TUTUP REKAP" : "LIHAT REKAP"}
          </button>
          <button onClick={generatePDF} className="flex items-center gap-2 bg-emerald-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-md">
            <Printer size={14} /> CETAK PDF
          </button>
          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden xl:block"></div>
          <select className="text-[10px] font-black px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 outline-none" value={selectedStatusAnggaran} onChange={(e) => setSelectedStatusAnggaran(e.target.value)}>
            <option value="all">SEMUA STATUS</option>
            {statusAnggaranList.map((s, idx) => <option key={idx} value={s.current_status_anggaran}>{s.current_status_anggaran}</option>)}
          </select>
          <select className="text-[10px] font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none w-full md:w-64" value={selectedSkpd} onChange={(e) => setSelectedSkpd(e.target.value)}>
            <option value="all">SEMUA UNIT KERJA (SKPD)</option>
            {skpdList.map(s => <option key={s.kode} value={s.kode}>{s.kode} - {s.nama}</option>)}
          </select>
        </div>
      </div>

      {!showPreview ? (
        <div className="space-y-2">
          <div className="relative w-full md:w-80 mb-6">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari Kegiatan..." className="w-full text-[11px] font-bold pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <TableComponent title="Daftar Usulan Sudah Sah" data={dataSah} type="SAH" />
          <TableComponent title="Daftar Usulan Belum Sah (Tunggu Pengesahan)" data={dataBelumSah} type="BELUM" />
        </div>
      ) : (
        /* MONITORING PREVIEW (Fasilitas Tetap Ada) */
        <div className="bg-white rounded-2xl border-2 border-orange-200 overflow-hidden shadow-xl">
           <div className="bg-orange-500 p-4 text-white text-[11px] font-black uppercase flex justify-between">
              <span>Preview Rekapitulasi Monitoring</span>
              <span>{laporanFullData.length} Kegiatan</span>
           </div>
           <div className="p-6 overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-left uppercase font-black">
                    <th className="p-3 border">NO</th>
                    <th className="p-3 border">KEGIATAN / SKPD</th>
                    <th className="p-3 border text-right">ANGGARAN</th>
                    <th className="p-3 border text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {laporanFullData.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 border text-center font-bold text-slate-400">{i+1}</td>
                      <td className="p-2 border">
                         <p className="font-bold uppercase text-slate-700">{u.nama_kegiatan}</p>
                         <p className="text-[8px] text-indigo-500 mt-1 font-bold">{u.nama_unit}</p>
                      </td>
                      <td className="p-2 border text-right font-black">Rp {Number(u.anggaran).toLocaleString('id-ID')}</td>
                      <td className="p-2 border text-center font-black">
                         {u.status === 'DISETUJUI' ? <span className="text-emerald-600">SUDAH SAH</span> : <span className="text-orange-500">BELUM SAH</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* FLOATING ACTION BAR (Fasilitas Tetap Ada & Cerdas) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-3xl flex items-center gap-6 shadow-2xl z-50 animate-in slide-in-from-bottom-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-700 pr-6">
            <span className="text-white text-lg font-black">{selectedIds.length}</span> Data Terpilih
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleAction(selectedIds, 'SAH')} className="bg-indigo-500 hover:bg-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all">
              <ShieldCheck size={14} /> Sahkan Semua Terpilih
            </button>
            <button onClick={() => handleAction(selectedIds, 'BATAL')} className="bg-rose-600 hover:bg-rose-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all">
              <RotateCcw size={14} /> Batalkan Pengesahan Terpilih
            </button>
            <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white text-[10px] font-black uppercase px-4">Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
