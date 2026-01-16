"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  FileCheck, Search, Printer, Eye, LayoutList, 
  Building2, CheckSquare, Square, ShieldCheck, AlertCircle, CheckCircle 
} from "lucide-react"; // PERBAIKAN: Pastikan ini lucide-react, bukan lucide-center

// Library Cetak PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function FinalPengesahanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [skpdList, setSkpdList] = useState<any[]>([]);
  
  const [usulanData, setUsulanData] = useState<any[]>([]); 
  const [laporanFullData, setLaporanFullData] = useState<any[]>([]); 
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedSkpd, setSelectedSkpd] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
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
      setUsulanData(mappedData.filter(u => u.isApprovedByTapd));
      setSelectedIds([]);
    } finally {
      setFetching(false);
    }
  }, [selectedSkpd, skpdList, selectedStatusAnggaran]);

  useEffect(() => { 
    if (currentUser && skpdList.length > 0) fetchData(); 
  }, [fetchData, currentUser, skpdList]);

  // --- FUNGSI CETAK PDF DENGAN SUMMARY TOTAL NOMINAL ---
  const generatePDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    const dateNow = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());

    doc.setFontSize(16).setFont("helvetica", "bold").text("LAPORAN PENGESAHAN DOKUMEN ANGGARAN", 14, 15);
    doc.setFontSize(11).setFont("helvetica", "normal");
    doc.text(`Status Anggaran : ${selectedStatusAnggaran.toUpperCase()}`, 14, 23);
    doc.text(`Unit Kerja      : ${selectedSkpd === 'all' ? 'SEMUA UNIT KERJA' : selectedSkpd}`, 14, 29);
    doc.text(`Tanggal Cetak   : ${dateNow}`, 14, 35);

    // Variabel Summary (Nominal Rp)
    let grandTotalAnggaran = 0;
    let nominalDisetujui = 0;
    let nominalBelumDisetujui = 0;

    const grouped: any = {};
    laporanFullData.forEach(u => {
      const nilai = Number(u.anggaran || 0);
      if (!grouped[u.kd_skpd]) grouped[u.kd_skpd] = { nama: u.nama_unit, items: [], total: 0 };
      grouped[u.kd_skpd].items.push(u);
      grouped[u.kd_skpd].total += nilai;

      // Akumulasi Summary
      grandTotalAnggaran += nilai;
      if (u.status === 'DISETUJUI') {
        nominalDisetujui += nilai;
      } else {
        nominalBelumDisetujui += nilai;
      }
    });

    const tableRows: any[] = [];
    Object.keys(grouped).forEach(kode => {
      const g = grouped[kode];
      tableRows.push([{ 
        content: `[${kode}] ${g.nama} - (TOTAL PAGU: Rp ${g.total.toLocaleString('id-ID')})`, 
        colSpan: 5, 
        styles: { fillColor: [235, 240, 250], fontStyle: 'bold', textColor: [30, 58, 138], fontSize: 10, minCellHeight: 10 } 
      }]);

      g.items.forEach((u: any, idx: number) => {
        tableRows.push([
          { content: `${idx + 1}`, styles: { halign: 'center' } },
          u.nama_kegiatan,
          `Rp ${Number(u.anggaran).toLocaleString('id-ID')}`,
          u.status === 'DISETUJUI' ? 'DISAHKAN' : (u.isApprovedByTapd ? 'MENUNGGU' : 'TIDAK DISETUJUI'),
          u.tanggal_pengesahan ? new Date(u.tanggal_pengesahan).toLocaleDateString('id-ID') : "-"
        ]);
      });
    });

    autoTable(doc, {
      startY: 42,
      head: [['NO', 'USULAN KEGIATAN', 'PAGU ANGGARAN', 'STATUS SAH', 'TANGGAL SAH']],
      body: tableRows,
      headStyles: { fillColor: [15, 23, 42], fontSize: 10, halign: 'center', valign: 'middle' },
      styles: { fontSize: 9, cellPadding: 3, valign: 'middle', lineColor: [200, 200, 200], lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 50 },
        3: { halign: 'center', cellWidth: 45 },
        4: { halign: 'center', cellWidth: 40 }
      },
      theme: 'grid'
    });

    // BOX SUMMARY NOMINAL
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, finalY, 160, 35, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, finalY, 160, 35, "D");

    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30, 41, 59);
    doc.text("RINGKASAN REKAPITULASI ANGGARAN (SUMMARY):", 19, finalY + 8);
    
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`Total Nilai Pagu Usulan             : Rp ${grandTotalAnggaran.toLocaleString('id-ID')}`, 19, finalY + 16);
    doc.setTextColor(22, 101, 52); 
    doc.text(`Total Anggaran Disetujui (Sah)      : Rp ${nominalDisetujui.toLocaleString('id-ID')}`, 19, finalY + 23);
    doc.setTextColor(185, 28, 28); 
    doc.text(`Total Anggaran Belum/Tidak Disetujui : Rp ${nominalBelumDisetujui.toLocaleString('id-ID')}`, 19, finalY + 30);

    doc.save(`Laporan_Pengesahan_${selectedStatusAnggaran}.pdf`);
  };

  const handleAction = async (ids: number[], type: 'SAH' | 'BATAL') => {
    setFetching(true);
    const updateData = type === 'SAH' 
      ? { status: "DISETUJUI", status_pembahasan: "DISETUJUI", tanggal_pengesahan: new Date().toISOString() }
      : { status: "PENGAJUAN", status_pembahasan: "BELUM DIBAHAS", tanggal_pengesahan: null };

    await supabase.from("usulan").update(updateData).in("id", ids);
    await fetchData();
    setFetching(false);
  };

  const filteredDisplay = usulanData.filter(u => u.nama_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase italic">Memuat Data...</div>;

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans text-slate-900">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><FileCheck size={24} /></div>
          <div>
            <h1 className="text-sm font-black uppercase italic leading-none text-slate-800">Pengesahan Dokumen Anggaran</h1>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">User: {currentUser?.nama_lengkap}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
          <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-2 text-[10px] font-black px-4 py-2 rounded-lg transition-all ${showPreview ? 'bg-orange-500 text-white' : 'bg-slate-800 text-white'}`}>
            {showPreview ? <LayoutList size={14} /> : <Eye size={14} />} 
            {showPreview ? "TUTUP REKAP" : "LIHAT REKAP"}
          </button>
          
          <button onClick={generatePDF} className="flex items-center gap-2 bg-emerald-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-emerald-700 shadow-md transition-all active:scale-95">
            <Printer size={14} /> CETAK LAPORAN PDF
          </button>

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden xl:block"></div>

          <select 
            className="text-[10px] font-black px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 outline-none cursor-pointer"
            value={selectedStatusAnggaran} onChange={(e) => setSelectedStatusAnggaran(e.target.value)}
          >
            <option value="all">SEMUA STATUS</option>
            {statusAnggaranList.map((s, idx) => (
              <option key={idx} value={s.current_status_anggaran}>{s.current_status_anggaran}</option>
            ))}
          </select>

          <select 
            className="text-[10px] font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none cursor-pointer w-full md:w-64"
            value={selectedSkpd} onChange={(e) => setSelectedSkpd(e.target.value)}
          >
            <option value="all">SEMUA UNIT KERJA (SKPD)</option>
            {skpdList.map(s => (
              <option key={s.kode} value={s.kode}>{s.kode} - {s.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW: TABEL KERJA */}
      {!showPreview ? (
        <div className="space-y-4">
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari Kegiatan di Sini..." className="w-full text-[11px] font-bold pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:ring-2 ring-indigo-500/10" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-24">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 w-12 text-center">
                    <button onClick={() => selectedIds.length === filteredDisplay.length ? setSelectedIds([]) : setSelectedIds(filteredDisplay.map(u => u.id))}>
                      {selectedIds.length === filteredDisplay.length ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-200" />}
                    </button>
                  </th>
                  <th className="px-6 py-4 italic">Detail Usulan</th>
                  <th className="px-6 py-4 text-right italic">Anggaran</th>
                  <th className="px-6 py-4 text-center italic">Status Sah</th>
                  <th className="px-6 py-4 text-center italic">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDisplay.map((u) => (
                  <tr key={u.id} className={`group hover:bg-indigo-50/20 transition-all ${selectedIds.includes(u.id) ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-6 py-5 text-center">
                      <button onClick={() => setSelectedIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}>
                        {selectedIds.includes(u.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-200" />}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1 mb-1.5"><Building2 size={10}/> {u.nama_unit}</span>
                        <span className="text-[12px] font-bold text-slate-700 uppercase italic leading-tight">{u.nama_kegiatan}</span>
                        {u.tanggal_pengesahan && (
                          <div className="flex items-center gap-1.5 mt-2 text-[8px] font-black text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md border border-emerald-100 uppercase italic">
                            Disahkan: {new Date(u.tanggal_pengesahan).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-slate-900 text-[12px]">Rp {Number(u.anggaran).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg border uppercase ${u.status === 'DISETUJUI' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {u.status === 'DISETUJUI' ? 'FINAL' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => handleAction([u.id], u.status === 'DISETUJUI' ? 'BATAL' : 'SAH')}
                        className={`text-[9px] font-black px-4 py-2 rounded-xl uppercase transition-all shadow-sm ${u.status === 'DISETUJUI' ? 'text-rose-600 border border-rose-100 hover:bg-rose-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                      >
                        {u.status === 'DISETUJUI' ? 'Batal Sah' : 'Sahkan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MONITORING PREVIEW */
        <div className="bg-white rounded-2xl border-2 border-orange-200 overflow-hidden shadow-xl animate-in slide-in-from-top-4 duration-500">
           <div className="bg-orange-500 p-4 text-white text-[11px] font-black uppercase tracking-widest flex justify-between">
              <span>Preview Rekapitulasi Monitoring</span>
           </div>
           <div className="p-6">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-left uppercase font-black">
                    <th className="p-3 border">NO</th>
                    <th className="p-3 border">KEGIATAN / SKPD</th>
                    <th className="p-3 border text-right">ANGGARAN</th>
                    <th className="p-3 border text-center">STATUS TAPD</th>
                    <th className="p-3 border text-center">TGL SAH</th>
                  </tr>
                </thead>
                <tbody>
                  {laporanFullData.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 border text-center font-bold text-slate-400">{i+1}</td>
                      <td className="p-2 border">
                         <p className="font-bold uppercase text-slate-700 leading-tight">{u.nama_kegiatan}</p>
                         <p className="text-[8px] text-indigo-500 mt-1 font-bold uppercase">{u.nama_unit}</p>
                      </td>
                      <td className="p-2 border text-right font-black text-slate-900">Rp {Number(u.anggaran).toLocaleString('id-ID')}</td>
                      <td className={`p-2 border text-center font-black ${u.isApprovedByTapd ? 'text-emerald-600' : 'text-rose-500 italic'}`}>
                         {u.isApprovedByTapd ? 'DISETUJUI' : 'BELUM'}
                      </td>
                      <td className="p-2 border text-center text-slate-500 font-bold">{u.tanggal_pengesahan ? new Date(u.tanggal_pengesahan).toLocaleDateString('id-ID') : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* FLOATING ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-3xl flex items-center gap-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50">
          <div className="flex gap-3">
            <button onClick={() => handleAction(selectedIds, 'SAH')} className="bg-indigo-500 hover:bg-indigo-600 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95 shadow-indigo-500/20">
              <ShieldCheck size={14} /> SAHKAN {selectedIds.length} DATA SEKALIGUS
            </button>
            <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white text-[10px] font-black uppercase px-4 transition-colors">Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}