"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Megaphone, Calendar, FileText, Upload, Save, 
  Trash2, Loader2, CheckCircle, X, ExternalLink, 
  Eye, EyeOff, Download, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";

export default function ManajemenPengumuman() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [statusAnggaran, setStatusAnggaran] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nomor: "",
    tanggal: new Date().toISOString().split('T')[0],
    narasi: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    checkAccessAndFetchData();
  }, []);

  const checkAccessAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.href = "/login";

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (!["SUPERADMIN", "ADMIN"].includes(profile?.role?.toUpperCase())) {
      alert("Akses Ditolak!");
      window.location.href = "/dashboard";
      return;
    }
    setUserProfile(profile);

    const { data: setting } = await supabase.from("settings").select("current_status_anggaran").eq("is_locked", true).maybeSingle();
    setStatusAnggaran(setting?.current_status_anggaran || "PENYUSUNAN");
    
    fetchAnnouncements();
  };

  const fetchAnnouncements = async () => {
    setFetching(true);
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setFetching(false);
    setSelectedIds([]);
    generateNomorOtomatis(data?.length || 0);
  };

  const generateNomorOtomatis = (count: number) => {
    const nextNum = count + 1;
    setFormData(prev => ({ 
      ...prev, 
      nomor: `${String(nextNum).padStart(3, '0')}/PENG/TAPD/${new Date().getFullYear()}` 
    }));
  };

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("announcements").update({ is_visible: !currentStatus }).eq("id", id);
      if (error) throw error;
      setAnnouncements(prev => prev.map(item => item.id === id ? { ...item, is_visible: !currentStatus } : item));
    } catch (error: any) {
      alert("Gagal mengubah status: " + error.message);
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `PENGUMUMAN_${fileName.replace(/\//g, '_')}.pdf`;
      link.click();
    } catch (error) {
      alert("Gagal mengunduh file.");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(announcements.map(item => item.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Silakan pilih berkas PDF terlebih dahulu!");
    setLoading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `files/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("announcement_files").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("announcement_files").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("announcements").insert({
        nomor_pengumuman: formData.nomor,
        tanggal: formData.tanggal,
        status_anggaran: statusAnggaran,
        narasi: formData.narasi,
        file_url: urlData.publicUrl,
        is_visible: true 
      });

      if (insertError) throw insertError;
      
      alert("Pengumuman berhasil dipublikasikan!");
      setFormData({ ...formData, narasi: "" });
      setFile(null);
      fetchAnnouncements();
    } catch (error: any) {
      alert("Kesalahan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Hapus ${selectedIds.length} pengumuman terpilih?`)) return;
    setLoading(true);
    try {
      const itemsToDelete = announcements.filter(a => selectedIds.includes(a.id));
      for (const item of itemsToDelete) {
        const fileName = item.file_url.split('/').pop();
        if (fileName) await supabase.storage.from("announcement_files").remove([`files/${fileName}`]);
      }
      const { error } = await supabase.from("announcements").delete().in("id", selectedIds);
      if (error) throw error;
      alert("Berhasil dihapus!");
      fetchAnnouncements();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const handleDeleteOne = async (id: string, fileUrl: string) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    try {
      const fileName = fileUrl.split('/').pop();
      if (fileName) await supabase.storage.from("announcement_files").remove([`files/${fileName}`]);
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      fetchAnnouncements();
    } catch (error: any) { alert(error.message); }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* SECTION 1: FORM INPUT */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-[#002855] text-white p-5 flex items-center gap-3">
            <Megaphone size={20} className="text-orange-400" />
            <h1 className="text-[13px] font-black uppercase tracking-wider italic">Input Pengumuman TAPD</h1>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nomor Dokumen</label>
                <input type="text" readOnly value={formData.nomor} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-[11px]" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tanggal Terbit</label>
                <input type="date" required value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg font-bold text-slate-800 text-[11px] outline-none focus:border-blue-500" />
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                <p className="text-[9px] font-black text-orange-600 uppercase">Tahap Anggaran Aktif</p>
                <p className="text-[13px] font-black text-slate-800 uppercase italic">{statusAnggaran}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Narasi Singkat</label>
                <textarea required rows={3} value={formData.narasi} onChange={e => setFormData({...formData, narasi: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg font-bold text-slate-800 text-[11px] placeholder:text-slate-300" placeholder="Ketik rincian pengumuman..." />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Pilih Berkas PDF</label>
                <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-[10px] text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#002855] text-white p-3.5 rounded-lg font-black uppercase text-[10px] tracking-widest italic flex justify-center items-center gap-2 hover:bg-slate-800 transition-all shadow-md disabled:bg-slate-300">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} PUBLIKASIKAN SEKARANG
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 2: DAFTAR DATA */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-5 flex justify-between items-center border-b border-slate-200">
            <h2 className="text-[11px] font-black uppercase text-slate-800 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" /> Riwayat Pengumuman
            </h2>
            {selectedIds.length > 0 && (
              <button onClick={handleBulkDelete} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-md text-[9px] font-black uppercase flex items-center gap-2 transition-all">
                <Trash2 size={12} /> Hapus Massal ({selectedIds.length})
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 w-10 text-center">
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === announcements.length && announcements.length > 0} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                  </th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase">Detail Pengumuman</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase text-center">Visibility</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase text-center">Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetching ? (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-300 text-[11px] font-black italic uppercase tracking-widest">Sinkronisasi Data...</td></tr>
                ) : announcements.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-300 text-[11px] font-black italic uppercase tracking-widest">Data Kosong</td></tr>
                ) : (
                  announcements.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-slate-50/80 transition-all ${!item.is_visible ? 'bg-slate-50/50' : ''}`}>
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-800 text-[12px] uppercase">{item.nomor_pengumuman}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1">
                                <Calendar size={10} /> {new Date(item.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}
                              </span>
                              <span className="text-[9px] font-black text-slate-400 uppercase">| {item.status_anggaran}</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 mt-1 italic line-clamp-2 leading-relaxed whitespace-pre-line">{item.narasi}</p>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => toggleVisibility(item.id, item.is_visible)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all font-black text-[9px] uppercase ${
                              item.is_visible ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {item.is_visible ? <Eye size={12} /> : <EyeOff size={12} />}
                            {item.is_visible ? 'Aktif' : 'Draft'}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center items-center gap-2">
                            <button 
                              onClick={() => setPreviewId(previewId === item.id ? null : item.id)}
                              className={`p-2 rounded-md transition-all border ${previewId === item.id ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-400 border-slate-200 hover:border-orange-500 hover:text-orange-500'}`}
                              title="Preview"
                            >
                              {previewId === item.id ? <ChevronUp size={14} /> : <FileText size={14} />}
                            </button>
                            <button 
                              onClick={() => handleDownload(item.file_url, item.nomor_pengumuman)}
                              className="p-2 bg-white text-slate-400 border border-slate-200 rounded-md hover:border-blue-500 hover:text-blue-500 transition-all"
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                            <button onClick={() => handleDeleteOne(item.id, item.file_url)} className="p-2 bg-white text-slate-400 border border-slate-200 rounded-md hover:border-rose-500 hover:text-rose-500 transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {previewId === item.id && (
                        <tr>
                          <td colSpan={4} className="p-4 bg-slate-50">
                            <div className="bg-white rounded-lg shadow-inner overflow-hidden border border-slate-200">
                              <div className="bg-slate-800 p-2.5 flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase text-slate-300 ml-2 tracking-widest">Document Preview</span>
                                <button onClick={() => setPreviewId(null)} className="p-1 text-slate-400 hover:text-white transition-all"><X size={16}/></button>
                              </div>
                              <iframe 
                                src={`${item.file_url}#toolbar=0`} 
                                className="w-full h-[500px]" 
                                title="PDF Preview"
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
