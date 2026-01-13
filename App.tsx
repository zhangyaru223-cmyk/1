import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Box, 
  LogOut,
  Trash2,
  Edit2,
  X,
  LayoutList,
  Table as TableIcon,
  Smartphone,
  Info,
  ArrowRight
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  endOfWeek,
  compareDesc,
  compareAsc
} from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import { Equipment, Booking } from './types';

// --- 辅助函数：由于 date-fns 导出问题，使用本地逻辑替代缺失函数 ---

const parseDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const getStartOfWeek = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};

const checkTimeOverlap = (s1: string, e1: string, s2: string, e2: string) => {
  return s1 < e2 && s2 < e1;
};

const TimeSelector: React.FC<{ 
  value: string; 
  onChange: (val: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const [hour, minute] = value.split(':');
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '30'];

  return (
    <div className="space-y-2 flex-1">
      <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">{label}</label>
      <div className="flex gap-2">
        <select 
          value={hour}
          onChange={(e) => onChange(`${e.target.value}:${minute}`)}
          className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-white font-black appearance-none focus:ring-2 focus:ring-red-600 outline-none text-center cursor-pointer"
        >
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select 
          value={minute}
          onChange={(e) => onChange(`${hour}:${e.target.value}`)}
          className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-white font-black appearance-none focus:ring-2 focus:ring-red-600 outline-none text-center cursor-pointer"
        >
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
};

const Onboarding: React.FC<{ onComplete: (name: string) => void }> = ({ onComplete }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (name.trim()) {
      onComplete(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center p-8 text-center z-[100]">
      <div className="mb-16 animate-in fade-in zoom-in duration-700">
        <div className="mb-4">
          <h1 className="text-white text-5xl font-black tracking-[0.2em]">饮啄刺青</h1>
        </div>
        <div className="h-px w-12 bg-red-600 mx-auto mb-4 opacity-50"></div>
        <p className="text-slate-500 font-bold text-sm tracking-[0.4em] uppercase">Inkjoy Tattoo</p>
      </div>
      
      <div className="w-full max-w-xs space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="输入您的名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#111] border border-white/5 rounded-2xl px-6 py-5 text-center text-lg font-bold focus:ring-2 focus:ring-red-600 transition-all text-white placeholder-slate-800 outline-none"
            autoFocus
          />
          <button
            disabled={!name.trim()}
            type="submit"
            className="w-full bg-red-600 disabled:bg-slate-800 disabled:opacity-50 text-white font-black py-5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-900/20 cursor-pointer"
          >
            <span className="text-lg tracking-widest">进入系统</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[9px] text-slate-700 font-bold tracking-widest uppercase italic">Internal Scheduling System</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [artistName, setArtistName] = useState<string | null>(() => localStorage.getItem('artist_name'));
  const [activeTab, setActiveTab] = useState<'calendar' | 'profile'>('calendar');
  const [profileView, setProfileView] = useState<'list' | 'table'>('list');
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('studio_bookings');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 表单状态 - 默认开始时间改为 14:00
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [selectedEquips, setSelectedEquips] = useState<Equipment[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    localStorage.setItem('studio_bookings', JSON.stringify(bookings));
  }, [bookings]);

  const handleLogin = (name: string) => {
    localStorage.setItem('artist_name', name);
    setArtistName(name);
  };

  const handleLogout = () => {
    if(confirm('确定退出当前账号？')) {
      localStorage.removeItem('artist_name');
      setArtistName(null);
    }
  };

  const daysInMonth = useMemo(() => {
    const start = getStartOfWeek(getStartOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const bookingsForSelectedDay = useMemo(() => {
    return bookings
      .filter(b => isSameDay(parseDate(b.date), selectedDate))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [bookings, selectedDate]);

  const myAllBookings = useMemo(() => {
    return bookings
      .filter(b => b.artistName === artistName)
      .sort((a, b) => compareDesc(parseDate(a.date), parseDate(b.date)) || b.startTime.localeCompare(a.startTime));
  }, [bookings, artistName]);

  const allStudioBookingsSorted = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const dateComp = compareAsc(parseDate(a.date), parseDate(b.date));
      if (dateComp !== 0) return dateComp;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [bookings]);

  const dailySummary = useMemo(() => {
    if (bookingsForSelectedDay.length === 0) return ["今日暂无任何预约安排。"];
    const lines: string[] = [];
    const conflicts: string[] = [];

    bookingsForSelectedDay.forEach((b1, i) => {
      bookingsForSelectedDay.slice(i + 1).forEach(b2 => {
        const hasTimeOverlap = checkTimeOverlap(b1.startTime, b1.endTime, b2.startTime, b2.endTime);
        const sharedEquips = b1.equipments.filter(e => b2.equipments.includes(e));
        if (hasTimeOverlap && sharedEquips.length > 0) {
          conflicts.push(`⚠️ ${b1.artistName} 与 ${b2.artistName} 的器材 [${sharedEquips.join('、')}] 冲突`);
        }
      });
    });

    lines.push(`📅 今日全店共 ${bookingsForSelectedDay.length} 条预约`);
    const myCount = bookingsForSelectedDay.filter(b => b.artistName === artistName).length;
    if (myCount > 0) lines.push(`👤 你的工作: ${myCount} 项`);

    return [...conflicts, ...lines];
  }, [bookingsForSelectedDay, artistName]);

  const handleSave = () => {
    if (!artistName) return;
    if (selectedEquips.length === 0) {
      alert('请选择至少一个器材/房间');
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (editingBooking) {
      setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, date: dateStr, startTime, endTime, equipments: selectedEquips, notes } : b));
    } else {
      const newB: Booking = { id: Math.random().toString(36).substr(2, 9), artistName, date: dateStr, startTime, endTime, equipments: selectedEquips, notes, createdAt: Date.now() };
      setBookings(prev => [...prev, newB]);
    }
    setShowModal(false);
    setEditingBooking(null);
  };

  if (!artistName) return <Onboarding onComplete={handleLogin} />;

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-slate-200 overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] select-none">
      <header className="px-6 py-4 flex justify-between items-center bg-[#0a0a0a] border-b border-white/5 sticky top-0 z-30">
        <div className="flex flex-col">
          <h1 className="font-black text-sm tracking-[0.1em] text-white uppercase">饮啄刺青</h1>
          <p className="text-[7px] text-slate-500 font-bold tracking-[0.2em] mt-0.5 uppercase">Internal System</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{artistName}</span>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-lg text-slate-600 active:text-white active:bg-red-600/20 transition-all cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 space-y-6 pb-32">
        {activeTab === 'calendar' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <section className="bg-gradient-to-r from-[#0e0e0e] to-[#111] border border-white/5 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">今日看板</h3>
              </div>
              <div className="space-y-1.5">
                {dailySummary.map((s, i) => (
                  <p key={i} className={`text-[11px] font-bold ${s.startsWith('⚠️') ? 'text-orange-500' : 'text-slate-400'}`}>{s}</p>
                ))}
              </div>
            </section>

            <section className="bg-[#0e0e0e] rounded-3xl p-5 border border-white/5 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black text-white tracking-widest">{format(currentDate, 'yyyy / MM')}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-2 hover:bg-white/5 rounded-xl transition-all"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                  <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/5 rounded-xl transition-all"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-center text-[8px] font-black text-slate-700 uppercase">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {daysInMonth.map((day, idx) => {
                  const hasBooking = bookings.some(b => isSameDay(parseDate(b.date), day));
                  const isSel = isSameDay(day, selectedDate);
                  const isCurMonth = day.getMonth() === currentDate.getMonth();
                  const isTday = isSameDay(day, new Date());
                  
                  return (
                    <button key={idx} onClick={() => setSelectedDate(day)} className={`relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer active:scale-90 ${!isCurMonth ? 'opacity-10' : 'opacity-100'} ${isSel ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                      <span className="text-[10px] font-black">{format(day, 'd')}</span>
                      {isTday && !isSel && <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full"></div>}
                      {hasBooking && !isSel && <div className="absolute bottom-1 w-0.5 h-0.5 bg-red-600 rounded-full"></div>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex justify-between items-baseline px-1 mb-1">
                <h3 className="text-2xl font-black text-white tracking-tighter">{format(selectedDate, 'MM.dd')}</h3>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{format(selectedDate, 'EEEE', { locale: zhCN })}</span>
              </div>
              
              {bookingsForSelectedDay.length === 0 ? (
                <div className="py-12 text-center bg-white/[0.01] rounded-3xl border border-dashed border-white/5 flex flex-col items-center">
                  <Box className="w-8 h-8 text-slate-800 mb-3 opacity-20" />
                  <p className="text-[10px] font-black text-slate-800 tracking-widest uppercase">今日暂无安排</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookingsForSelectedDay.map(b => (
                    <div key={b.id} className={`bg-[#0e0e0e] border rounded-2xl p-4 space-y-3 transition-all ${b.artistName === artistName ? 'border-red-600/30 ring-1 ring-red-600/10' : 'border-white/5'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${b.artistName === artistName ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-slate-600'}`}>
                            {b.artistName[0]}
                          </div>
                          <div>
                            <p className="font-black text-sm text-white uppercase leading-none">{b.artistName}</p>
                            <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1 mt-1.5 uppercase">
                              <Clock className="w-2.5 h-2.5" /> {b.startTime} - {b.endTime}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {b.artistName === artistName && (
                            <>
                              <button onClick={() => { setEditingBooking(b); setStartTime(b.startTime); setEndTime(b.endTime); setSelectedEquips(b.equipments); setNotes(b.notes || ''); setShowModal(true); }} className="p-2.5 bg-white/5 rounded-xl text-slate-500 hover:text-white cursor-pointer active:scale-90 transition-all">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { if(confirmDeleteId === b.id) { setBookings(prev => prev.filter(x => x.id !== b.id)); setConfirmDeleteId(null); } else { setConfirmDeleteId(b.id); setTimeout(() => setConfirmDeleteId(null), 3000); }}} className={`p-2.5 rounded-xl transition-all cursor-pointer active:scale-90 ${confirmDeleteId === b.id ? 'bg-red-600 text-white px-3' : 'bg-white/5 text-slate-500'}`}>
                                {confirmDeleteId === b.id ? <span className="text-[9px] font-black uppercase">确认删除</span> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {b.equipments.map(e => <span key={e} className="px-2 py-0.5 bg-white/5 text-slate-500 text-[8px] font-black uppercase rounded border border-white/5">{e}</span>)}
                      </div>
                      {b.notes && (
                        <div className="bg-white/[0.02] p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-bold italic leading-relaxed">"{b.notes}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="space-y-6 px-1 animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-end pt-4">
              <h3 className="text-2xl font-black text-white tracking-tighter">管理中心</h3>
              <div className="flex bg-[#111] border border-white/5 rounded-xl p-1">
                <button 
                  onClick={() => setProfileView('list')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${profileView === 'list' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600'}`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setProfileView('table')}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${profileView === 'table' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600'}`}
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/40 via-black to-black border border-red-500/20 rounded-3xl p-6 space-y-5 shadow-2xl shadow-red-900/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40 shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">手机使用指南</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">把网页变成桌面的“红图标”App</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">苹果 (iOS)</span>
                  <p className="text-[11px] text-slate-400 font-bold leading-relaxed">浏览器打开 -> 点击底部 <span className="text-white">分享</span> -> 选择「添加到主屏幕」</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">安卓 (Android)</span>
                  <p className="text-[11px] text-slate-400 font-bold leading-relaxed">右上角 <span className="text-white">...</span> -> 选择「添加到桌面」</p>
                </div>
              </div>
            </div>

            {profileView === 'list' ? (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">我的预约明细 ({myAllBookings.length})</p>
                {myAllBookings.length === 0 ? (
                  <div className="py-8 text-center text-[10px] font-bold text-slate-800 uppercase">暂无你的预约</div>
                ) : (
                  myAllBookings.map(b => (
                    <div key={b.id} className="bg-[#0e0e0e] border border-white/5 rounded-2xl p-4 flex justify-between items-center active:bg-white/[0.02] transition-all cursor-pointer">
                      <div>
                        <p className="text-white font-black text-sm">{b.date}</p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-wider">{b.startTime} - {b.endTime}</p>
                      </div>
                      <button onClick={() => { setEditingBooking(b); setSelectedDate(parseDate(b.date)); setStartTime(b.startTime); setEndTime(b.endTime); setSelectedEquips(b.equipments); setNotes(b.notes || ''); setShowModal(true); }} className="p-3 bg-white/5 rounded-xl text-slate-500 cursor-pointer active:scale-90">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">全店排期大表</p>
                <div className="bg-[#0e0e0e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-[#151515] border-b border-white/10">
                          <th className="px-5 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">纹身师</th>
                          <th className="px-5 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">时段</th>
                          <th className="px-5 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">器材/房间</th>
                          <th className="px-5 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allStudioBookingsSorted.map((b, idx) => (
                          <tr key={b.id} className={`border-b border-white/[0.02] ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'}`}>
                            <td className="px-5 py-5">
                              <span className={`text-[11px] font-black px-2.5 py-1.5 rounded-lg ${b.artistName === artistName ? 'bg-red-600/20 text-red-500' : 'text-white bg-white/5'}`}>
                                {b.artistName}
                              </span>
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-300 font-mono">{b.date.split('-').slice(1).join('.')}</span>
                                <span className="text-[9px] font-bold text-slate-600 font-mono mt-0.5">{b.startTime}-{b.endTime}</span>
                              </div>
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex flex-wrap gap-1">
                                {b.equipments.map(e => (
                                  <span key={e} className="text-[7px] font-black px-2 py-0.5 bg-white/5 text-slate-500 border border-white/5 rounded uppercase">{e}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-5">
                              <span className="text-[10px] font-bold text-slate-600 line-clamp-2 leading-relaxed">
                                {b.notes || '--'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {activeTab === 'calendar' && (
        <button 
          onClick={() => { setEditingBooking(null); setStartTime('14:00'); setEndTime('18:00'); setSelectedEquips([]); setNotes(''); setShowModal(true); }} 
          className="fixed bottom-28 right-6 w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/60 active:scale-90 transition-all z-40 cursor-pointer"
        >
          <Plus className="w-8 h-8 text-white" />
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end">
          <div className="bg-[#0e0e0e] w-full rounded-t-[2.5rem] p-8 border-t border-white/10 safe-bottom animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-white tracking-tight">{editingBooking ? '编辑排期' : '新建预约'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/5 rounded-full text-slate-500 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1 pb-4">
              <div className="flex gap-4">
                <TimeSelector label="开始时间" value={startTime} onChange={setStartTime} />
                <TimeSelector label="结束时间" value={endTime} onChange={setEndTime} />
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                  器材 / 房间预约 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(Equipment).map(e => (
                    <button 
                      key={e} 
                      onClick={() => setSelectedEquips(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])} 
                      className={`px-5 py-4 rounded-2xl text-[11px] font-black border transition-all cursor-pointer flex items-center justify-between ${selectedEquips.includes(e) ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-[#1a1a1a] border-white/5 text-slate-500'}`}
                    >
                      {e}
                      <div className={`w-3 h-3 rounded-full border-2 ${selectedEquips.includes(e) ? 'bg-white border-white' : 'border-slate-800'}`}></div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">备注说明</label>
                <textarea 
                  placeholder="如：隐私部位等.." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 text-[12px] h-28 outline-none text-white font-bold placeholder-slate-800 focus:border-red-600/50 transition-all resize-none" 
                />
              </div>
              
              <button 
                disabled={selectedEquips.length === 0}
                onClick={handleSave} 
                className={`w-full text-white font-black py-5 rounded-2xl text-sm uppercase tracking-[0.4em] transition-all shadow-2xl cursor-pointer ${selectedEquips.length === 0 ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-red-600 active:scale-95 shadow-red-900/30'}`}
              >
                保存此排期
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center h-24 safe-bottom z-40">
        <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'calendar' ? 'text-red-600' : 'text-slate-600 hover:text-slate-400'}`}>
          <div className={`p-2 rounded-xl ${activeTab === 'calendar' ? 'bg-red-600/10' : ''}`}>
            <CalendarIcon className="w-5 h-5" />
          </div>
          <span className="text-[8px] font-black tracking-[0.2em] uppercase">日历排期</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'profile' ? 'text-red-600' : 'text-slate-600 hover:text-slate-400'}`}>
          <div className={`p-2 rounded-xl ${activeTab === 'profile' ? 'bg-red-600/10' : ''}`}>
            <User className="w-5 h-5" />
          </div>
          <span className="text-[8px] font-black tracking-[0.2em] uppercase">我的管理</span>
        </button>
      </nav>
    </div>
  );
};

export default App;