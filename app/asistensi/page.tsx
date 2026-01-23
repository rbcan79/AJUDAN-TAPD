"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building2, CheckSquare, Square, RotateCcw,
  CheckCircle2, AlertCircle, Camera, FileText, 
  Wallet, Trash2, X, Save, Layout, XCircle, Download, FileSpreadsheet
} from "lucide-react"; 

export default function PengesahanPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [listSkpd, setListSkpd] = useState<any[]>([]);
  const [selectedSkpd, setSelectedSkpd] = useState("");
  const [usulanData, setUsulanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeUsulanId, setActiveUsulanId] = useState<number | null>(null);
  const [catatan, setCatatan] = useState("");
  const [rekomendasi, setRekomendasi] = useState("");

  // --- STATE PRATINJAU ---
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setCurrentUser(profile);
    }
    const { data: skpds } = await supabase.from("skpd").select("kode, nama").order("kode");
    setListSkpd(skpds || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFetchUsulan = async (kode: string) => {
    if (!kode) return;
    setSelectedSkpd(kode);
    setLoading(true);
    setSelectedIds([]); 
    
    const { data, error } = await supabase
      .from("usulan")
      .select(`*, asistensi (*)`)
      .eq("kd_skpd", kode)
      .order("id", { ascending: true });
    
    if (error) console.error("Error fetching:", error);
    setUsulanData(data || []);
    setLoading(false);
  };

  const handlePreviewFile = (url: string | null, title: string) => {
    if (!url || url === "" || url === "NULL") {
      alert("Berkas ini belum diunggah oleh SKPD.");
      return;
    }
    const finalUrl = url.toLowerCase().endsWith('.pdf') ? `${url}#toolbar=0` : url;
    setPreviewUrl(finalUrl);
    setPreviewTitle(title);
  };

  const handleBulkAction = async (type: 'SETUJU' | 'BATAL') => {
    if (selectedIds.length === 0) return;
    const confirmMsg = type === 'SETUJU' ? `Setujui ${selectedIds.length} usulan terpilih?` : `Hapus asistensi pada ${selectedIds.length} usulan?`;
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      if (type === 'SETUJU') {
        const bulkData = selectedIds.map(id => ({
          usulan_id: id, user_id: currentUser.id, catatan: "Disetujui secara massal", rekomendasi: "SETUJU"
        }));
        await supabase.from("asistensi").upsert(bulkData, { onConflict: 'usulan_id, user_id' });
      } else {
        await supabase.from("asistensi").delete().eq("user_id", currentUser.id).in("usulan_id", selectedIds);
      }
      handleFetchUsulan(selectedSkpd);
    } catch (e) { alert("Gagal proses massal"); } finally { setLoading(false); }
  };

  const handleSimpanAsistensi = async (usulanId: number) => {
    if (!catatan || !rekomendasi) return alert("Isi catatan dan pilih status!");
    setLoading(true);
    try {
      await supabase.from("asistensi").upsert({
        usulan_id: usulanId, user_id: currentUser.id, catatan: catatan, rekomendasi: rekomendasi
      }, { onConflict: 'usulan_id, user_id' }); 
      handleFetchUsulan(selectedSkpd);
      setActiveUsulanId(null);
    } catch (e) { alert("Gagal menyimpan"); } finally { setLoading(false); }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-[11px] text-slate-900 relative">
      
      {/* --- MODAL PRATINJAU --- */}
      {previewUrl && (
        <div className="fixed inset-0 z-[999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center border-b-4 border-orange-500">
              <div className="flex items-center gap-3">
                <FileText className="text-orange-400" size={20} />
                <h3 className="font-black uppercase italic tracking-widest text-[11px]">{previewTitle}</h3>
              </div>
              <div className="flex items-center gap-4">
                <a href={previewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold text-[9px] transition-all"><Download size={14} /> LIHAT PENUH</a>
                <button onClick={() => setPreviewUrl(null)} className="p-2 bg-rose-600 hover:bg-rose-700 rounded-lg transition-all"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 bg-slate-200">
              <iframe src={previewUrl} className="w-full h-full border-none" title="Preview" />
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING BAR AKSI MASSAL --- */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-white border-2 border-slate-900 shadow-2xl rounded-2xl p-4 flex items-center gap-6 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 border-r pr-6 border-slate-200">
            <div className="bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-black">{selectedIds.length}</div>
            <p className="font-black uppercase italic text-slate-500 text-[9px]">Terpilih</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleBulkAction('SETUJU')} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-emerald-700">
              <CheckCircle2 size={14}/> Setuju Massal
            </button>
            <button onClick={() => handleBulkAction('BATAL')} className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-rose-700">
              <Trash2 size={14}/> Batalkan Massal
            </button>
          </div>
        </div>
      )}

      {/* Selector SKPD & Sync */}
      <div className="max-w-7xl mx-auto mb-6 bg-white p-5 border border-slate-200 rounded-sm shadow-sm flex items-end gap-4">
        <div className="flex-1">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Pilih Perangkat Daerah</label>
          <div className="relative">
            <select value={selectedSkpd} onChange={(e) => handleFetchUsulan(e.target.value)} className="w-full p-3 pl-10 border-2 border-slate-100 rounded-sm font-black text-slate-700 bg-slate-50 outline-none focus:border-slate-800 transition-all">
              <option value="">-- PILIH SKPD --</option>
              {listSkpd.map(s => <option key={s.kode} value={s.kode}>{s.kode} - {s.nama}</option>)}
            </select>
            <Building2 className="absolute left-3 top-3.5 text-slate-400" size={16} />
          </div>
        </div>
        <button onClick={() => handleFetchUsulan(selectedSkpd)} className="p-3.5 bg-slate-800 text-white rounded-sm font-black uppercase text-[10px] flex gap-2 hover:bg-slate-700 shadow-md">
          <RotateCcw size={14} className={loading ? "animate-spin" : ""}/> Sync Data
        </button>
      </div>

      {/* Tabel Utama */}
      <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden mb-24">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#1e293b] text-white font-black uppercase italic text-[9px] tracking-widest">
            <tr>
              <th className="p-4 w-10 text-center border-r border-slate-700">
                <button onClick={() => selectedIds.length === usulanData.length ? setSelectedIds([]) : setSelectedIds(usulanData.map(u => u.id))}>
                  {selectedIds.length === usulanData.length && usulanData.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                </button>
              </th>
              <th className="p-4 border-r border-slate-700">Detail Usulan</th>
              <th className="p-4 text-center border-r border-slate-700 w-40">Berkas Lampiran</th>
              <th className="p-4 border-r border-slate-700">Asistensi</th>
              <th className="p-4 text-center w-20">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {usulanData.length > 0 ? usulanData.map((item) => {
              const myAsistensi = item.asistensi?.find((a: any) => a.user_id === currentUser?.id);
              const isSelected = selectedIds.includes(item.id);
              return (
                <tr key={item.id} className={isSelected ? 'bg-orange-50/30' : 'hover:bg-slate-50/30'}>
                  <td className="p-4 text-center border-r border-slate-100">
                    <button onClick={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}>
                      {isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
                    </button>
                  </td>
                  <td className="p-4 border-r border-slate-100">
                    <p className="font-black text-[#0f172a] uppercase text-[11px] mb-2">{item.nama_kegiatan}</p>
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded text-black font-black text-[10px] border border-slate-200">
                      <Wallet size={12} className="text-slate-400"/> Rp {item.anggaran?.toLocaleString('id-ID')}
                    </div>
                  </td>
                  
                  {/* KOLOM BERKAS (Sinkron dengan nama kolom database) */}
                  <td className="p-4 border-r border-slate-100 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handlePreviewFile(item.file_foto_url, "FOTO LOKASI")}
                        className={`p-2 rounded border transition-all ${item.file_foto_url ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-600 hover:text-white shadow-sm' : 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed'}`}
                      >
                        <Camera size={16}/>
                      </button>
                      <button 
                        onClick={() => handlePreviewFile(item.file_surat_url, "DOKUMEN USULAN")}
                        className={`p-2 rounded border transition-all ${item.file_surat_url ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white shadow-sm' : 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed'}`}
                      >
                        <FileText size={16}/>
                      </button>
                      {/* FIX: Menggunakan kolom 'file_rab' sesuai database */}
                      <button 
                        onClick={() => handlePreviewFile(item.file_rab, "RINCIAN RAB")}
                        className={`p-2 rounded border transition-all ${item.file_rab ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white shadow-sm' : 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed'}`}
                      >
                        <FileSpreadsheet size={16}/>
                      </button>
                    </div>
                  </td>

                  <td className="p-4 border-r border-slate-100">
                    {activeUsulanId === item.id ? (
                      <div className="space-y-2">
                        <textarea className="w-full p-2 border-2 border-blue-400 rounded-sm font-bold text-[11px] text-slate-800 outline-none" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tulis catatan..." />
                        <div className="flex gap-2">
                          <button onClick={() => setRekomendasi('SETUJU')} className={`flex-1 py-1.5 rounded-sm font-black text-[9px] border-2 transition-all ${rekomendasi === 'SETUJU' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white text-slate-400 border-slate-200'}`}>SETUJU</button>
                          <button onClick={() => setRekomendasi('TIDAK SETUJU')} className={`flex-1 py-1.5 rounded-sm font-black text-[9px] border-2 transition-all ${rekomendasi === 'TIDAK SETUJU' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white text-slate-400 border-slate-200'}`}>TIDAK SETUJU</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        {myAsistensi ? (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border font-black uppercase text-[9px] tracking-widest shrink-0 ${myAsistensi.rekomendasi === 'SETUJU' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-rose-50 border-rose-500 text-rose-700'}`}>
                            {myAsistensi.rekomendasi === 'SETUJU' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>} {myAsistensi.rekomendasi}
                          </div>
                        ) : <span className="text-slate-300 italic font-bold uppercase tracking-widest text-[9px]">Belum Asistensi</span>}
                        
                        {myAsistensi?.catatan && (
                          <div className="text-[10px] font-bold text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner">
                            "{myAsistensi.catatan}"
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {activeUsulanId === item.id ? (
                      <button onClick={() => handleSimpanAsistensi(item.id)} className="bg-emerald-600 text-white p-2.5 rounded-sm shadow-md hover:bg-emerald-700 transition-all active:scale-90"><Save size={18}/></button>
                    ) : (
                      <button onClick={() => { setActiveUsulanId(item.id); setCatatan(myAsistensi?.catatan || ""); setRekomendasi(myAsistensi?.rekomendasi || ""); }} className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-sm hover:bg-slate-800 hover:text-white transition-all shadow-sm active:scale-90">
                        <Layout size={18}/>
                      </button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest text-[14px]">Silahkan Pilih SKPD Terlebih Dahulu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
