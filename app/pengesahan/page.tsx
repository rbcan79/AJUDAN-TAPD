"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  FileCheck, Search, Printer, Eye, LayoutList, 
  Building2, CheckSquare, Square, ShieldCheck, RotateCcw,
  CheckCircle2, Clock, AlertCircle // PERBAIKAN: Clock (Huruf Besar)
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Interface untuk menghindari error TypeScript 'any'
interface Usulan {
  id: number;
  kd_skpd: string;
  nama_unit: string;
  nama_kegiatan: string;
  anggaran: number;
  status: string;
  status_pembahasan: string;
  tanggal_pengesahan: string | null;
  isApprovedByTapd: boolean;
}

export default function FinalPengesahanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [skpdList, setSkpdList] = useState<any[]>([]);
  
  const [laporanFullData, setLaporanFullData] = useState<Usulan[]>([]); 
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

      const mappedData: Usulan[] = allUsulans.map(u => ({
        ...u,
        nama_unit: skpdList.find(s => s.kode === u.kd_skpd)?.nama || u.nama_skpd,
        isApprovedByTapd: asistensiRaw?.some(a => a.usulan_id === u.id && a.rekomendasi === "SETUJU") || false
      }));

      setLaporanFullData(mappedData);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
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

  const dataSah = laporanFullData.filter(u => u.status === 'DISETUJUI' && u.nama_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()));
  const dataBelumSah = laporanFullData.filter(u => u.status !== 'DISETUJUI' && u.isApprovedByTapd && u.nama_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()));

  const generatePDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    autoTable(doc, { 
        startY: 20,
        head: [['NO', 'KEGIATAN', 'ANGGARAN', 'STATUS']],
        body: laporanFullData.map((u, i) => [i+1, u.nama_kegiatan, u.anggaran, u.status])
    });
    doc.save(`Laporan_Pengesahan.pdf`);
  };

  // Komponen Tabel
  const TableComponent = ({ title, data, type }: { title: string, data: Usulan[], type: 'SAH' | 'BELUM' }) => (
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
                <input 
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={data.length > 0 && data.every(u => selectedIds.includes(u.id))}
                  onChange={() => {
                    const allIds = data.map(u => u.id);
                    const isAllSelected = allIds.every(id => selectedIds.includes(id));
                    if (isAllSelected) setSelectedIds(selectedIds.filter(id => !allIds.includes(id)));
                    else setSelectedIds([...new Set([...selectedIds, ...allIds])]);
                  }}
                />
              </th>
              <th className="px-6 py-4 italic">Detail Usulan</th>
              <th className="px-6 py-4 text-right italic">Anggaran</th>
              <th className="px-6 py-4 text-center italic">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase italic">Tidak ada data</td></tr>
            ) : data.map((u) => (
              <tr key={u.id} className={`group hover:bg-slate-50/50 transition-all ${selectedIds.includes(u.id) ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-5 text-center">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => setSelectedIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}
                  />
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-indigo-500 uppercase mb-1">{u.nama_unit}</span>
                    <span className="text-[11px] font-bold text-slate-700 uppercase leading-tight">{u.nama_kegiatan}</span>
                    {u.tanggal_pengesahan && (
                      <span className="text-[8px] font-black text-emerald-600 mt-2 uppercase italic flex items-center gap-1">
                        <CheckCircle2 size={10} /> Sah: {new Date(u.tanggal_pengesahan).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-right font-black text-slate-900 text-[11px]">Rp {Number(u.anggaran).toLocaleString('id-ID')}</td>
                <td className="px-6 py-5 text-center">
                  <button onClick={() => handleAction([u.id], type === 'SAH' ? 'BATAL' : 'SAH')} className={`text-[9px] font-black px-4 py-2 rounded-xl uppercase transition-all ${type === 'SAH' ? 'text-rose-600 border border-rose-100 hover:bg-rose-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {type === 'SAH' ? 'Batal' : 'Sahkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg"><FileCheck size={24} /></div>
          <div>
            <h1 className="text-sm font-black uppercase italic leading-none text-slate-800">Manajemen Pengesahan</h1>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">User: {currentUser?.nama_lengkap || 'Admin'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
          <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 text-[10px] font-black px-4 py-2 rounded-lg bg-slate-800 text-white">
            {showPreview ? <LayoutList size={14} /> : <Eye size={14} />} {showPreview ? "TUTUP REKAP" : "LIHAT REKAP"}
          </button>
          <button onClick={generatePDF} className="flex items-center gap-2 bg-emerald-600 text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-md">
            <Printer size={14} /> CETAK PDF
          </button>
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
            <input type="text" placeholder="Cari Kegiatan..." className="w-full text-[11px] font-bold pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none shadow-sm" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <TableComponent title="Daftar Usulan Sudah Sah" data={dataSah} type="SAH" />
          <TableComponent title="Daftar Usulan Belum Sah" data={dataBelumSah} type="BELUM" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-orange-200 overflow-hidden shadow-xl p-6">
           <h3 className="font-black text-orange-600 mb-4 uppercase italic">Rekapitulasi Monitoring</h3>
           <table className="w-full text-[10px] border">
              <thead className="bg-slate-100">
                <tr>
                    <th className="p-2 border">KEGIATAN</th>
                    <th className="p-2 border">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {laporanFullData.map((u, i) => (
                    <tr key={i}>
                        <td className="p-2 border font-bold">{u.nama_kegiatan}</td>
                        <td className="p-2 border text-center">{u.status}</td>
                    </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-3xl flex items-center gap-6 shadow-2xl z-50">
          <span className="text-[10px] font-black uppercase"><span className="text-emerald-400 text-lg">{selectedIds.length}</span> Data Terpilih</span>
          <div className="flex gap-2">
            <button onClick={() => handleAction(selectedIds, 'SAH')} className="bg-indigo-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
              <ShieldCheck size={14} /> Sahkan
            </button>
            <button onClick={() => handleAction(selectedIds, 'BATAL')} className="bg-rose-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
              <RotateCcw size={14} /> Batalkan
            </button>
            <button onClick={() => setSelectedIds([])} className="text-slate-400 text-[10px] font-black uppercase px-4">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
