"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Settings, Save, ShieldCheck, RefreshCw, Lock, Unlock } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 1. Ambil semua daftar setting
  const fetchSettings = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .order("id", { ascending: true });

    if (!error && data) {
      setSettings(data);
      // Cari data yang saat ini sedang aktif (is_locked = true)
      const active = data.find((item) => item.is_locked === true);
      if (active) setSelectedId(active.id);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // 2. Logika Simpan (Reset All -> Set One)
  const saveSettings = async () => {
    if (!selectedId) return alert("Pilih salah satu periode!");
    
    setLoading(true);
    try {
      // Langkah A: Setel semua is_locked menjadi false
      const { error: resetError } = await supabase
        .from("settings")
        .update({ is_locked: false })
        .not("id", "eq", 0); // Trick agar update kena ke semua row

      if (resetError) throw resetError;

      // Langkah B: Setel is_locked menjadi true hanya untuk ID yang dipilih
      const { error: lockError } = await supabase
        .from("settings")
        .update({ is_locked: true })
        .eq("id", selectedId);

      if (lockError) throw lockError;

      alert("Periode Anggaran Berhasil Dikunci!");
      await fetchSettings(); // Refresh data
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="max-w-md mx-auto bg-white border border-slate-200 shadow-xl rounded-sm overflow-hidden">
        <div className="bg-[#002855] p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings size={20} />
            <h1 className="text-sm font-black uppercase italic">Konfigurasi Periode</h1>
          </div>
          {fetching && <RefreshCw size={16} className="animate-spin" />}
        </div>

        <div className="p-6 space-y-6">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-3">
            <ShieldCheck className="text-amber-600" size={18} />
            <p className="text-[10px] font-bold text-amber-800 uppercase leading-tight">
              Pilih satu periode yang akan dikunci (is_locked). Periode ini akan menjadi acuan utama sistem.
            </p>
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Daftar Fase Anggaran
            </label>
            
            <div className="grid gap-2">
              {settings.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`flex items-center justify-between p-4 border-2 transition-all rounded-sm ${
                    selectedId === item.id 
                    ? "border-blue-600 bg-blue-50/50" 
                    : "border-slate-100 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className={`text-[11px] font-black ${selectedId === item.id ? "text-blue-700" : "text-slate-600"}`}>
                      {item.current_status_anggaran}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase italic">ID: {item.id}</span>
                  </div>
                  {selectedId === item.id ? (
                    <Lock size={16} className="text-blue-600" />
                  ) : (
                    <Unlock size={16} className="text-slate-300" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={saveSettings}
            disabled={loading || fetching}
            className="w-full bg-[#0f172a] text-white p-4 rounded-sm font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {loading ? "Menyimpan..." : "Terapkan Kunci Sistem"}
          </button>
        </div>
      </div>
    </div>
  );
}