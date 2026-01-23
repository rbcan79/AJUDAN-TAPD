"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  FileCheck, Search, Printer, Eye, LayoutList, 
  Building2, ShieldCheck, RotateCcw,
  CheckCircle2, Clock, ChevronDown, ChevronUp, Wallet, Calendar
} from "lucide-react";

// Import jsPDF & AutoTable
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Usulan {
  id: number;
  kd_skpd: string;
  nama_unit: string;
  nama_kegiatan: string;
  narasi: string;
  anggaran: number;
  status: string;
  status_pembahasan: string;
  status_anggaran: string;
  tanggal_pengesahan: string | null;
  pctSetuju: number;
  pctTolak: number;
  pctBelum: number;
}

export default function FinalPengesahanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [skpdList, setSkpdList] = useState<any[]>([]);
  const [tapdUsers, setTapdUsers] = useState<any[]>([]);
  
  const [laporanFullData, setLaporanFullData] = useState<Usulan[]>([]); 
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkpd, setSelectedSkpd] = useState("all");
  const [statusAnggaranList, setStatusAnggaranList] = useState<any[]>([]);
  const [selectedStatusAnggaran, setSelectedStatusAnggaran] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showPreviewMode, setShowPreviewMode] = useState(false);

  const tanggalHariIni = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    const initPage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (prof?.role === "superadmin" || prof?.role === "ADMIN") {
        setCurrentUser(prof);
        const [resSkpd, resSett, resTapd] = await Promise.all([
          supabase.from("skpd").select("kode, nama").order("kode"),
          supabase.from("settings").select("*").order("id"),
          supabase.from("profiles").select("id").eq("role", "TAPD")
        ]);
        if (resSkpd.data) setSkpdList(resSkpd.data);
        if (resTapd.data) setTapdUsers(resTapd.data);
        if (resSett.data) {
          setStatusAnggaranList(resSett.data);
          const active = resSett.data.find(s => s.is_locked === true);
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

      const totalTapd = tapdUsers.length || 1;
      const mappedData: Usulan[] = allUsulans.map(u => {
        const listAsistensi = asistensiRaw?.filter(a => a.usulan_id === u.id) || [];
        const setuju = listAsistensi.filter(a => a.rekomendasi === "SETUJU").length;
        const tolak = listAsistensi.filter(a => a.rekomendasi === "TIDAK SETUJU").length;
        return {
          ...u,
          nama_unit: skpdList.find(s => s.kode === u.kd_skpd)?.nama || u.nama_skpd,
          pctSetuju: Math.round((setuju / totalTapd) * 100),
          pctTolak: Math.round((tolak / totalTapd) * 100),
          pctBelum: Math.round(((totalTapd - listAsistensi.length) / totalTapd) * 100)
        };
      });
      setLaporanFullData(mappedData);
      setSelectedIds([]);
    } catch (e) { console.error(e); } finally { setFetching(false); }
  }, [selectedSkpd, skpdList, selectedStatusAnggaran, tapdUsers]);

  useEffect(() => { 
    if (currentUser && skpdList.length > 0 && tapdUsers.length > 0) fetchData(); 
  }, [fetchData, currentUser, skpdList, tapdUsers]);

  const handleAction = async (ids: number[], type: 'SAH' | 'BATAL') => {
    if (!confirm(`Lanjutkan proses untuk ${ids.length} data?`)) return;
    setFetching(true);
    const updateData = type === 'SAH' 
      ? { status: "DISETUJUI", status_pembahasan: "DISETUJUI", tanggal_pengesahan: new Date().toISOString() }
      : { status: "PENGAJUAN", status_pembahasan: "BELUM DIBAHAS", tanggal_pengesahan: null };

    const { error } = await supabase.from("usulan").update(updateData).in("id", ids);
    if (!error) await fetchData();
    setFetching(false);
  };

  const filteredData = useMemo(() => {
    return laporanFullData.filter(u => u.nama_kegiatan?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [laporanFullData, searchTerm]);

  const groupByCategory = (data: Usulan[]) => {
    return data.reduce((acc: Record<string, Usulan[]>, curr: Usulan) => {
      const key = curr.kd_skpd;
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {});
  };

  const dataSudahSahGrouped = useMemo(() => groupByCategory(filteredData.filter(u => u.status === 'DISETUJUI')), [filteredData]);
  const dataBelumSahGrouped = useMemo(() => groupByCategory(filteredData.filter(u => u.status !== 'DISETUJUI')), [filteredData]);

  const generatePDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    const approvedData = laporanFullData.filter(u => u.status === 'DISETUJUI');
    const grandTotal = approvedData.reduce((sum, item) => sum + Number(item.anggaran), 0);
    
    doc.setFontSize(11);
    doc.text("REKAPITULASI ANGGARAN DISAHKAN", 148, 12, { align: "center" });
    doc.setFontSize(8);
    doc.text(`TAHAP: ${selectedStatusAnggaran.toUpperCase()} | TANGGAL CETAK: ${tanggalHariIni}`, 148, 17, { align: "center" });

    autoTable(doc, { 
        startY: 22,
        head: [['NO', 'SKPD', 'NAMA KEGIATAN', 'NARASI / RINCIAN', 'SETUJU', 'TOLAK', 'BELUM', 'ANGGARAN (RP)']],
        body: approvedData.map((u, i) => [
            i + 1, u.kd_skpd, u.nama_kegiatan.toUpperCase(), u.narasi || '-', `${u.pctSetuju}%`, `${u.pctTolak}%`, `${u.pctBelum}%`, Number(u.anggaran).toLocaleString('id-ID')
        ]),
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 0: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'right' } },
        foot: [['', '', '', '', '', '', 'TOTAL KESELURUHAN', `Rp ${grandTotal.toLocaleString('id-ID')}`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 }
    });
    doc.save(`Rekap_Sah_${selectedStatusAnggaran}.pdf`);
  };

  const TableGroup = ({ groupedData, type }: { groupedData: Record<string, Usulan[]>, type: 'SAH' | 'BELUM' }) => (
    <div className="space-y-4">
      {Object.keys(groupedData).map((kdSkpd) => {
        const totalAnggaranGrup = groupedData[kdSkpd].reduce((sum, item) => sum + Number(item.anggaran), 0);
        return (
          <div key={kdSkpd + type} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div 
              onClick={() => setExpandedGroups(prev => prev.includes(kdSkpd + type) ? prev.filter((k: string) => k !== kdSkpd + type) : [...prev, kdSkpd + type])}
              className="p-4 bg-slate-50/50 flex items-center justify-between cursor-pointer border-b border-slate-100"
            >
              <div className="flex items-center gap-4 flex-1">
                {expandedGroups.includes(kdSkpd + type) ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight">
                      {kdSkpd} - {skpdList.find(s => s.kode === kdSkpd)?.nama || 'UNIT KERJA'}
                    </span>
                    <span className="text-[9px] font-black text-indigo-600 flex items-center gap-1 mt-0.5">
                        <Wallet size={10} /> Rp {totalAnggaranGrup.toLocaleString('id-ID')}
                    </span>
                </div>
              </div>
              <input 
                type="checkbox"
                className="w-5 h-5 rounded accent-indigo-600 cursor-pointer mr-2"
                checked={groupedData[kdSkpd].length > 0 && groupedData[kdSkpd].every((u: Usulan) => selectedIds.includes(u.id))}
                onChange={() => {
                  const ids = groupedData[kdSkpd].map((u: Usulan) => u.id);
                  if (ids.every((id: number) => selectedIds.includes(id))) {
                    setSelectedIds(prev => prev.filter((id: number) => !ids.includes(id)));
                  } else {
                    setSelectedIds(prev => [...new Set([...prev, ...ids])]);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {expandedGroups.includes(kdSkpd + type) && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-[9px] font-black text-white uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3 w-12 text-center border-r border-slate-700">Pilih</th>
                      <th className="px-6 py-3 border-r border-slate-700">Usulan & Narasi</th>
                      <th className="px-6 py-3 text-right border-r border-slate-700">Anggaran</th>
                      {/* Judul Kolom Asistensi Baru */}
                      <th className="px-2 py-3 text-center border-r border-slate-700 bg-emerald-800/50">Setuju</th>
                      <th className="px-2 py-3 text-center border-r border-slate-700 bg-rose-800/50">Tolak</th>
                      <th className="px-2 py-3 text-center bg-slate-800/50">Belum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedData[kdSkpd].map((u: Usulan) => (
                      <tr key={u.id} className={`hover:bg-slate-50 transition-all ${selectedIds.includes(u.id) ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-6 py-4 text-center border-r border-slate-50">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(u.id)} 
                            onChange={() => setSelectedIds(prev => prev.includes(u.id) ? prev.filter((i: number) => i !== u.id) : [...prev, u.id])} 
                          />
                        </td>
                        <td className="px-6 py-4 border-r border-slate-50">
                          <p className="text-[10px] font-bold text-slate-700 uppercase leading-tight">{u.nama_kegiatan}</p>
                          <p className="text-[9px] text-slate-500 mt-1 italic leading-relaxed border-l-2 border-slate-200 pl-2">{u.narasi || "-"}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 text-[10px] border-r border-slate-50 whitespace-nowrap">
                          Rp {Number(u.anggaran).toLocaleString('id-ID')}
                        </td>
                        
                        {/* Isi Kolom Asistensi Tanpa Huruf S,T,B */}
                        <td className="px-2 py-4 text-center border-r border-slate-50 font-black text-emerald-600 text-[11px] bg-emerald-50/20">{u.pctSetuju}%</td>
                        <td className="px-2 py-4 text-center border-r border-slate-50 font-black text-rose-600 text-[11px] bg-rose-50/20">{u.pctTolak}%</td>
                        <td className="px-2 py-4 text-center font-black text-slate-400 text-[11px] bg-slate-50/20">{u.pctBelum}%</td>
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
  );

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg"><FileCheck size={24} /></div>
          <div>
            <h1 className="text-sm font-black uppercase italic leading-none tracking-tight text-slate-800">Finalisasi Pengesahan</h1>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic italic leading-none">Persetujuan Akhir Anggaran TAPD</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
          <button onClick={() => setShowPreviewMode(!showPreviewMode)} className="flex items-center gap-2 bg-slate-800 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-slate-700 transition-all">
            {showPreviewMode ? <LayoutList size={14} /> : <Eye size={14} />} {showPreviewMode ? "KEMBALI KE TABEL" : "PRATINJAU REKAP"}
          </button>
          <button onClick={generatePDF} className="flex items-center gap-2 bg-emerald-600 text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-md hover:bg-emerald-700 transition-all">
            <Printer size={14} /> CETAK PDF
          </button>
          <select className="text-[10px] font-black px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 outline-none cursor-pointer" value={selectedStatusAnggaran} onChange={(e) => setSelectedStatusAnggaran(e.target.value)}>
            <option value="all">SEMUA TAHAP</option>
            {statusAnggaranList.map((s, idx) => <option key={idx} value={s.current_status_anggaran}>{s.current_status_anggaran}</option>)}
          </select>
          <select className="text-[10px] font-bold px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none w-full md:w-64 cursor-pointer" value={selectedSkpd} onChange={(e) => setSelectedSkpd(e.target.value)}>
            <option value="all">SEMUA SKPD</option>
            {skpdList.map(s => <option key={s.kode} value={s.kode}>{s.kode} - {s.nama}</option>)}
          </select>
        </div>
      </div>

      {!showPreviewMode ? (
        <>
          <div className="relative w-full md:w-80 mb-6">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari Kegiatan..." className="w-full text-[11px] font-bold pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-500 transition-all" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4 border-l-4 border-emerald-500 pl-3">
              <CheckCircle2 size={16} className="text-emerald-600"/>
              <h2 className="text-[11px] font-black uppercase text-slate-800 italic">Daftar Usulan Sudah Sah</h2>
            </div>
            <TableGroup groupedData={dataSudahSahGrouped} type="SAH" />
          </div>

          <div className="mb-24">
            <div className="flex items-center gap-2 mb-4 border-l-4 border-orange-500 pl-3">
              <Clock size={16} className="text-orange-600"/>
              <h2 className="text-[11px] font-black uppercase text-slate-800 italic">Daftar Usulan Belum Sah</h2>
            </div>
            <TableGroup groupedData={dataBelumSahGrouped} type="BELUM" />
          </div>
        </>
      ) : (
        /* --- MODE PREVIEW REKAP --- */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-10 max-w-6xl mx-auto mb-20 animate-in fade-in duration-300">
            <div className="text-center mb-10 border-b-2 border-slate-900 pb-6 relative">
                <div className="absolute top-0 right-0 text-[9px] font-bold text-slate-400 flex items-center gap-2">
                    <Calendar size={12}/> TANGGAL CETAK: {tanggalHariIni}
                </div>
                <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Rekapitulasi Usulan Anggaran Disahkan</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic text-slate-400 leading-none">Tahap: {selectedStatusAnggaran}</p>
            </div>
            
            {Object.keys(dataSudahSahGrouped).map((kd) => {
                const totalGrup = dataSudahSahGrouped[kd].reduce((sum, i) => sum + Number(i.anggaran), 0);
                return (
                    <div key={kd + 'rekap'} className="mb-8">
                        <div className="flex justify-between items-end border-b border-slate-900 mb-2 pb-1">
                            <span className="text-[10px] font-black uppercase tracking-tight text-slate-800">{kd} - {skpdList.find(s => s.kode === kd)?.nama}</span>
                            <span className="text-[9px] font-black text-indigo-600 uppercase">SUBTOTAL SKPD: RP {totalGrup.toLocaleString('id-ID')}</span>
                        </div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white font-black border border-slate-900">
                                    <th className="px-3 py-2 text-[8px] uppercase w-10 text-center border-r border-slate-700 tracking-widest">No</th>
                                    <th className="px-3 py-2 text-[8px] uppercase text-left border-r border-slate-700 tracking-widest">Kegiatan & Rincian</th>
                                    <th className="px-2 py-2 text-[8px] uppercase text-center border-r border-slate-700 w-16">Setuju</th>
                                    <th className="px-2 py-2 text-[8px] uppercase text-center border-r border-slate-700 w-16">Tolak</th>
                                    <th className="px-2 py-2 text-[8px] uppercase text-center border-r border-slate-700 w-16">Belum</th>
                                    <th className="px-3 py-2 text-[8px] uppercase text-right tracking-widest">Anggaran (Rp)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataSudahSahGrouped[kd].map((item, idx) => (
                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="px-3 py-2 text-[9px] text-center font-bold text-slate-400 border-x border-slate-50">{idx + 1}</td>
                                        <td className="px-3 py-2 border-x border-slate-50">
                                            <p className="text-[9px] font-bold text-slate-800 uppercase leading-none">{item.nama_kegiatan}</p>
                                            <p className="text-[8px] text-slate-500 italic mt-0.5 leading-relaxed">{item.narasi || "-"}</p>
                                        </td>
                                        <td className="px-2 py-2 text-[10px] text-center font-black text-emerald-600 border-r border-slate-50">{item.pctSetuju}%</td>
                                        <td className="px-2 py-2 text-[10px] text-center font-black text-rose-600 border-r border-slate-50">{item.pctTolak}%</td>
                                        <td className="px-2 py-2 text-[10px] text-center font-black text-slate-400 border-r border-slate-50">{item.pctBelum}%</td>
                                        <td className="px-3 py-2 text-[10px] font-black text-slate-900 text-right border-r border-slate-50">{Number(item.anggaran).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}

            {/* GRAND TOTAL REKAP */}
            <div className="mt-8 px-6 py-4 bg-slate-900 rounded-xl text-white flex justify-between items-center shadow-lg border border-slate-700">
                <div className="flex items-center gap-3">
                    <Wallet size={16} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic text-slate-300">Total Keseluruhan Anggaran Disahkan</span>
                </div>
                <span className="text-lg font-black tracking-tight text-white">Rp {laporanFullData.filter(u => u.status === 'DISETUJUI').reduce((s, i) => s + Number(i.anggaran), 0).toLocaleString('id-ID')}</span>
            </div>
        </div>
      )}

      {/* FLOATING ACTION BAR */}
      {!showPreviewMode && selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-[40px] flex items-center gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 border border-slate-700 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-black text-white text-sm">{selectedIds.length}</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Terpilih</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleAction(selectedIds, 'SAH')} className="bg-emerald-500 hover:bg-emerald-600 px-8 py-2.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95">
              <ShieldCheck size={14} /> Sahkan Massal
            </button>
            <button onClick={() => handleAction(selectedIds, 'BATAL')} className="bg-rose-600 hover:bg-rose-700 px-8 py-2.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95">
              <RotateCcw size={14} /> Batalkan Massal
            </button>
            <button onClick={() => setSelectedIds([])} className="text-slate-500 hover:text-white text-[10px] font-black uppercase px-4 transition-colors">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
