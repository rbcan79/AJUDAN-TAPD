"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, Plus, RefreshCw, Camera, Upload, 
  FileSpreadsheet, X, ExternalLink, AlertCircle, Edit3, Save, Trash2, Tag, Filter
} from "lucide-react";

export default function UsulanPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usulanData, setUsulanData] = useState<any[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [statusAnggaranAktif, setStatusAnggaranAktif] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [noUsulan, setNoUsulan] = useState("");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [narasi, setNarasi] = useState("");
  const [kdSkpd, setKdSkpd] = useState("");
  const [displayAnggaran, setDisplayAnggaran] = useState(""); 
  const [anggaran, setAnggaran] = useState(0);
  const [fileSurat, setFileSurat] = useState("");
  const [fileFoto, setFileFoto] = useState("");
  const [fileRab, setFileRab] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^0-9]/g, "");
    const numberValue = parseInt(numberString);
    setAnggaran(isNaN(numberValue) ? 0 : numberValue);
    if (!numberString) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", minimumFractionDigits: 0,
    }).format(numberValue);
  };

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (profile) {
        setCurrentUser(profile);
        setKdSkpd(profile.kd_skpd);
      }

      const { data: settingsData } = await supabase.from("settings").select("*").order("id", { ascending: true });
      setStatusOptions(settingsData || []);
      
      const activeSetting = settingsData?.find(s => s.is_locked === true);
      const activeStatus = activeSetting?.current_status_anggaran || "";
      setStatusAnggaranAktif(activeStatus);

      if (activeStatus && profile) {
        let query = supabase
          .from("usulan")
          .select("*")
          .eq("status_anggaran", activeStatus)
          .order("created_at", { ascending: false });

        if (profile.role !== "superadmin" && profile.role !== "ADMIN") {
          query = query.eq("kd_skpd", profile.kd_skpd);
        }

        const { data: usulan } = await query;
        if (usulan) setUsulanData(usulan);
      }
    } catch (err: any) { console.error(err.message); } finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e: any, type: string) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('usulan_files').upload(`${type}/${fileName}`, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('usulan_files').getPublicUrl(`${type}/${fileName}`);
      if (type === 'surat') setFileSurat(publicUrl);
      if (type === 'foto') setFileFoto(publicUrl);
      if (type === 'rab') setFileRab(publicUrl);
      alert("Berhasil diunggah!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      nomor_usulan: noUsulan, nama_kegiatan: namaKegiatan, narasi_usulan: narasi,
      anggaran, kd_skpd: kdSkpd, file_surat_url: fileSurat, file_foto_url: fileFoto,
      file_rab: fileRab, status: 'PENGAJUAN', status_anggaran: statusAnggaranAktif, created_by: currentUser.id
    };
    try {
      if (isEditing && editId) { await supabase.from("usulan").update(payload).eq('id', editId); }
      else { await supabase.from("usulan").insert(payload); }
      resetForm(); fetchData();
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setIsEditing(false); setEditId(null); setNoUsulan(""); setNamaKegiatan(""); 
    setNarasi(""); setDisplayAnggaran(""); setFileSurat(""); setFileFoto(""); setFileRab("");
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen text-[11px] font-sans">
      {/* MODAL PREVIEW */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white rounded-sm w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="bg-[#002855] p-3 flex justify-between text-white font-bold">
              <span>PREVIEW</span>
              <button onClick={() => setPreviewUrl(null)}><X size={18} /></button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full h-full" />
          </div>
        </div>
      )}

      {/* HEADER TAHAP AKTIF */}
      <div className="mb-4 bg-white p-4 border flex justify-between items-center shadow-sm">
        <div>
          <h1 className="font-black text-[#002855] text-sm italic uppercase tracking-tighter">DATA USULAN SKPD</h1>
          <p className="text-[9px] font-bold text-slate-400">STATUS: {statusAnggaranAktif || "MENUNGGU AKTIVASI"}</p>
        </div>
        <div className="flex gap-2 items-center bg-slate-100 p-1 rounded border">
           <span className="text-[8px] font-bold px-2 uppercase">TAHAP SAAT INI:</span>
           <select disabled value={statusAnggaranAktif} className="bg-white border text-[9px] font-bold p-1 rounded text-blue-700 outline-none">
              {statusOptions.map((o, i) => <option key={i} value={o.current_status_anggaran}>{o.current_status_anggaran}</option>)}
           </select>
           <button onClick={fetchData} className="p-1.5 bg-white border rounded shadow-sm hover:bg-slate-50"><RefreshCw size={12} className={fetching ? "animate-spin" : ""}/></button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* FORM */}
        <div className="col-span-12 lg:col-span-4 bg-white border p-4 shadow-sm">
          <p className="font-black mb-4 border-b pb-2 uppercase italic text-[#002855]">Form Input Usulan</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input placeholder="NOMOR USULAN" value={noUsulan} onChange={e => setNoUsulan(e.target.value)} className="w-full p-2 border font-bold uppercase outline-none focus:border-blue-500" required />
            <input placeholder="NAMA KEGIATAN" value={namaKegiatan} onChange={e => setNamaKegiatan(e.target.value)} className="w-full p-2 border font-bold uppercase outline-none focus:border-blue-500" required />
            <textarea placeholder="NARASI" value={narasi} onChange={e => setNarasi(e.target.value)} className="w-full p-2 border font-bold h-20 outline-none" required />
            <input type="text" value={displayAnggaran} onChange={e => setDisplayAnggaran(formatRupiah(e.target.value))} placeholder="Rp 0" className="w-full p-2 border font-bold text-blue-700 bg-blue-50 outline-none" required />
            
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col items-center p-2 border border-dashed rounded cursor-pointer hover:bg-slate-50">
                <Camera size={16} className={fileFoto ? "text-green-500" : "text-slate-400"}/><span className="text-[7px] mt-1">FOTO</span>
                <input type="file" className="hidden" onChange={e => handleUpload(e, 'foto')} />
              </label>
              <label className="flex flex-col items-center p-2 border border-dashed rounded cursor-pointer hover:bg-slate-50">
                <FileText size={16} className={fileSurat ? "text-green-500" : "text-slate-400"}/><span className="text-[7px] mt-1">SURAT</span>
                <input type="file" className="hidden" onChange={e => handleUpload(e, 'surat')} />
              </label>
              <label className="flex flex-col items-center p-2 border border-dashed rounded cursor-pointer hover:bg-slate-50">
                <Upload size={16} className={fileRab ? "text-green-500" : "text-slate-400"}/><span className="text-[7px] mt-1">RAB (PDF)</span>
                <input type="file" className="hidden" onChange={e => handleUpload(e, 'rab')} />
              </label>
            </div>

            <button disabled={loading || !statusAnggaranAktif} className="w-full bg-[#002855] text-white p-3 font-black uppercase tracking-widest disabled:bg-slate-300">
              {loading ? "PROSES..." : "KIRIM USULAN"}
            </button>
          </form>
        </div>

        {/* TABEL USULAN */}
        <div className="col-span-12 lg:col-span-8 bg-white border p-4 shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase border-b italic">
                <th className="pb-3">Kegiatan</th>
                <th className="pb-3 text-right">Nominal Anggaran</th>
                <th className="pb-3 text-center">Berkas Lampiran</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usulanData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3">
                    <p className="font-black text-slate-800 uppercase">{item.nama_kegiatan}</p>
                    <p className="text-[8px] text-slate-400">{item.nomor_usulan}</p>
                  </td>
                  <td className="py-3 text-right font-black text-blue-700">
                    Rp {item.anggaran?.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-center gap-1.5">
                      {item.file_foto_url && <button onClick={() => setPreviewUrl(item.file_foto_url)} className="p-1.5 bg-orange-50 text-orange-500 border border-orange-200 rounded"><Camera size={12}/></button>}
                      {item.file_surat_url && <button onClick={() => setPreviewUrl(item.file_surat_url)} className="p-1.5 bg-blue-50 text-blue-500 border border-blue-200 rounded"><FileText size={12}/></button>}
                      {/* TOMBOL RAB - PASTIKAN BARIS INI ADA */}
                      {item.file_rab && <button onClick={() => setPreviewUrl(item.file_rab)} className="p-1.5 bg-green-50 text-green-600 border border-green-200 rounded"><FileSpreadsheet size={12}/></button>}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full border text-[8px] font-black bg-slate-50 text-slate-500 uppercase">{item.status}</span>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => setIsEditing(true)} className="p-1 text-slate-400 hover:text-blue-500"><Edit3 size={14}/></button>
                      <button onClick={() => {}} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
