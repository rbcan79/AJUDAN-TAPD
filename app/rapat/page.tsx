"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Video, Calendar, Clock, ArrowLeft, 
  Users, PlayCircle, Loader2, Save, StickyNote, CheckCircle,
  Plus, X, Radio, Trash2
} from "lucide-react";

export default function RapatTAPDPage() {
  const [loading, setLoading] = useState(true);
  const [listRapat, setListRapat] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  
  // State Catatan
  const [catatan, setCatatan] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // State Modal Tambah Rapat
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

  // LOGIKA REAL-TIME PRESENCE (Melacak User Online)
  useEffect(() => {
    if (!activeRoom || !userProfile) return;

    const channel = supabase.channel(`rapat_${activeRoom.id}`, {
      config: { presence: { key: userProfile.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: userProfile.id,
            nama: userProfile.nama_lengkap,
            role: userProfile.role,
            avatar: userProfile.avatars
          });
        }
      });

    return () => { channel.unsubscribe(); };
  }, [activeRoom, userProfile]);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: prof } = await supabase.from("profiles")
        .select("id, nama_lengkap, role, avatars")
        .eq("id", session.user.id).single();
      setUserProfile(prof);
    }

    const { data: rapat } = await supabase.from("rapat")
      .select("*")
      .order("tanggal_rapat", { ascending: false });
    
    setListRapat(rapat || []);
    setLoading(false);
  };

  // FUNGSI TAMBAH JADWAL (ADMIN ONLY)
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

  // FUNGSI CATATAN
  const fetchUserNote = async (rapatId: string, userId: string) => {
    const { data } = await supabase.from("catatan_rapat")
      .select("isi_catatan").eq("rapat_id", rapatId).eq("user_id", userId).single();
    if (data) setCatatan(data.isi_catatan);
    else setCatatan("");
  };

  const saveNote = async () => {
    if (!activeRoom || !userProfile) return;
    setIsSaving(true);
    const { error } = await supabase.from("catatan_rapat").upsert({
      rapat_id: activeRoom.id,
      user_id: userProfile.id,
      isi_catatan: catatan,
      updated_at: new Date()
    }, { onConflict: 'rapat_id,user_id' });

    if (!error) setLastSaved(new Date().toLocaleTimeString());
    setIsSaving(false);
  };

  // GABUNG KE JITSI
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
        configOverwrite: { 
          startWithAudioMuted: true,
          prejoinPageEnabled: false 
        },
      });
    }, 500);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="animate-spin text-[#002855] mb-2" />
      <p className="text-[10px] font-black text-slate-400 uppercase italic">Sinkronisasi Sistem Rapat...</p>
    </div>
  );

  // --- VIEW: RUANG RAPAT AKTIF ---
  if (activeRoom) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col overflow-hidden">
        {/* Header Room */}
        <div className="p-3 bg-slate-800 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button onClick={() => window.location.reload()} className="p-2 bg-slate-700 hover:bg-rose-600 text-white rounded-lg transition-all shadow-lg">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-white text-[11px] font-black uppercase italic leading-none">{activeRoom.judul_rapat}</h1>
              <p className="text-[8px] text-indigo-400 font-bold uppercase mt-1">Live Conference System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
                <Radio size={12} className="text-rose-500 animate-pulse" />
                <span className="text-[9px] font-black text-white uppercase italic">Sedang Berlangsung</span>
             </div>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sisi Kiri: Video */}
          <div className="flex-1 bg-black relative">
            <div id="jitsi-container" className="w-full h-full"></div>
          </div>

          {/* Sisi Kanan: Sidebar (Online Users & Catatan) */}
          <div className="w-80 md:w-96 bg-white flex flex-col border-l border-slate-200 shadow-2xl overflow-hidden">
            
            {/* Daftar Peserta Online */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-indigo-600" />
                <span className="text-[10px] font-black text-slate-700 uppercase">Peserta Online ({onlineUsers.length})</span>
              </div>
              <div className="flex flex-wrap gap-2 overflow-y-auto max-h-24 p-1">
                {onlineUsers.map((u: any) => (
                  <div key={u.id} className="group relative flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 overflow-hidden border border-indigo-200">
                      {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <div className="text-[8px] font-bold text-center mt-0.5">U</div>}
                    </div>
                    <span className="text-[9px] font-black text-slate-700 uppercase truncate max-w-[80px]">{u.nama}</span>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notulensi */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <StickyNote size={14} className="text-[#002855]" />
                <span className="text-[10px] font-black text-slate-700 uppercase">Notulensi Pribadi</span>
              </div>
              {lastSaved && <span className="text-[8px] font-bold text-emerald-500 italic">Saved: {lastSaved}</span>}
            </div>
            
            <textarea 
              className="flex-1 p-5 text-[13px] font-bold text-slate-900 leading-relaxed outline-none resize-none bg-white placeholder:text-slate-300"
              placeholder="Ketik poin penting rapat di sini..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={saveNote}
                disabled={isSaving}
                className="w-full py-3.5 bg-[#002855] hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span className="text-[10px] font-black uppercase italic tracking-widest">Simpan Catatan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: DAFTAR JADWAL RAPAT ---
  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* Banner Utama */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#002855] text-white rounded-2xl shadow-xl shadow-blue-900/20"><Video size={28} /></div>
            <div>
              <h1 className="text-lg font-black uppercase italic leading-none text-slate-800">Ruang Rapat Virtual</h1>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic">Sistem Konferensi Digital TAPD</p>
            </div>
          </div>

          {(userProfile?.role === "superadmin" || userProfile?.role === "ADMIN") && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase italic flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <Plus size={18} /> Buat Jadwal Baru
            </button>
          )}
        </div>

        {/* Tabel Agenda */}
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[#002855]">Agenda Rapat</th>
                <th className="px-8 py-5 text-[#002855]">Jadwal Pelaksanaan</th>
                <th className="px-8 py-5 text-center text-[#002855]">Aksi Utama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {listRapat.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-black text-slate-800 uppercase italic leading-none group-hover:text-indigo-600 transition-colors">{r.judul_rapat}</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase italic">{r.keterangan || "Tidak ada deskripsi"}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar size={14}/></div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 uppercase">
                          {new Date(r.tanggal_rapat).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase italic flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {new Date(r.tanggal_rapat).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => joinRapat(r)} 
                      className="px-6 py-3 bg-[#002855] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase italic flex items-center gap-2 mx-auto transition-all shadow-md active:scale-95"
                    >
                      <PlayCircle size={16} /> Gabung Rapat
                    </button>
                  </td>
                </tr>
              ))}
              {listRapat.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-20 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Belum ada agenda rapat terjadwal</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: TAMBAH RAPAT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#002855]/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in duration-300">
            <div className="p-7 bg-[#002855] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl"><Video size={20} /></div>
                <div>
                  <h3 className="text-sm font-[1000] uppercase italic leading-none">Agenda Rapat Baru</h3>
                  <p className="text-[9px] font-bold text-indigo-300 mt-1 uppercase tracking-widest">Input Penjadwalan TAPD</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddRapat} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest italic">Judul Agenda</label>
                <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all" placeholder="Contoh: Pembahasan RKPD 2026" value={formData.judul_rapat} onChange={(e) => setFormData({...formData, judul_rapat: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest italic">Keterangan Singkat</label>
                <textarea className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 focus:border-indigo-500 focus:bg-white outline-none h-24 resize-none transition-all" placeholder="Tuliskan poin utama..." value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest italic">Tanggal</label>
                  <input required type="date" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 outline-none transition-all" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest italic">Waktu Mulai</label>
                  <input required type="time" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 outline-none transition-all" value={formData.jam} onChange={(e) => setFormData({...formData, jam: e.target.value})} />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#002855] text-white rounded-2xl text-[11px] font-[1000] uppercase italic flex items-center justify-center gap-3 shadow-2xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Simpan Agenda Rapat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}