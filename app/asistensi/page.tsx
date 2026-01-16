"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  User, Search, FileText, CheckCircle, XCircle, 
  Save, RefreshCw, Layout, AlertCircle,
  Camera, X 
} from "lucide-react";

export default function AsistensiPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [listSkpd, setListSkpd] = useState<any[]>([]);
  const [selectedSkpd, setSelectedSkpd] = useState("");
  const [usulanData, setUsulanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [activeUsulanId, setActiveUsulanId] = useState<number | null>(null);
  const [catatan, setCatatan] = useState("");
  const [rekomendasi, setRekomendasi] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);

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
    const { data } = await supabase
      .from("usulan")
      .select(`*, asistensi (*)`)
      .eq("kd_skpd", kode)
      .order("id", { ascending: true });
    setUsulanData(data || []);
    setLoading(false);
  };

  const handleSimpanAsistensi = async (usulanId: number) => {
    if (!catatan || !rekomendasi) {
      alert("Mohon isi catatan dan pilih status rekomendasi.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("asistensi").upsert({
        usulan_id: usulanId,
        user_id: currentUser.id,
        catatan: catatan,
        rekomendasi: rekomendasi
      }, { onConflict: 'usulan_id, user_id' }); 

      if (error) throw error;
      alert("Catatan Berhasil Disimpan!");
      handleFetchUsulan(selectedSkpd);
      setActiveUsulanId(null);
    } catch (e: any) {
      alert("Gagal: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openPreview = (url: string | null, type: 'image' | 'pdf') => {
    if (!url || url === "") {
      alert("Berkas tidak tersedia");
      return;
    }
    setPreviewUrl(url);
    setPreviewType(type);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-[11px] text-slate-900 relative">
      
      {/* MODAL PREVIEW */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-100 font-black uppercase italic">
              <span>Preview Berkas {previewType === 'pdf' ? 'Dokumen (PDF)' : 'Foto'}</span>
              <button onClick={() => setPreviewUrl(null)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
                <X size={20}/>
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-300 p-2 flex justify-center">
              {previewType === 'image' && <img src={previewUrl} className="max-w-full shadow-lg" alt="Preview"/>}
              {previewType === 'pdf' && <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full bg-white shadow-xl" title="PDF Preview"/>}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 bg-[#002855] p-6 rounded-sm shadow-xl text-white flex items-center justify-between border-b-4 border-orange-500">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full border-4 border-white/20 overflow-hidden bg-slate-200 flex items-center justify-center shadow-inner">
            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-400"/>}
          </div>
          <div>
            <p className="text-orange-400 font-black uppercase tracking-[0.2em] text-[9px] mb-1">Personil TAPD</p>
            <h1 className="text-xl font-black uppercase italic tracking-wider leading-none">{currentUser?.full_name || "User TAPD"}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4">
        {/* DROPDOWN SKPD */}
        <div className="bg-white p-5 border border-slate-200 rounded-sm shadow-sm flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Pilih Perangkat Daerah</label>
            <select 
              value={selectedSkpd}
              onChange={(e) => handleFetchUsulan(e.target.value)}
              className="w-full p-3.5 border-2 border-slate-100 rounded-sm font-black text-slate-700 outline-none focus:border-[#002855] bg-slate-50 transition-all cursor-pointer"
            >
              <option value="">-- DAFTAR SKPD / OPD --</option>
              {listSkpd.map(s => <option key={s.kode} value={s.kode}>{s.kode} - {s.nama}</option>)}
            </select>
          </div>
          <button onClick={() => handleFetchUsulan(selectedSkpd)} className="p-4 bg-[#002855] text-white rounded-sm font-black uppercase text-[10px] flex gap-2 hover:bg-blue-800 transition-all shadow-md">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""}/> Refresh
          </button>
        </div>

        {/* TABEL */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800 text-white font-black uppercase italic text-[10px] tracking-widest">
              <tr>
                <th className="p-4 border-r border-slate-700">Detail Usulan</th>
                <th className="p-4 text-center border-r border-slate-700 w-36">Berkas</th>
                <th className="p-4 border-r border-slate-700">Lembar Asistensi</th>
                <th className="p-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usulanData.length > 0 ? usulanData.map((item) => {
                const myAsistensi = item.asistensi?.find((a: any) => a.user_id === currentUser?.id);
                return (
                  <tr key={item.id} className={activeUsulanId === item.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/50 transition-colors'}>
                    <td className="p-4 border-r border-slate-100">
                      <span className="text-[8px] font-black text-slate-400">ID: {item.id}</span>
                      <p className="font-black text-slate-800 uppercase text-xs leading-tight mb-1">{item.nama_kegiatan}</p>
                      <p className="text-[10px] font-bold text-blue-700">Rp {item.anggaran?.toLocaleString('id-ID')}</p>
                    </td>
                    
                    {/* KOLOM BERKAS (Semua PDF kecuali Foto) */}
                    <td className="p-4 border-r border-slate-100">
                      <div className="flex justify-center gap-2">
                         <button 
                           onClick={() => openPreview(item.file_foto_url, 'image')}
                           title="Lihat Foto"
                           className="p-2 bg-orange-50 text-orange-600 rounded-sm border border-orange-100 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                         >
                            <Camera size={14}/>
                         </button>
                         <button 
                           onClick={() => openPreview(item.file_surat_url, 'pdf')}
                           title="Lihat Surat Usulan (PDF)"
                           className="p-2 bg-blue-50 text-blue-600 rounded-sm border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                         >
                            <FileText size={14}/>
                         </button>
                         <button 
                           onClick={() => openPreview(item.file_rab, 'pdf')}
                           title="Lihat RAB (PDF)"
                           className="p-2 bg-green-50 text-green-600 rounded-sm border border-green-100 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                         >
                            <FileText size={14}/>
                         </button>
                      </div>
                    </td>

                    <td className="p-4 border-r border-slate-100">
                      {activeUsulanId === item.id ? (
                        <div className="flex flex-col gap-2">
                           <textarea className="w-full p-2 border-2 border-blue-200 rounded-sm font-bold text-slate-700 outline-none focus:border-blue-500" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tulis catatan..." />
                           <div className="flex gap-2">
                             <button onClick={() => setRekomendasi('SETUJU')} className={`flex-1 py-1 rounded-sm font-black text-[8px] border-2 transition-all ${rekomendasi === 'SETUJU' ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white text-slate-400'}`}>SETUJU</button>
                             <button onClick={() => setRekomendasi('TIDAK SETUJU')} className={`flex-1 py-1 rounded-sm font-black text-[8px] border-2 transition-all ${rekomendasi === 'TIDAK SETUJU' ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white text-slate-400'}`}>TIDAK SETUJU</button>
                           </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-white/50 border border-dashed border-slate-200 rounded-sm min-h-[50px]">
                          {myAsistensi ? (
                            <>
                              <p className="font-bold italic text-slate-700 leading-tight">"{myAsistensi.catatan}"</p>
                              <span className={`text-[7px] font-black uppercase mt-1 ${myAsistensi.rekomendasi === 'SETUJU' ? 'text-green-600' : 'text-red-600'}`}>{myAsistensi.rekomendasi}</span>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400 italic py-2"><AlertCircle size={14}/> Belum ada asistensi</div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      {activeUsulanId === item.id ? (
                        <button onClick={() => handleSimpanAsistensi(item.id)} className="bg-green-600 text-white p-3 rounded-sm shadow-lg hover:bg-green-700"><Save size={18}/></button>
                      ) : (
                        <button onClick={() => { setActiveUsulanId(item.id); setCatatan(myAsistensi?.catatan || ""); setRekomendasi(myAsistensi?.rekomendasi || ""); }} className="p-3 bg-blue-50 text-blue-600 rounded-sm hover:bg-[#002855] hover:text-white transition-all shadow-sm">
                          <Layout size={18}/>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">Pilih SKPD untuk memulai</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}