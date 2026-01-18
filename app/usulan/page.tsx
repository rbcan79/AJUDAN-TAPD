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
  const [listSkpd, setListSkpd] = useState<any[]>([]);
  const [usulanData, setUsulanData] = useState<any[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [statusAnggaranAktif, setStatusAnggaranAktif] = useState("");

  // State Form
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [noUsulan, setNoUsulan] = useState("");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [narasi, setNarasi] = useState("");
  const [kdSkpd, setKdSkpd] = useState("");
  const [displayAnggaran, setDisplayAnggaran] = useState(""); 
  const [anggaran, setAnggaran] = useState(0);

  // Berkas
  const [fileSurat, setFileSurat] = useState("");
  const [fileFoto, setFileFoto] = useState("");
  const [fileRab, setFileRab] = useState("");

  // Preview
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

      // 1. Ambil Profil User
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (profile) {
        setCurrentUser(profile);
        setKdSkpd(profile.kd_skpd);
      }

      // 2. Ambil Status Anggaran yang sedang TRUE (Locked)
      const { data: settingsData } = await supabase.from("settings").select("*").order("id", { ascending: true });
      setStatusOptions(settingsData || []);
      
      const activeSetting = settingsData?.find(s => s.is_locked === true);
      const activeStatus = activeSetting?.current_status_anggaran || "";
      setStatusAnggaranAktif(activeStatus);

      // 3. Ambil Data SKPD
      const { data: skpdData } = await supabase.from("skpd").select("kode, nama").order("kode", { ascending: true });
      if (skpdData) setListSkpd(skpdData);

      // 4. Ambil Data Usulan FILTER: Status Anggaran Aktif DAN KD_SKPD User
      if (activeStatus && profile) {
        let query = supabase
          .from("usulan")
          .select("*")
          .eq("status_anggaran", activeStatus)
          .order("created_at", { ascending: false });

        // Jika bukan Superadmin/Admin, filter hanya milik SKPD-nya
        if (profile.role !== "superadmin" && profile.role !== "ADMIN") {
          query = query.eq("kd_skpd", profile.kd_skpd);
        }

        const { data: usulan } = await query;
        if (usulan) setUsulanData(usulan);
      }
      
    } catch (err: any) { 
        console.error("Fetch Error:", err.message); 
    } finally { 
        setFetching(false); 
    }
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
      alert(`Berkas berhasil diunggah!`);
    } catch (err: any) { alert("Gagal Upload: " + err.message); } finally { setLoading(false); }
  };

  const handleEdit = (item: any) => {
    if (item.status?.toUpperCase() !== 'PENGAJUAN') {
      return alert("Data sudah diproses, tidak bisa diedit.");
    }
    setIsEditing(true);
    setEditId(item.id);
    setNoUsulan(item.nomor_usulan);
    setNamaKegiatan(item.nama_kegiatan);
    setNarasi(item.narasi_usulan);
    setKdSkpd(item.kd_skpd);
    setAnggaran(item.anggaran);
    setDisplayAnggaran(new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(item.anggaran));
    setFileFoto(item.file_foto_url);
    setFileSurat(item.file_surat_url);
    setFileRab(item.file_rab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, status: string) => {
    if (status?.toUpperCase() !== 'PENGAJUAN') return alert("Data tidak bisa dihapus!");
    if (!confirm("Hapus usulan ini?")) return;
    setLoading(true);
    try {
      await supabase.from("usulan").delete().eq('id', id);
      fetchData();
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setIsEditing(false); setEditId(null);
    setNoUsulan(""); setNamaKegiatan(""); setNarasi(""); setDisplayAnggaran("");
    setFileSurat(""); setFileFoto(""); setFileRab("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !statusAnggaranAktif) {
        alert("Gagal: Status Anggaran Aktif tidak ditemukan.");
        return;
    }
    setLoading(true);
    
    const payload = {
      nomor_usulan: noUsulan,
      nama_kegiatan: namaKegiatan,
      narasi_usulan: narasi,
      anggaran: anggaran,
      kd_skpd: kdSkpd,
      file_surat_url: fileSurat,
      file_foto_url: fileFoto,
      file_rab: fileRab,
      status: 'PENGAJUAN',
      status_anggaran: statusAnggaranAktif, 
      created_by: currentUser.id
    };

    try {
      if (isEditing && editId) {
        await supabase.from("usulan").update(payload).eq('id', editId);
      } else {
        await supabase.from("usulan").insert(payload);
      }
      resetForm();
      fetchData();
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen text-[11px] font-sans text-slate-900">
      
      {/* MODAL PREVIEW */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-5xl bg-white rounded-sm h-[90vh] flex flex-col">
            <div className="bg-[#002855] p-3 flex justify-between items-center text-white font-black italic">
              <span>PRATINJAU BERKAS</span>
              <button onClick={() => setPreviewUrl(null)}><X size={18} /></button>
            </div>
            <div className="flex-1 bg-slate-200">
               <iframe src={previewUrl} className="w-full h-full border-none" />
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 bg-white p-4 border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-sm font-black uppercase italic text-[#002855]">
            {isEditing ? 'Mode Edit Usulan' : 'Input Usulan SKPD'}
          </h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
            USER: {currentUser?.nama_lengkap} | OPD: {kdSkpd}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-sm border border-slate-200 flex items-center gap-2">
            <span className="text-[8px] font-black text-slate-400 uppercase px-2 flex items-center gap-1"><Filter size={10}/> STATUS AKTIF:</span>
            <select 
              disabled
              value={statusAnggaranAktif}
              className="bg-blue-50 border-none text-[9px] font-black rounded-sm py-1 px-3 text-blue-700 outline-none appearance-none cursor-not-allowed"
            >
              {statusOptions.map((opt, idx) => (
                <option key={idx} value={opt.current_status_anggaran}>{opt.current_status_anggaran}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchData} className="p-2 border border-slate-200 rounded-sm hover:bg-slate-50 bg-white">
            <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* FORM */}
        <div className="col-span-12 lg:col-span-4">
          <div className={`bg-white border rounded-sm shadow-sm overflow-hidden ${isEditing ? 'border-orange-400' : 'border-slate-200'}`}>
            <div className={`${isEditing ? 'bg-orange-500' : 'bg-[#002855]'} p-2.5 text-white text-[10px] font-black uppercase italic flex justify-between`}>
              <span>{isEditing ? 'Perbarui Data Usulan' : 'Form Pengajuan Baru'}</span>
              <span className="opacity-70 tracking-widest">{statusAnggaranAktif}</span>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <input placeholder="NOMOR USULAN" value={noUsulan} onChange={e => setNoUsulan(e.target.value)} className="w-full p-2 border border-slate-200 font-bold uppercase outline-none focus:border-blue-500" required />
              <input placeholder="NAMA KEGIATAN" value={namaKegiatan} onChange={e => setNamaKegiatan(e.target.value)} className="w-full p-2 border border-slate-200 font-bold uppercase outline-none focus:border-blue-500" required />
              <textarea placeholder="NARASI USULAN" value={narasi} onChange={e => setNarasi(e.target.value)} className="w-full p-2 border border-slate-200 font-bold h-24 outline-none focus:border-blue-500" required />
              <input type="text" value={displayAnggaran} onChange={(e) => setDisplayAnggaran(formatRupiah(e.target.value))} placeholder="Rp 0" className="w-full p-2 border border-slate-200 font-bold text-blue-700 bg-blue-50/30 outline-none" required />

              <div className="grid grid-cols-3 gap-2">
                <label className={`flex flex-col items-center p-2 border border-dashed rounded-sm cursor-pointer ${fileFoto ? "bg-green-50 border-green-500 text-green-600" : "border-slate-300 text-slate-400"}`}>
                  <Camera size={18}/><span className="text-[7px] font-black mt-1">FOTO</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, 'foto')} />
                </label>
                <label className={`flex flex-col items-center p-2 border border-dashed rounded-sm cursor-pointer ${fileSurat ? "bg-green-50 border-green-500 text-green-600" : "border-slate-300 text-slate-400"}`}>
                  <FileText size={18}/><span className="text-[7px] font-black mt-1">SURAT</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={e => handleUpload(e, 'surat')} />
                </label>
                <label className={`flex flex-col items-center p-2 border border-dashed rounded-sm cursor-pointer ${fileRab ? "bg-green-50 border-green-500 text-green-600" : "border-slate-300 text-slate-400"}`}>
                  <Upload size={18}/><span className="text-[7px] font-black mt-1">RAB</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={e => handleUpload(e, 'rab')} />
                </label>
              </div>

              <button disabled={loading || !statusAnggaranAktif} className={`w-full ${isEditing ? 'bg-orange-500' : 'bg-[#0f172a]'} text-white p-3 rounded-sm font-black uppercase tracking-widest disabled:bg-slate-300`}>
                {loading ? "PROSES..." : isEditing ? "SIMPAN PERUBAHAN" : "KIRIM USULAN"}
              </button>
              {isEditing && <button type="button" onClick={resetForm} className="w-full text-slate-400 font-bold uppercase text-[9px] mt-2">Batal Edit</button>}
            </form>
          </div>
        </div>

        {/* TABEL */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-sm shadow-sm p-4 overflow-x-auto">
          <div className="mb-3 flex items-center justify-between border-b pb-2">
            <span className="text-[10px] font-black uppercase italic text-slate-500">Daftar Usulan Tahap {statusAnggaranAktif}</span>
            <span className="text-[8px] font-bold text-slate-400">{usulanData.length} RECORD DITEMUKAN</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase border-b border-slate-100 italic">
                <th className="pb-3">Kegiatan & Nomor</th>
                <th className="pb-3 text-center">Anggaran</th>
                <th className="pb-3 text-center">Berkas</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usulanData.length === 0 ? (
                <tr>
                   <td colSpan={5} className="py-10 text-center text-slate-300 italic font-bold uppercase tracking-widest">Tidak ada data untuk tahap {statusAnggaranAktif}</td>
                </tr>
              ) : usulanData.map((item) => {
                const isPengajuan = item.status?.toUpperCase() === 'PENGAJUAN';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-4">
                      <p className="font-black text-slate-800 uppercase leading-none">{item.nama_kegiatan}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1.5">
                        {item.nomor_usulan}
                      </p>
                    </td>
                    <td className="py-4 text-center font-bold text-blue-600">
                        Rp {item.anggaran?.toLocaleString('id-ID')}
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        {item.file_foto_url && <button onClick={() => setPreviewUrl(item.file_foto_url)} className="p-1.5 text-orange-500 bg-orange-50 rounded-sm border border-orange-100"><Camera size={12}/></button>}
                        {item.file_surat_url && <button onClick={() => setPreviewUrl(item.file_surat_url)} className="p-1.5 text-blue-500 bg-blue-50 rounded-sm border border-blue-100"><FileText size={12}/></button>}
                        {item.file_rab && <button onClick={() => setPreviewUrl(item.file_rab)} className="p-1.5 text-green-600 bg-green-50 rounded-sm border border-green-100"><FileSpreadsheet size={12}/></button>}
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`px-2 py-1 rounded-sm font-black uppercase text-[8px] border ${isPengajuan ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEdit(item)} disabled={!isPengajuan} className={`p-2 rounded-sm border ${isPengajuan ? 'text-slate-400 hover:text-orange-500 border-slate-100' : 'text-slate-200'}`}><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(item.id, item.status)} disabled={!isPengajuan} className={`p-2 rounded-sm border ${isPengajuan ? 'text-slate-400 hover:text-red-500 border-slate-100' : 'text-slate-200'}`}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
