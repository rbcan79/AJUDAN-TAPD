"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  UserPlus, Trash2, Edit3, Check, X, 
  RefreshCw, ShieldCheck, Lock, Camera, Eye, EyeOff, User
} from "lucide-react";

export default function RegisterPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // State Show Password
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [listSkpd, setListSkpd] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // State Form Register
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("SKPD (OPD)");
  const [kdSkpd, setKdSkpd] = useState(""); 
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // State Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState(""); 
  const [editAvatar, setEditAvatar] = useState("");
  const [editKdSkpd, setEditKdSkpd] = useState("");

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Ambil data SKPD untuk dropdown
      const { data: skpdData } = await supabase
        .from("skpd")
        .select("kode, nama")
        .order("kode", { ascending: true });
      if (skpdData) setListSkpd(skpdData);

      // Ambil profile user yang sedang login
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setCurrentUser(profile);

      let query = supabase.from("profiles").select("*").order("nama_lengkap", { ascending: true });
      
      // Filter: Selain superadmin hanya lihat diri sendiri
      if (profile && profile.role !== "superadmin") {
        query = query.eq("id", session.user.id);
      }

      const { data: profilesData } = await query;
      if (profilesData) setProfiles(profilesData);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isSuperAdmin = currentUser?.role === "superadmin";

  const uploadAvatar = async (event: any, isEdit = false) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
      const filePath = `user_avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      isEdit ? setEditAvatar(publicUrl) : setAvatarUrl(publicUrl);
    } catch (error: any) {
      alert("Gagal upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create User di Auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (authData.user) {
        // Tentukan KD SKPD (Jika admin/superadmin biasanya akses global/ALL)
        const finalKdSkpd = (role === 'superadmin' || role === 'TAPD' || role === 'ADMIN') ? 'ALL' : kdSkpd;
        
        // 2. Insert ke tabel profiles (Menggunakan avatar_url sesuai gambar DB)
        const { error: profileError } = await supabase.from("profiles").upsert({ 
          id: authData.user.id, 
          nama_lengkap: nama, 
          role, 
          email,
          kd_skpd: finalKdSkpd, 
          avatar_url: avatarUrl // Disesuaikan dengan kolom DB Anda
        });

        if (profileError) throw profileError;

        alert("Petugas Berhasil Didaftarkan");
        // Reset Form
        setNama(""); setEmail(""); setPassword(""); setAvatarUrl(""); setKdSkpd("");
        fetchData();
      }
    } catch (err: any) { 
        alert(err.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleUpdate = async (id: string) => {
    setLoading(true);
    try {
      const finalKdSkpd = (editRole === 'superadmin' || editRole === 'TAPD' || editRole === 'ADMIN') ? 'ALL' : editKdSkpd;
      const updateData: any = { 
        nama_lengkap: editNama, 
        email: editEmail,
        avatar_url: editAvatar, // Disesuaikan dengan kolom DB Anda
        kd_skpd: finalKdSkpd 
      };
      
      if (isSuperAdmin) updateData.role = editRole;

      const { error: profileError } = await supabase.from("profiles").update(updateData).eq("id", id);
      if (profileError) throw profileError;

      // Update password jika diisi
      if (editPassword) {
        const { error: pwdError } = await supabase.auth.updateUser({ password: editPassword });
        if (pwdError) throw pwdError;
      }
      
      setEditId(null);
      setEditPassword("");
      setShowEditPassword(false);
      alert("Data berhasil diperbarui");
      fetchData();
    } catch (err: any) { 
        alert(err.message); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-md border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#002855] rounded-lg text-white">
            <User size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 uppercase italic leading-none">Manajemen Petugas</h1>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={10} className="text-blue-600" /> Sesi: {currentUser?.nama_lengkap} ({currentUser?.role})
            </p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded transition-colors">
          <RefreshCw size={14} className={`${fetching ? 'animate-spin' : ''} text-slate-400`} />
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* FORM REGISTER */}
        <div className="col-span-12 lg:col-span-3">
          {isSuperAdmin ? (
            <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden sticky top-4">
              <div className="bg-[#002855] p-2 text-white text-[9px] font-black uppercase italic flex items-center gap-2">
                <UserPlus size={12} /> Registrasi Baru
              </div>
              <form onSubmit={handleRegister} className="p-3 space-y-2">
                <div className="flex justify-center mb-2">
                  <div className="w-16 h-16 bg-slate-50 rounded border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" /> : <Camera size={18} className="text-slate-300" />}
                    <input type="file" onChange={(e) => uploadAvatar(e, false)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </div>
                </div>
                
                <input type="text" placeholder="NAMA LENGKAP" value={nama} onChange={(e)=>setNama(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none" required />
                <input type="email" placeholder="EMAIL" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none" required />
                
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="PASSWORD" 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none pr-8" 
                    required 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 text-slate-400">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none"
                >
                  <option value="SKPD (OPD)">SKPD (OPD)</option>
                  <option value="TAPD">TAPD</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="superadmin">SUPERADMIN</option>
                </select>

                {role === "SKPD (OPD)" && (
                  <select 
                    value={kdSkpd} 
                    onChange={(e) => setKdSkpd(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none"
                    required
                  >
                    <option value="">-- PILIH SKPD --</option>
                    {listSkpd.map((s) => (
                      <option key={s.kode} value={s.kode}>{s.nama}</option>
                    ))}
                  </select>
                )}

                <button disabled={loading || uploading} className="w-full bg-[#002855] text-white p-2 rounded font-black text-[9px] uppercase hover:bg-blue-600 transition-all">
                  {loading ? "MENYIMPAN..." : "DAFTARKAN PETUGAS"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-md border border-slate-200 text-center shadow-sm">
              <Lock size={20} className="mx-auto text-slate-300 mb-2" />
              <p className="text-[9px] font-black text-slate-500 uppercase italic leading-none">Akses Registrasi Terkunci</p>
            </div>
          )}
        </div>

        {/* TABEL DATA */}
        <div className="col-span-12 lg:col-span-9 bg-white rounded-md border border-slate-200 shadow-sm p-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                <th className="pb-3 px-2">Identitas Petugas</th>
                <th className="pb-3 px-2 text-center">Otoritas / SKPD</th>
                <th className="pb-3 px-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profiles.map((p) => {
                const isEditing = editId === p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2">
                      {isEditing ? (
                        <div className="flex gap-4 items-start">
                          <div className="shrink-0 text-center">
                            <div className="w-14 h-14 bg-slate-100 rounded border border-blue-200 flex items-center justify-center relative overflow-hidden group">
                              {editAvatar ? <img src={editAvatar} className="w-full h-full object-cover" alt="preview" /> : <Camera size={14} className="text-slate-300" />}
                              <input type="file" onChange={(e) => uploadAvatar(e, true)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            </div>
                            <p className="text-[7px] font-black text-blue-600 uppercase mt-1">Ganti Foto</p>
                          </div>

                          <div className="space-y-1.5 flex-1 max-w-sm">
                            <input value={editNama} onChange={(e)=>setEditNama(e.target.value)} className="w-full p-1.5 border border-blue-400 rounded text-[10px] font-bold outline-none" placeholder="Nama Lengkap" />
                            <input value={editEmail} onChange={(e)=>setEditEmail(e.target.value)} className="w-full p-1.5 border border-blue-400 rounded text-[10px] font-bold outline-none" placeholder="Email" />
                            
                            <div className="relative">
                              <input 
                                type={showEditPassword ? "text" : "password"} 
                                value={editPassword} 
                                onChange={(e)=>setEditPassword(e.target.value)} 
                                className="w-full p-1.5 border border-orange-400 rounded text-[10px] font-bold outline-none pr-8 bg-orange-50/20" 
                                placeholder="Password Baru (Opsional)" 
                              />
                              <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-2 top-2 text-slate-400">
                                {showEditPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#002855] rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                            {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : <span className="text-white text-xs font-black">{p.nama_lengkap?.substring(0, 1)}</span>}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase text-slate-800 leading-tight">{p.nama_lengkap}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{p.email}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center text-[8px] font-black">
                      <div className="flex flex-col gap-1 items-center">
                        <span className="px-2 py-0.5 rounded border border-blue-100 bg-blue-50 text-blue-600 uppercase">{p.role}</span>
                        <span className="text-slate-400 uppercase">{p.kd_skpd}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={()=>handleUpdate(p.id)} className="p-2 bg-emerald-600 text-white rounded shadow-sm"><Check size={14}/></button>
                            <button onClick={()=>{setEditId(null); setShowEditPassword(false);}} className="p-2 bg-slate-200 text-slate-500 rounded"><X size={14}/></button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={()=>{
                                setEditId(p.id); setEditNama(p.nama_lengkap); setEditEmail(p.email || ""); setEditRole(p.role); setEditAvatar(p.avatar_url || ""); setEditKdSkpd(p.kd_skpd || "");
                              }} 
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            >
                                <Edit3 size={14}/>
                            </button>
                            {isSuperAdmin && p.id !== currentUser?.id && (
                              <button onClick={async () => { if(confirm('Hapus user ini selamanya?')) { await supabase.from('profiles').delete().eq('id', p.id); fetchData(); } }} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                            )}
                          </>
                        )}
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
