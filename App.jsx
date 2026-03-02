import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Plus, Trash2, Clock, Layout, ChevronLeft, ChevronRight, Download, Zap, LogIn, LogOut, Brain, Dumbbell, ArrowUpDown } from 'lucide-react';
import { format, addDays, subDays, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { initGoogleClient, fetchCalendarEvents } from './utils/GoogleCalendar';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  // --- STATE MANAGEMENT ---
  const [activeDate, setActiveDate] = useState(new Date());
  const [userInput, setUserInput] = useState("");
  const [allSchedules, setAllSchedules] = useState({});
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Load from Local Storage on Mount
  useEffect(() => {
    const saved = localStorage.getItem("planPerfect_schedules");
    if (saved) {
      setAllSchedules(JSON.parse(saved));
    }
    initGoogleClient().then(() => {
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (authInstance?.isSignedIn.get()) {
        setIsGoogleConnected(true);
        loadGoogleEventsForDate(activeDate);
      }
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to Local Storage on Change
  useEffect(() => {
    localStorage.setItem("planPerfect_schedules", JSON.stringify(allSchedules));
  }, [allSchedules]);

  // Load events when date changes IF connected
  useEffect(() => {
    if (isGoogleConnected) {
      loadGoogleEventsForDate(activeDate);
    }
  }, [activeDate, isGoogleConnected]);


  // --- GOOGLE AUTH ---
  const login = useGoogleLogin({
    onSuccess: async () => {
      setIsGoogleConnected(true);
      await initGoogleClient();
      loadGoogleEventsForDate(activeDate);
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
  });

  const logout = () => {
    googleLogout();
    setIsGoogleConnected(false);
    const authInstance = window.gapi.auth2.getAuthInstance();
    if (authInstance) authInstance.signOut();
  };

  const loadGoogleEventsForDate = async (date) => {
    setIsLoadingEvents(true);
    const start = startOfDay(date);
    const end = endOfDay(date);
    const events = await fetchCalendarEvents(start, end);

    const dateKey = format(date, 'yyyy-MM-dd');

    setAllSchedules(prev => {
      const existingTasks = prev[dateKey] || [];
      const nonGoogleTasks = existingTasks.filter(t => !t.isReadOnly);
      return { ...prev, [dateKey]: [...nonGoogleTasks, ...events] };
    });
    setIsLoadingEvents(false);
  };

  // --- TEMPLATES ---
  const templates = {
    "Focus Mode": {
      icon: <Brain size={18} className="text-purple-400" />,
      tasks: [
        { id: "T1", time: "08:00 AM", task: "Deep Work Session 1", type: "Focus" },
        { id: "T2", time: "10:30 AM", task: "Admin & Emails", type: "Admin" },
        { id: "T3", time: "01:00 PM", task: "Deep Work Session 2", type: "Focus" },
        { id: "T4", time: "04:30 PM", task: "Wrap-up & Planning", type: "Focus" },
      ]
    },
    "Student Life": {
      icon: <Sparkles size={18} className="text-blue-400" />,
      tasks: [
        { id: "S1", time: "09:00 AM", task: "Morning Lecture", type: "Study" },
        { id: "S2", time: "11:30 AM", task: "Library Research", type: "Study" },
        { id: "S3", time: "02:00 PM", task: "Assignment Work", type: "Focus" },
        { id: "S4", time: "07:00 PM", task: "Review & Flashcards", type: "Study" },
      ]
    },
    "Workout Day": {
      icon: <Dumbbell size={18} className="text-orange-400" />,
      tasks: [
        { id: "W1", time: "06:00 AM", task: "Morning Cardio", type: "Exercise" },
        { id: "W2", time: "08:00 AM", task: "Protein Meal Prep", type: "Health" },
        { id: "W3", time: "05:00 PM", task: "Strength Training", type: "Exercise" },
        { id: "W4", time: "08:00 PM", task: "Stretching/Recovery", type: "Health" },
      ]
    }
  };

  const applyTemplate = (templateName) => {
    const dateKey = format(activeDate, 'yyyy-MM-dd');
    setAllSchedules(prev => {
      const existing = prev[dateKey] || [];
      const googleTasks = existing.filter(t => t.isReadOnly);

      const templateTasks = templates[templateName].tasks.map((t, i) => ({
        ...t,
        id: `template_${Date.now()}_${i}`
      }));

      return {
        ...prev,
        [dateKey]: [...googleTasks, ...templateTasks]
      };
    });
  };

  // --- AI LOGIC ---
  const generateAITasks = (prompt) => {
    const input = prompt.toLowerCase();
    const baseId = Date.now();

    if (input.includes("student") || input.includes("study")) {
      return templates["Student Life"].tasks.map((t, i) => ({ ...t, id: `ai_${baseId}_${i}` }));
    } else if (input.includes("workout") || input.includes("gym")) {
      return templates["Workout Day"].tasks.map((t, i) => ({ ...t, id: `ai_${baseId}_${i}` }));
    } else if (input.includes("business") || input.includes("work")) {
      return [
        { id: `ai_${baseId}_1`, time: "09:00 AM", task: "Email Triaging", type: "Work" },
        { id: `ai_${baseId}_2`, time: "10:30 AM", task: "Client Strategy Meeting", type: "Business" },
        { id: `ai_${baseId}_3`, time: "02:30 PM", task: "Deep Work: Core Projects", type: "Work" }
      ];
    } else {
      return [{ id: `ai_${baseId}`, time: "10:00 AM", task: prompt, type: "AI Generated" }];
    }
  };

  const handleAiUpdate = () => {
    if (!userInput) return;
    const dateKey = format(activeDate, 'yyyy-MM-dd');
    const newTasks = generateAITasks(userInput);

    setAllSchedules(prev => {
      const current = prev[dateKey] || [];
      return { ...prev, [dateKey]: [...current, ...newTasks] };
    });
    setUserInput("");
  };

  // --- HANDLERS ---
  const handlePrevDay = () => setActiveDate(prev => subDays(prev, 1));
  const handleNextDay = () => setActiveDate(prev => addDays(prev, 1));
  const goToToday = () => setActiveDate(new Date());

  const addTaskManually = () => {
    const dateKey = format(activeDate, 'yyyy-MM-dd');
    const newTask = { id: `manual_${Date.now()}`, time: "12:00 PM", task: "", type: "Custom" };
    setAllSchedules(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newTask]
    }));
  };

  const deleteTask = (id) => {
    const dateKey = format(activeDate, 'yyyy-MM-dd');
    setAllSchedules(prev => ({
      ...prev,
      [dateKey]: prev[dateKey].filter(t => t.id !== id)
    }));
  };

  const updateTask = (id, field, value) => {
    const dateKey = format(activeDate, 'yyyy-MM-dd');
    setAllSchedules(prev => {
      const dayTasks = prev[dateKey] || [];
      const updatedTasks = dayTasks.map(t =>
        t.id === id ? { ...t, [field]: value } : t
      );
      return { ...prev, [dateKey]: updatedTasks };
    });
  };

  // Convert "08:00 AM" to minutes from midnight for sorting
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.trim().split(' ');
    if (!time || !modifier) return 0;

    let [hours, minutes] = time.split(':');
    if (!hours || !minutes) return 0;

    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);

    if (hours === 12) {
      hours = modifier.toUpperCase() === 'AM' ? 0 : 12;
    } else if (modifier.toUpperCase() === 'PM') {
      hours = hours + 12;
    }

    return hours * 60 + minutes;
  };

  const sortTasks = () => {
    const dateKey = format(activeDate, 'yyyy-MM-dd');
    setAllSchedules(prev => {
      const current = prev[dateKey] || [];
      const sorted = [...current].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      return { ...prev, [dateKey]: sorted };
    });
  };

  // Setup sidebar days (Show today + 6 days ahead)
  const sidebarDays = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));
  const dateKey = format(activeDate, 'yyyy-MM-dd');
  const currentTasks = allSchedules[dateKey] || [];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans flex selection:bg-purple-500/30">

      {/* SIDEBAR */}
      <aside className="w-80 bg-[#0a0a0a] border-r border-white/5 p-8 flex flex-col hidden lg:flex h-screen overflow-y-auto">
        <div className="flex items-center gap-2 mb-12 text-white font-black text-2xl italic tracking-tighter">
          <Zap className="text-purple-500" fill="currentColor" /> PLAN<span className="text-purple-500">PERFECT</span>
        </div>

        {/* DAYS TABS */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Upcoming Days</h3>
        <div className="space-y-3 mb-10">
          {sidebarDays.map(day => {
            const isSelected = isSameDay(day, activeDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setActiveDate(day)}
                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group 
                  ${isSelected
                    ? 'bg-purple-600/10 border-purple-500/50 text-white shadow-lg shadow-purple-900/10'
                    : 'bg-white/5 border-white/5 hover:border-purple-500/30 hover:bg-white/10'}`}
              >
                <div>
                  <div className={`font-bold text-sm ${isSelected ? 'text-purple-400' : 'group-hover:text-purple-300'}`}>
                    {format(day, 'EEEE')}
                  </div>
                  <div className="text-[10px] text-slate-500">{format(day, 'MMM d, yyyy')}</div>
                </div>
                {isSameDay(day, new Date()) && <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">TODAY</span>}
              </button>
            )
          })}
        </div>

        {/* TEMPLATES */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Templates</h3>
        <div className="space-y-3 flex-1">
          {Object.keys(templates).map(name => (
            <button
              key={name}
              onClick={() => applyTemplate(name)}
              className="w-full flex items-center gap-4 text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
            >
              <div className="opacity-70 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                {templates[name].icon}
              </div>
              <div>
                <div className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">{name}</div>
                <div className="text-[10px] text-slate-500">Apply to {format(activeDate, 'MMM d')}</div>
              </div>
            </button>
          ))}
        </div>

        {/* GOOGLE CALENDAR BUTTON */}
        <div className="mt-8 pt-8 border-t border-white/5">
          {isGoogleConnected ? (
            <button onClick={logout} className="w-full flex justify-center items-center gap-2 py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-xl transition-all text-sm font-bold">
              <LogOut size={16} /> Disconnect Google
            </button>
          ) : (
            <button onClick={() => login()} className="w-full flex justify-center items-center gap-2 py-3 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/30 rounded-xl transition-all text-sm font-bold">
              <Calendar size={16} /> Connect Google
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 lg:p-12 h-screen overflow-y-auto relative">

        {/* STICKY HEADER */}
        <header className="sticky top-0 z-10 bg-[#050505]/90 backdrop-blur-xl pb-6 mb-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 bg-white/[0.02] p-2 rounded-2xl border border-white/10 shadow-lg">
            <button onClick={handlePrevDay} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronLeft /></button>
            <div className="text-center min-w-[200px]" onClick={goToToday} role="button">
              <h2 className="text-2xl font-black text-white tracking-tight">{format(activeDate, 'EEEE')}</h2>
              <p className="text-sm font-medium text-purple-400">{format(activeDate, 'MMMM d, yyyy')}</p>
            </div>
            <button onClick={handleNextDay} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronRight /></button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={sortTasks} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all group">
              <ArrowUpDown size={18} className="text-purple-400 group-hover:text-purple-300" /> Sort by Time
            </button>
            <button onClick={addTaskManually} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20 transition-all active:scale-95">
              <Plus size={20} /> Add Task
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-7xl mx-auto">

          {/* AI INPUT */}
          <div className="xl:col-span-4 bg-white/[0.02] border border-white/10 p-8 rounded-[40px] shadow-2xl h-fit sticky top-32">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-lg">
              <Sparkles size={20} className="text-purple-400" /> AI Scenario Builder
            </h3>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full h-40 bg-black/40 border border-white/5 rounded-3xl p-5 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none mb-6 placeholder-slate-600 text-sm leading-relaxed"
              placeholder="E.g. 'I'm a student who needs to study biology and go to the gym today...'"
            />
            <button
              onClick={handleAiUpdate}
              className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-purple-400 hover:text-white transition-all shadow-xl active:scale-95"
            >
              Generate Routine
            </button>
          </div>

          {/* TIMELINE VIEW (Live Edit) */}
          <div className="xl:col-span-8 space-y-4">

            {isLoadingEvents && (
              <div className="flex justify-center p-8">
                <span className="text-purple-400 animate-pulse font-bold">Syncing Google Calendar...</span>
              </div>
            )}

            {currentTasks.length === 0 && !isLoadingEvents && (
              <div className="flex flex-col items-center justify-center p-20 border border-dashed border-white/10 rounded-[40px] bg-white/[0.01]">
                <Clock className="text-slate-700 mb-4" size={48} />
                <p className="text-xl font-bold text-slate-500">Your day is empty.</p>
                <p className="text-slate-600 text-sm mt-2">Use the AI Scenario Builder or add a task to get started.</p>
              </div>
            )}

            <AnimatePresence>
              {currentTasks.map(t => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  key={t.id}
                  className={`relative p-5 sm:p-6 rounded-[32px] flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group transition-all overflow-hidden
                    ${t.isReadOnly
                      ? 'bg-blue-900/10 border border-blue-500/20 hover:bg-blue-900/20'
                      : 'bg-[#0f0f0f] border border-white/5 hover:border-purple-500/30'
                    }`}
                >

                  {/* EDITABLE TIME */}
                  <div className="w-32">
                    {t.isReadOnly ? (
                      <div className="font-mono text-lg font-bold text-blue-400 py-2 px-1">
                        {t.time}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={t.time || ""}
                        onChange={(e) => updateTask(t.id, 'time', e.target.value)}
                        placeholder="HH:MM AM"
                        className="bg-black/40 w-full font-mono text-lg font-bold text-purple-400 rounded-xl px-3 py-2 border border-white/5 focus:border-purple-500 focus:bg-black/80 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                      />
                    )}
                  </div>

                  {/* EDITABLE TASK NAME */}
                  <div className="flex-1 pr-12 sm:pr-0">
                    {t.isReadOnly ? (
                      <div className="text-white text-xl font-medium px-1 py-1">{t.task}</div>
                    ) : (
                      <input
                        type="text"
                        value={t.task || ""}
                        onChange={(e) => updateTask(t.id, 'task', e.target.value)}
                        placeholder="What needs to be done?"
                        className="bg-transparent w-full text-white text-xl font-medium border-none border-b border-transparent focus:border-purple-500 px-1 py-1 focus:bg-white/5 rounded-lg focus:ring-0 outline-none transition-all placeholder-slate-700"
                      />
                    )}

                    <div className="mt-2 flex gap-2">
                      {t.isReadOnly && <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md flex items-center gap-1 w-fit"><Calendar size={10} /> Google</span>}
                      {t.type && !t.isReadOnly && <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 text-slate-500 px-2 py-1 rounded-md w-fit">{t.type}</span>}
                    </div>
                  </div>

                  {!t.isReadOnly && (
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="absolute top-6 right-6 sm:static sm:opacity-0 group-hover:opacity-100 p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
