"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { KeyRound, User, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State untuk show password
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      let emailToLogin = identifier;

      // LOGIKA: Jika input bukan email, cari email berdasarkan Nama di tabel Profiles
      if (!identifier.includes("@")) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .ilike("nama_lengkap", identifier.trim()) 
          .single();

        if (profileError || !profile) {
          throw new Error("Nama '" + identifier + "' tidak ditemukan dalam database petugas.");
        }
        emailToLogin = profile.email;
      }

      // PROSES LOGIN
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password: password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          throw new Error("Password yang Anda masukkan salah.");
        }
        throw error;
      }

      // BERHASIL LOGIN
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 font-sans">
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] shadow-2xl shadow-blue-900/20">
        
        {/* HEADER: LOGO FOTO AJUDAN PRIA */}
        <div className="text-center mb-10">
          <div className="inline-flex mb-4 relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
            <div className="relative w-24 h-24 rounded-full border-2 border-blue-500/30 p-1.5 bg-slate-900/50 backdrop-blur-sm">
              <div className="w-full h-full rounded-full border border-blue-400/50 overflow-hidden bg-white shadow-inner">
                <img 
                  src="/ajudan-pria.png" 
                  alt="Ajudan Logo" 
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
            AJUDAN <span className="text-blue-500">TAPD</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">ACCESS CONTROL SYSTEM</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold animate-in fade-in zoom-in">
            <AlertCircle size={18} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* INPUT IDENTITY */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase ml-2 tracking-widest">User Identity</label>
            <div className="relative group">
              <User className="absolute left-4 top-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="NAMA LENGKAP / EMAIL" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-12 pr-4 p-4 bg-slate-950/80 border border-white/5 rounded-2xl text-white font-bold text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-700 uppercase"
                required 
              />
            </div>
          </div>

          {/* INPUT PASSWORD DENGAN SHOW/HIDE */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase ml-2 tracking-widest">Security Key</label>
            <div className="relative group">
              <KeyRound className="absolute left-4 top-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 p-4 bg-slate-950/80 border border-white/5 rounded-2xl text-white font-bold text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-700"
                required 
              />
              {/* TOMBOL MATA */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-slate-600 hover:text-blue-400 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "AUTHORIZE ACCESS"}
          </button>
        </form>

        <p className="mt-8 text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          Sistem Informasi Perencanaan Daerah v1.0
        </p>
      </div>
    </div>
  );
}
