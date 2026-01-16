"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Trash2, Plus, Search, Pencil, Save, ChevronLeft, ChevronRight, Download, Briefcase } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SkpdPage() {
  const [skpdList, setSkpdList] = useState<any[]>([]);
  const [formData, setFormData] = useState({ id: "", kode: "", nama: "", parent_id: "" });
  const [isSubUnit, setIsSubUnit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchSkpd();
  }, []);

  async function fetchSkpd() {
    const { data, error } = await supabase
      .from("skpd")
      .select("*")
      .order("kode", { ascending: true });
    if (!error && data) setSkpdList(data);
  }

  const resetForm = () => {
    setFormData({ id: "", kode: "", nama: "", parent_id: "" });
    setIsSubUnit(false);
    setIsEditing(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload: any = {
      kode: formData.kode.trim(),
      nama: formData.nama.trim(),
      parent_id: isSubUnit && formData.parent_id ? parseInt(formData.parent_id) : null
    };

    if (isEditing) {
      const { error } = await supabase.from("skpd").update(payload).eq("id", formData.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from("skpd").insert([payload]);
      if (error) alert(error.message);
    }
    resetForm();
    fetchSkpd();
    setLoading(false);
  }

  const handleEdit = (item: any) => {
    setFormData({
      id: item.id,
      kode: item.kode,
      nama: item.nama,
      parent_id: item.parent_id ? item.parent_id.toString() : ""
    });
    setIsSubUnit(!!item.parent_id);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function deleteSkpd(id: number) {
    if (confirm("Hapus data ini secara permanen?")) {
      const { error } = await supabase.from("skpd").delete().eq("id", id);
      if (!error) fetchSkpd();
    }
  }

  const filteredData = skpdList.filter(item => 
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || item.kode.includes(searchTerm)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#334155] p-6 md:p-12 font-['Plus_Jakarta_Sans',sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus_Jakarta_Sans', sans-serif; }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-300 pb-8 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-[0.2em]"><Briefcase size={14} /> Organization Cluster</div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight italic">Master Data SKPD</h1>
            <p className="text-slate-500 font-medium text-sm">Kelola struktur birokrasi dan hierarki unit kerja pemerintah.</p>
          </div>
          <div className="px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Unit</p>
            <p className="text-xl font-extrabold text-slate-800">{skpdList.length}</p>
          </div>
        </header>

        <section className={`bg-white border-t-4 ${isEditing ? 'border-orange-500' : 'border-blue-600'} rounded-3xl shadow-xl p-8`}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Kode Unit</label>
              <input value={formData.kode} onChange={(e) => setFormData({...formData, kode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold" required />
            </div>
            <div className="md:col-span-6">
              <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Nama Lengkap Instansi</label>
              <input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-semibold" required />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Level Hierarki</label>
              <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button type="button" onClick={() => setIsSubUnit(false)} className={`flex-1 py-3 rounded-xl text-xs font-extrabold ${!isSubUnit ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>INDUK</button>
                <button type="button" onClick={() => setIsSubUnit(true)} className={`flex-1 py-3 rounded-xl text-xs font-extrabold ${isSubUnit ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>SUB-UNIT</button>
              </div>
            </div>
            {isSubUnit && (
              <div className="md:col-span-12">
                <select value={formData.parent_id} onChange={(e) => setFormData({...formData, parent_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-semibold" required>
                  <option value="">-- Pilih Instansi Induk --</option>
                  {skpdList.filter(s => !s.parent_id && s.id !== parseInt(formData.id)).map(induk => (
                    <option key={induk.id} value={induk.id}>{induk.kode} - {induk.nama}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-12 flex gap-4">
              <button type="submit" disabled={loading} className={`flex-1 p-4 rounded-2xl font-extrabold text-sm text-white shadow-lg ${isEditing ? 'bg-orange-600' : 'bg-slate-900'}`}>
                {loading ? "Proses..." : isEditing ? "SIMPAN PERUBAHAN" : "SIMPAN DATA"}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} className="px-10 bg-slate-200 rounded-2xl font-bold text-slate-600">Batal</button>
              )}
            </div>
          </form>
        </section>

        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
          <div className="p-6 border-b border-slate-100 flex justify-between gap-4">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari unit..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none" />
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="p-6">Code</th>
                  <th className="p-6">Designation</th>
                  <th className="p-6 text-center">Layer</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 group transition-all">
                    <td className="p-6 font-mono text-xs font-bold text-blue-600">{item.kode}</td>
                    <td className={`p-6 ${item.parent_id ? 'pl-12 text-slate-400 italic text-xs' : 'font-extrabold text-slate-800 uppercase text-sm'}`}>{item.nama}</td>
                    <td className="p-6 text-center">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black ${item.parent_id ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white'}`}>{item.parent_id ? "SUB-UNIT" : "MASTER-ID"}</span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(item)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Pencil size={16} /></button>
                        <button onClick={() => deleteSkpd(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-8 bg-slate-50 flex justify-between items-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entry {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)}</p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 disabled:opacity-30"><ChevronLeft size={20} /></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 disabled:opacity-30"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}