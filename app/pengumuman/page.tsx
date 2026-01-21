"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Megaphone, Calendar, FileText, Upload, Save, 
  Trash2, Loader2, CheckCircle, X, ExternalLink, 
  Eye, EyeOff, Download, ChevronDown, ChevronUp
} from "lucide-react";

export default function ManajemenPengumuman() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [statusAnggaran, setStatusAnggaran] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null); // State untuk pratinjau PDF
  
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

  // Fasilitas Download File
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
    if (!file) return alert("Pilih file PDF!");
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
      
      alert("Pengumuman Terbit!");
      setFormData({ ...formData, narasi: "" });
      setFile(null);
      fetchAnnouncements();
    } catch (error: any) {
      alert("Gagal: " + error.message);
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
      alert("Data berhasil dihapus!");
      fetchAnnouncements();
    } catch (error: any) { alert("Gagal: " + error.message); }
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
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10 text-black">
        
        {/* SECTION 1: FORM INPUT */}
        <section className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-orange-500">
          <div className="bg-[#002855] text-white p-6 flex items-center gap-4">
            <Megaphone size={24} className="text-orange-400" />
            <h1 className="text-lg font-black uppercase italic">Input Pengumuman Baru</h1>
          </div>
          <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Nomor Dokumen</label>
                <input type="text" readOnly value={formData.nomor} className="w-full p-4 bg-slate-50 border-2 rounded-xl font-bold text-black" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Tanggal</label>
                <input type="date" required value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="w-full p-4 border-2 rounded-xl font-bold text-black focus:border-blue-500 outline-none" />
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                <p className="text-[9px] font-bold text-blue-500 uppercase">Status Anggaran Aktif</p>
                <p className="text-lg font-black text-blue-900 uppercase italic">{statusAnggaran}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Narasi Pengumuman</label>
                <textarea required rows={3} value={formData.narasi} onChange={e => setFormData({...formData, narasi: e.target.value})} className="w-full p-4 border-2 rounded-xl font-semibold text-black placeholder:text-slate-300" placeholder="Ketik narasi..." />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Upload PDF</label>
                <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#002855] text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] italic flex justify-center items-center gap-3 hover:bg-blue-800 transition-all shadow-lg active:scale-95 disabled:bg-slate-300">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} TERBITKAN SEKARANG
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 2: DAFTAR DATA DENGAN PREVIEW & DOWNLOAD */}
        <section className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                <FileText size={18} className="text-blue-400" /> Kontrol Dashboard User
              </h2>
              {selectedIds.length > 0 && (
                <button onClick={handleBulkDelete} className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                  <Trash2 size={14} /> Hapus ({selectedIds.length})
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  <th className="p-5 w-10 text-center">
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === announcements.length && announcements.length > 0} className="w-5 h-5 accent-blue-600 cursor-pointer" />
                  </th>
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase">Pengumuman</th>
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center">Status Tampil</th>
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetching ? (
                  <tr><td colSpan={4} className="p-10 text-center text-slate-400 font-bold animate-pulse">Memuat data...</td></tr>
                ) : (
                  announcements.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-blue-50/50 transition-all ${!item.is_visible ? 'bg-slate-50/50' : ''}`}>
                        <td className="p-5 text-center">
                          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} className="w-5 h-5 accent-blue-600 cursor-pointer" />
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-sm">{item.nomor_pengumuman}</span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(item.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>
                            <p className="text-xs text-slate-600 mt-1 italic line-clamp-1">{item.narasi}</p>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <button 
                            onClick={() => toggleVisibility(item.id, item.is_visible)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                              item.is_visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                            } font-black text-[10px] uppercase`}
                          >
                            {item.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                            {item.is_visible ? 'Aktif' : 'Sembunyi'}
                          </button>
                        </td>
                        <td className="p-5">
                          <div className="flex justify-center items-center gap-2">
                            {/* Tombol Preview */}
                            <button 
                              onClick={() => setPreviewId(previewId === item.id ? null : item.id)}
                              className={`p-2.5 rounded-xl border transition-all ${previewId === item.id ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-500 border-slate-200 hover:bg-orange-50'}`}
                              title="Pratinjau PDF"
                            >
                              {previewId === item.id ? <ChevronUp size={18} /> : <FileText size={18} />}
                            </button>
                            {/* Tombol Download */}
                            <button 
                              onClick={() => handleDownload(item.file_url, item.nomor_pengumuman)}
                              className="p-2.5 bg-white text-blue-600 border border-slate-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                              title="Download PDF"
                            >
                              <Download size={18} />
                            </button>
                            {/* Tombol Hapus */}
                            <button onClick={() => handleDeleteOne(item.id, item.file_url)} className="p-2.5 bg-white text-rose-500 border border-slate-200 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Baris Khusus Pratinjau PDF (Iframe) */}
                      {previewId === item.id && (
                        <tr>
                          <td colSpan={4} className="p-4 bg-slate-100">
                            <div className="bg-white rounded-2xl shadow-inner overflow-hidden border-2 border-slate-200">
                              <div className="bg-slate-200 p-2 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-600 ml-2 italic">PDF Preview: {item.nomor_pengumuman}</span>
                                <button onClick={() => setPreviewId(null)} className="p-1 hover:bg-rose-500 hover:text-white rounded-lg transition-all"><X size={16}/></button>
                              </div>
                              <iframe 
                                src={`${item.file_url}#toolbar=0`} 
                                className="w-full h-[500px]" 
                                title="Preview PDF"
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