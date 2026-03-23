'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, CheckCircle, Search, Menu, X, Play, ArrowRight, Zap, ZapOff, RotateCcw, Sun, Moon, Upload, Trophy, ChevronRight, FileText
} from 'lucide-react';
import { useLearning } from '@/context/LearningContext';
import { MOCK_DAYS } from '@/lib/mockData';
import { translations } from '@/lib/translations';
import AudioPlayer from '@/components/AudioPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import ImportModal from '@/components/ImportModal';
import { DayContent } from '@/utils/whatsapp-parser';
import { getMediaFromDB } from '@/utils/media-store';

// Fail-safe wrapper for client features
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-black text-xs tracking-widest uppercase">Initializing Course Engine...</p>
      </div>
    </div>;
  }
  return <>{children}</>;
};

// Helper to reliably convert raw URLs in text to clickable links
const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function Home() {
  return (
    <ClientOnly>
      <HomeContent />
    </ClientOnly>
  );
}

function HomeContent() {
  const { 
    playbackSpeed, setPlaybackSpeed, completedDays, toggleDayCompletion,
    isDarkMode, setIsDarkMode, language, setLanguage, playingAudioId, setPlayingAudioId,
    playAudio, pauseAudio, autoPlayEnabled, setAutoPlayEnabled, resetAllData, selectedDay, setSelectedDay
  } = useLearning();

  const [courseData, setCourseData] = useState<DayContent[]>(MOCK_DAYS);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'audio' | 'video' | 'image' | 'document' | 'link'>('all');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const contentAreaRef = React.useRef<HTMLDivElement>(null);

  const t = translations[language as keyof typeof translations] || translations.English;

  // Persistence: Load on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('course_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCourseData(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load saved course data", e);
    }
    
    if (localStorage.getItem('is_logged_in') === 'true') {
      setIsLoggedIn(true);
      setPhoneNumber(localStorage.getItem('phone_number') || '');
      
      const lastId = localStorage.getItem('lastAudioId');
      if (lastId) {
        setShowResumeToast(true);
        setTimeout(() => setShowResumeToast(false), 8000);
      }
    }
  }, []);

  // Restore Media URLs from IndexedDB
  useEffect(() => {
    const restoreMedia = async () => {
      setIsSyncing(true);
      let changed = false;
      const updatedData = await Promise.all(courseData.map(async (day) => {
        const updatedItems = await Promise.all(day.items.map(async (item) => {
          if (item.fileName && (!item.mediaUrl || item.mediaUrl.startsWith('blob:') || item.mediaUrl.startsWith('/media/'))) {
            try {
              const restoredUrl = await getMediaFromDB(item.fileName);
              if (restoredUrl && restoredUrl !== item.mediaUrl) {
                changed = true;
                return { ...item, mediaUrl: restoredUrl };
              }
            } catch (err) {
              console.error(`Failed to restore ${item.fileName}`, err);
            }
          }
          return item;
        }));
        return { ...day, items: updatedItems };
      }));

      if (changed) {
        setCourseData(updatedData);
      }
      setTimeout(() => setIsSyncing(false), 1000);
    };

    if (courseData.length > 0 && isLoggedIn) {
      restoreMedia();
    }
  }, [isLoggedIn, courseData.length]);

  // Persistence: Save course data
  useEffect(() => {
    if (courseData !== MOCK_DAYS && courseData.length > 0) {
      setIsSyncing(true);
      const dataToSave = courseData.map(day => ({
        ...day,
        items: day.items.map(item => {
          if (item.mediaUrl?.startsWith('blob:')) {
            const { mediaUrl, ...rest } = item;
            return rest;
          }
          return item;
        })
      }));
      localStorage.setItem('course_data', JSON.stringify(dataToSave));
      setTimeout(() => setIsSyncing(false), 800);
    }
  }, [courseData]);

  // Persistence: Save login state
  useEffect(() => {
    localStorage.setItem('is_logged_in', isLoggedIn.toString());
    if (isLoggedIn) {
      localStorage.setItem('phone_number', phoneNumber);
    }
  }, [isLoggedIn, phoneNumber]);

  const currentDayData = useMemo(() => {
    return courseData.find(d => d.day === selectedDay);
  }, [courseData, selectedDay]);

  // Restore Scroll Position
  useEffect(() => {
    const savedScroll = localStorage.getItem('scrollPosition');
    if (savedScroll && contentAreaRef.current) {
      setTimeout(() => {
        if (contentAreaRef.current) {
          contentAreaRef.current.scrollTop = parseInt(savedScroll);
        }
      }, 800);
    }
  }, [selectedDay]);

  // Save Scroll Position
  useEffect(() => {
    const div = contentAreaRef.current;
    if (!div) return;
    const handleScroll = () => {
      localStorage.setItem('scrollPosition', div.scrollTop.toString());
    };
    div.addEventListener('scroll', handleScroll);
    return () => div.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on day change
  useEffect(() => {
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedDay]);

  const filteredItems = useMemo(() => {
    if (!currentDayData) return [];
    return currentDayData.items.filter(item => {
      const matchesSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [currentDayData, searchQuery, filterType]);

  const progress = (completedDays.size / courseData.length) * 100;

  const handleImport = (newDays: DayContent[]) => {
    setCourseData(newDays);
    setSelectedDay(1);
  };

  const playNext = (currentIndex: number) => {
    if (!autoPlayEnabled) return;
    const nextItemIndex = filteredItems.findIndex((item, idx) => idx > currentIndex && item.type === 'audio');
    
    if (nextItemIndex !== -1) {
      const item = filteredItems[nextItemIndex];
      playAudio(
        item.id, 
        item.mediaUrl || `/media/${item.fileName}`, 
        item.fileName || 'Voice Explanation',
        () => playNext(nextItemIndex)
      );
    } else {
      const nextDayNum = selectedDay + 1;
      const nextDayData = courseData.find(d => d.day === nextDayNum);
      if (nextDayData) {
        const firstAudioIndex = nextDayData.items.findIndex(item => item.type === 'audio');
        if (firstAudioIndex !== -1) {
          const item = nextDayData.items[firstAudioIndex];
          setSelectedDay(nextDayNum);
          playAudio(
            item.id, 
            item.mediaUrl || `/media/${item.fileName}`, 
            item.fileName || 'Voice Explanation',
            () => {
               // Logic for next track after day switch is handled by the overall engine
            }
          );
        }
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length >= 10) {
      setIsLoggedIn(true);
    } else {
      alert("Please enter a valid phone number or email.");
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure? This will logout and clear your imported course data.")) {
      localStorage.removeItem('course_data');
      localStorage.removeItem('is_logged_in');
      localStorage.removeItem('phone_number');
      setIsLoggedIn(false);
      setCourseData(MOCK_DAYS);
      window.location.reload();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors font-sans overflow-hidden relative">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-500/10 blur-[120px] rounded-full animate-pulse delay-1000" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white dark:border-slate-800 z-10"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-500/40">
              <BookOpen size={40} />
            </div>
            <h1 className="text-3xl font-black text-center tracking-tight text-slate-900 dark:text-white">
              English Learning <br/><span className="text-blue-600">Premium</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 text-center font-medium">
              Start your professional journey today.
            </p>
          </div>

          <div className="space-y-4">
            <button className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700 dark:text-slate-200">
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Continue with Google
            </button>
            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">or email</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="text"
                placeholder={t.loginLabel}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 outline-none"
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 mt-4"
              >
                {t.loginButton} <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden flex text-slate-900 dark:text-slate-100 dark:bg-slate-950 transition-colors`}>
      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto custom-scrollbar
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <BookOpen size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight">Dec 18 EP</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.progress}</span>
              <span className="text-xs font-bold text-blue-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-blue-600 rounded-full" />
            </div>
          </div>

          <div className="space-y-1">
            {Array.from({ length: 50 }).map((_, i) => {
              const dayNum = i + 1;
              const hasData = courseData.some(d => d.day === dayNum);
              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    pauseAudio();
                    setSelectedDay(dayNum);
                    if (contentAreaRef.current) contentAreaRef.current.scrollTop = 0;
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedDay === dayNum ? 'bg-blue-600 text-white shadow-xl' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600'}`}
                >
                  <span className="text-sm font-bold">Day {dayNum}</span>
                  {completedDays.has(dayNum) && <CheckCircle size={16} className={selectedDay === dayNum ? 'text-white' : 'text-green-500'} />}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen">
        {isSyncing && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-[100]" />}
        
        <AnimatePresence>
          {showResumeToast && (
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
              <Play size={20} fill="currentColor" />
              <div className="flex-1 text-sm font-bold">Resume last session?</div>
              <button 
                onClick={() => {
                  const lastId = localStorage.getItem('lastAudioId');
                  if (lastId) setPlayingAudioId(lastId);
                  setShowResumeToast(false);
                }}
                className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-black"
              >
                RESUME
              </button>
              <button onClick={() => setShowResumeToast(false)}><X size={18} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-xl">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-black">Day {selectedDay}</h2>
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsImportModalOpen(true)} 
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm border border-blue-100 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-900 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Upload size={16} /> <span className="hidden sm:inline">Import WhatsApp Data</span>
            </button>
            <button onClick={() => setAutoPlayEnabled(!autoPlayEnabled)} className={`p-2 rounded-xl ${autoPlayEnabled ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
              {autoPlayEnabled ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="p-2 text-red-500"><X size={20} /></button>
          </div>
        </header>

        <div key={selectedDay} ref={contentAreaRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar w-full max-w-[1600px] mx-auto">
          {filteredItems.length > 0 ? (
            <>
              {filteredItems.map((item, index) => {
                const mediaSource = item.mediaUrl || (item.fileName ? `/media/${item.fileName}` : '');
                return (
                  <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                    {item.type === 'text' && (
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm whitespace-pre-wrap text-base leading-relaxed w-full font-medium">
                        {renderTextWithLinks(item.content)}
                      </div>
                    )}
                    {item.type === 'audio' && (
                      <AudioPlayer 
                        id={item.id} 
                        src={mediaSource} 
                        title={item.fileName || 'Voice Explanation'} 
                        onEnded={() => playNext(index)}
                      />
                    )}
                    {item.type === 'image' && (
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full sm:max-w-xl">
                        <img 
                          src={mediaSource} 
                          alt={item.fileName || "lesson-image"}
                          className="rounded-xl w-full h-auto cursor-zoom-in object-cover"
                          onClick={() => setZoomImage(mediaSource)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80&text=${item.fileName || 'Image'}`;
                          }}
                        />
                        <p className="mt-3 text-sm text-slate-500 font-bold px-3 pb-1 truncate">{item.fileName || 'Image'}</p>
                      </div>
                    )}
                    {item.type === 'document' && (
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-emerald-500 transition-all w-full sm:max-w-2xl">
                        <div className="flex items-center gap-4 truncate">
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex min-w-[48px] items-center justify-center">
                            <FileText size={24} />
                          </div>
                          <div className="truncate">
                            <h4 className="text-sm font-bold truncate">{item.fileName || 'Document'}</h4>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">PDF / Document</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-4">
                          <a 
                            href={mediaSource} 
                            download={item.fileName}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    )}
                    {item.type === 'video' && mediaSource && (
                      <div className="bg-black rounded-3xl overflow-hidden aspect-video shadow-2xl relative w-full sm:max-w-3xl">
                        <video 
                          src={mediaSource}
                          controls
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Suppress strict DOM error overlay dynamically
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    {item.type === 'link' && (
                      <a 
                        href={item.content} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-500 hover:shadow-cyan-500/10 transition-all group w-full sm:max-w-xl"
                      >
                        <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 mb-2 tracking-wider uppercase">External Link</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.content}</p>
                      </a>
                    )}
                  </motion.div>
                );
              })}
              
              <div className="flex justify-between pt-10 pb-20">
                <button onClick={() => { pauseAudio(); setSelectedDay(Math.max(1, selectedDay - 1)); }} className="px-6 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold bg-white dark:bg-slate-900 shadow-sm hover:scale-[0.98] transition-transform">{t.previousDay}</button>
                <button onClick={() => { pauseAudio(); setSelectedDay(Math.min(50, selectedDay + 1)); }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20">{t.nextDay}</button>
              </div>
            </>
          ) : (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all animate-in zoom-in-95 duration-500 mx-auto max-w-lg mt-10">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <BookOpen size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Day {selectedDay} Course Materials</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto text-sm">No content is available for this specific day yet.</p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-500/20 flex items-center gap-2"
                >
                  <Upload size={18} />
                  Import WhatsApp Export
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImport} />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 100, 100, 0.2); border-radius: 10px; }
      `}</style>

      {/* Lightbox Overlay */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Zoomed" />
        </div>
      )}
    </div>
  );
}
