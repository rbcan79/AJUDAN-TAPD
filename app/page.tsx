"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { 
  LayoutDashboard, FileText, CheckCircle, XCircle, 
  Wallet, List, ChevronDown, ChevronRight, BarChart3, User, Calendar, Folder, FileJson
} from "lucide-react";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [skpdList, setSkpdList] = useState<any[]>([]);
  const [selectedKdSkpd, setSelectedKdSkpd] = useState("all");
  const [allUsulan, setAllUsulan] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsulan: 0, disetujui: 0, ditolak: 0, totalAnggaran: 0 });
  const [pieData, setPieData] = useState<any[]>([]);
  const [expandedSkpd, setExpandedSkpd] = useState<string[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchUsulanData();
    }
  }, [selectedKdSkpd, profile]);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) {
        setProfile(prof);
        if (prof.role === "SKPD (OPD)") {
          setSelectedKdSkpd(prof.kd_skpd); 
        }
      }
    }
    const { data: skpds } = await supabase.from("skpd").select("kode, nama").order("kode", { ascending: true });
    if (skpds) setSkpdList(skpds);
  };

  const fetchUsulanData = async () => {
    let query = supabase.from("usulan").select("*");
    if (profile?.role === "SKPD (OPD)") {
      query = query.eq("kd_skpd", profile.kd_skpd);
    } else if (selectedKdSkpd !== "all") {
      query = query.eq("kd_skpd", selectedKdSkpd);
    }

    const { data, error } = await query;
    if (data && !error) {
      setAllUsulan(data);
      const setuju = data.filter(d => d.status === "Setuju");
      const tolak = data.filter(d => d.status === "Tolak");
      const proses = data.filter(d => d.status !== "Setuju" && d.status !== "Tolak");
      
      setStats({
        totalUsulan: data.length,
        disetujui: setuju.length,
        ditolak: tolak.length,
        totalAnggaran: data.reduce((acc, curr) => acc + (Number(curr.anggaran) || 0), 0)
      });

      setPieData([
        { name: "Setuju", value: setuju.length, color: "#10B981" },
        { name: "Tolak", value: tolak.length, color: "#EF4444" },
        { name: "Proses", value: proses.length, color: "#3B82F6" }
      ].filter(item => item.value > 0));
    }
  };

  const toggleSkpd = (kdSkpd: string) => {
    setExpandedSkpd(prev => 
      prev.includes(kdSkpd) ? prev.filter(i => i !== kdSkpd) : [...prev, kdSkpd]
    );
  };

  const groupedUsulan = allUsulan.reduce((acc: any, curr: any) => {
    if (!acc[curr.kd_skpd]) {
      acc[curr.kd_skpd] = {
        nama_skpd: curr.nama_skpd,
        total_anggaran: 0,
        items: []
      };
    }
    acc[curr.kd_skpd].total_anggaran += Number(curr.anggaran) || 0;
    acc[curr.kd_skpd].items.push(curr);
    return acc;
  }, {});

  return (
    <div className="p-4 bg-[#F8FAFC] min-h-screen font-sans text-slate-900">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-5 border border-slate-200 shadow-sm relative overflow-hidden rounded-xl">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
        <div className="flex items-center gap-5">
          <div className="p-3 bg-[#002855] text-white shadow-lg rounded-lg border-b-4 border-blue-400">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase text-[#002855] leading-none tracking-tight mb-2">
              Dashboard {profile?.role === "SKPD (OPD)" ? "Unit Kerja" : "Analitik"}
            </h1>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2 border border-blue-400">
                <Calendar size={12} className="animate-bounce" />
                TA 2026
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic animate-pulse">
                • {profile?.role === "SKPD (OPD)" ? profile.nama_skpd : "Monitoring System"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {profile?.role !== "SKPD (OPD)" ? (
            <div className="flex flex-col gap-1 w-full md:w-72">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Pilih SKPD:</label>
              <div className="relative border border-slate-300 bg-white rounded-md">
                <select 
                  className="w-full text-[10px] font-black text-slate-700 bg-transparent py-2 px-3 appearance-none outline-none cursor-pointer"
                  value={selectedKdSkpd}
                  onChange={(e) => setSelectedKdSkpd(e.target.value)}
                >
                  <option value="all">KONSOLIDASI SELURUH SKPD</option>
                  {skpdList.map((item, idx) => (
                    <option key={idx} value={item.kode}>{item.kode} - {item.nama}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 border border-blue-100 rounded-lg">
               <User size={16} className="text-blue-600" />
               <div className="flex flex-col">
                 <span className="text-[9px] font-black text-blue-400 uppercase leading-none">Petugas</span>
                 <span className="text-[10px] font-black text-[#002855] uppercase mt-0.5">{profile?.nama_lengkap}</span>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Usulan" value={stats.totalUsulan} border="border-blue-500" />
        <StatCard title="Disetujui" value={stats.disetujui} border="border-emerald-500" />
        <StatCard title="Ditolak" value={stats.ditolak} border="border-rose-500" />
        <div className="bg-[#002855] p-4 border-l-[6px] border-blue-400 shadow-sm flex flex-col justify-center rounded-r-lg">
          <p className="text-[9px] font-black text-blue-300 uppercase mb-1 tracking-widest">Total Anggaran</p>
          <p className="text-sm font-black text-white leading-tight tracking-tight">Rp {stats.totalAnggaran.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* CHART */}
        <div className="lg:col-span-1 bg-white border border-slate-200 p-4 flex flex-col h-[500px] shadow-sm rounded-xl">
          <h3 className="text-[10px] font-black text-slate-500 uppercase border-b pb-2 mb-4 tracking-widest flex items-center gap-2">
            <BarChart3 size={14} className="text-blue-500" /> Status
          </h3>
          <div className="flex-1 min-h-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-center text-slate-300 text-[9px] uppercase font-black">Data Kosong</div>}
          </div>
        </div>

        {/* TREE MENU TABLE - FONT DIPERKECIL */}
        <div className="lg:col-span-3 bg-white border border-slate-200 flex flex-col h-[500px] shadow-sm overflow-hidden rounded-xl">
          <div className="p-3 bg-[#002855] text-white font-black text-[10px] uppercase tracking-widest flex justify-between items-center">
            <div className="flex items-center gap-2"><List size={14} /> DAFTAR USULAN KEGIATAN SKPD</div>
            <div className="text-[8px] bg-blue-600 px-2 py-1 rounded border border-blue-400">DATA LIVE</div>
          </div>
          
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 text-[9px] text-slate-400 uppercase font-black z-20 border-b">
                <tr>
                  <th className="px-6 py-3 tracking-wider">Satuan Kerja / Rincian Kegiatan</th>
                  <th className="px-6 py-3 text-right w-40 tracking-wider">Anggaran (Rp)</th>
                  <th className="px-6 py-3 text-center w-28 tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedUsulan).length > 0 ? (
                  Object.keys(groupedUsulan).map((kd) => (
                    <React.Fragment key={kd}>
                      {/* BARIS INDUK (SKPD) - FONT 11PX */}
                      <tr 
                        onClick={() => toggleSkpd(kd)}
                        className="bg-slate-50/50 border-b border-slate-100 cursor-pointer hover:bg-blue-50/50 transition-all duration-150"
                      >
                        <td className="px-4 py-3 font-black text-[#002855] flex items-center gap-2">
                          <div className={`transition-transform duration-200 ${expandedSkpd.includes(kd) ? 'rotate-90' : ''}`}>
                            <ChevronRight size={14} className="text-blue-500" />
                          </div>
                          <Folder size={15} className="text-amber-500 fill-amber-500/10" />
                          <span className="uppercase text-[11px] tracking-tight">{kd} - {groupedUsulan[kd].nama_skpd}</span>
                        </td>
                        <td className="px-6 py-3 text-right font-black text-[#002855] text-[11px]">
                          {groupedUsulan[kd].total_anggaran.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="text-[8px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-black">
                            {groupedUsulan[kd].items.length} ITEM
                          </span>
                        </td>
                      </tr>

                      {/* BARIS ANAK (ITEM) - FONT 10PX */}
                      {expandedSkpd.includes(kd) && groupedUsulan[kd].items.map((item: any, idx: number) => (
                        <tr key={`${kd}-child-${idx}`} className="border-b border-slate-50 bg-white hover:bg-slate-50/80 transition-all">
                          <td className="px-12 py-2 text-slate-500 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                            <span className="font-bold uppercase italic text-[10px] leading-tight">
                              {item.nama_kegiatan}
                            </span>
                          </td>
                          <td className="px-6 py-2 text-right text-slate-400 font-extrabold italic text-[10px]">
                            {Number(item.anggaran).toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-2 text-center">
                            <span className={`px-2 py-0.5 text-[8px] font-black border rounded-sm ${
                              item.status === 'Setuju' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 
                              item.status === 'Tolak' ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-blue-400 text-blue-500 bg-blue-50'
                            }`}>{item.status || 'PROSES'}</span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr><td colSpan={3} className="py-20 text-center text-slate-300 font-black uppercase italic text-[9px]">Data Tidak Ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, border }: any) {
  return (
    <div className={`bg-white p-4 border-l-[6px] border-y border-r border-slate-200 ${border} shadow-sm rounded-r-lg hover:shadow-md transition-shadow`}>
      <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{title}</p>
      <p className="text-lg font-black text-slate-800 leading-none tracking-tighter">{value}</p>
    </div>
  );
}