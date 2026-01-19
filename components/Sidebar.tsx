"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Video, Calendar, Clock, ArrowLeft, 
  Users, PlayCircle, Loader2, Save, StickyNote, CheckCircle,
  Plus, X
} from "lucide-react";

export default function RapatTAPDPage() {
  const [loading, setLoading] = useState(true);
  const [listRapat, setListRapat] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // States untuk Catatan
  const [catatan, setCatatan] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // States untuk Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    judul_rapat: "",
    keterangan: "",
    tanggal: "",
    jam: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: prof } = await supabase.from("profiles")
        .select("id, nama_lengkap, role")
        .eq("id", session.user.id)
        .single();
      setUserProfile(prof);
    }

    const { data: rapat } = await supabase.from("rapat")
      .select("*")
      .order("tanggal_rapat", { ascending: false });
    
    setListRapat(rapat || []);
    setLoading(false);
  };

  const handleAddRapat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const roomId = `tapd-room-${Math.random().toString(36).substring(2, 9)}`;
    const fullDate = `${formData.tanggal}T${formData.jam}:00`;

    const { error } = await supabase.from("rapat").insert([
      {
        judul_rapat: formData.judul_rapat,
        keterangan: formData.keterangan,
        tanggal_rapat: fullDate,
        room_id: roomId,
        status: 'scheduled'
      }
    ]);

    if (!error) {
      setIsModalOpen(false);
      setFormData({ judul_rapat: "", keterangan: "", tanggal: "", jam: "" });
      fetchInitialData();
    }
    setIsSubmitting(false);
  };

  const fetchUserNote = async (rapatId: string, userId: string) => {
    const { data } = await supabase.from("catatan_rapat")
      .select("isi_catatan").eq("rapat_id", rapatId).eq("user_id", userId).single();
    if (data) setCatatan(data.isi_catatan);
    else setCatatan("");
  };

  const saveNote = async () => {
    if (!activeRoom || !userProfile) return;
    setIsSaving(true);
    await supabase.from("catatan_rapat").upsert({
      rapat_id: activeRoom.id,
      user_id: userProfile.id,
      isi_catatan: catatan,
      updated_at: new Date()
    }, { onConflict: 'rapat_id,user_id' });
    setLastSaved(new Date().toLocaleTimeString());
    setIsSaving(false);
  };

  const joinRapat = (rapat: any) => {
    setActiveRoom(rapat);
    if (userProfile) fetchUserNote(rapat.id, userProfile.id);
    setTimeout(() => {
      // @ts-ignore
      new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: rapat.room_id,
        width: "100%", height: "100%",
        parentNode: document.querySelector("#jitsi-container"),
        userInfo: { displayName: userProfile?.nama_lengkap || "User TAPD" },
      });
    }, 500);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-indigo-600 mb-2" />
      <p className="text-[10px] font-black text-slate-400 uppercase italic">Memuat Data...</p>
    </div>
  );

  // --- VIEW: VIDEO CONFERENCE ---
  if (activeRoom) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
        <div className="p-3 bg-slate-800 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button onClick={() => window.location.reload()} className="p-2 bg-slate-700 hover:bg-rose-600 text-white rounded-lg transition-all">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-white text-[11px] font-black uppercase italic">{activeRoom.judul_rapat}</h1>
          </div>
          <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">{userProfile?.nama_lengkap}</span>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div id="jitsi-container" className="flex-1 bg-black"></div>
          
          {/* KOLOM CATATAN (DIPERBAIKI WARNA TEKSNYA) */}
          <div className="w-80 md:w-96 bg-white flex flex-col border-l border-slate-200">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-700 uppercase">Notulensi Pribadi</span>
              {lastSaved && <span className="text-[8px] font-bold text-emerald-500 italic">Saved: {lastSaved}</span>}
            </div>
            {/* Teks di sini dipastikan Slate-900 (Hitam) */}
            <textarea 
              className="flex-1 p-5 text-[13px] font-semibold text-slate-900 leading-relaxed outline-none resize-none bg-white placeholder:text-slate-300" 
              placeholder="Tulis hasil rapat di sini..." 
              value={catatan} 
              onChange={(e) => setCatatan(e.target.value)} 
            />
            <div className="p-4 bg-slate-50 border-t">
              <button onClick={saveNote} disabled={isSaving} className="w-full py-3 bg-[#002855] text-white rounded-xl text-[10px] font-black uppercase italic flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#002855] text-white rounded-2xl shadow-xl"><Video size={28} /></div>
            <div>
              <h1 className="text-lg font-black uppercase italic leading-none text-slate-800">Ruang Rapat Virtual</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic tracking-widest">Digital Conference System</p>
            </div>
          </div>
          {(userProfile?.role === "superadmin" || userProfile?.role === "ADMIN") && (
            <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase italic flex items-center gap-2 shadow-lg transition-all active:scale-95">
              <Plus size={18} /> Buat Jadwal Rapat
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Agenda Rapat</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listRapat.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-6 py-5">
                    <span className="text-[12px] font-black text-slate-800 uppercase italic leading-none">{r.judul_rapat}</span>
                    <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase">{r.keterangan || "-"}</p>
                  </td>
                  <td className="px-6 py-5 text-[10px] font-bold text-slate-600">
                    {new Date(r.tanggal_rapat).toLocaleString('id-ID')} WIB
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button onClick={() => joinRapat(r)} className="px-5 py-2.5 bg-[#002855] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase italic flex items-center gap-2 mx-auto transition-all shadow-md">
                      <PlayCircle size={14} /> Gabung
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (DIPERBAIKI WARNA TEKS INPUT) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#002855]/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-[#002855] text-white flex justify-between items-center">
              <h3 className="text-sm font-black uppercase italic">Jadwal Rapat Baru</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddRapat} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Judul Rapat</label>
                <input 
                  required type="text" 
                  className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-2xl text-[12px] font-bold text-slate-900 focus:border-indigo-500 outline-none" 
                  value={formData.judul_rapat} 
                  onChange={(e) => setFormData({...formData, judul_rapat: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-2xl text-[12px] font-bold text-slate-900 focus:border-indigo-500 outline-none h-24 resize-none" 
                  value={formData.keterangan} 
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  required type="date" 
                  className="px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-2xl text-[12px] font-bold text-slate-900 outline-none" 
                  value={formData.tanggal} 
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})} 
                />
                <input 
                  required type="time" 
                  className="px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-2xl text-[12px] font-bold text-slate-900 outline-none" 
                  value={formData.jam} 
                  onChange={(e) => setFormData({...formData, jam: e.target.value})} 
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#002855] text-white rounded-2xl text-[11px] font-black uppercase italic shadow-xl flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Simpan Jadwal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
