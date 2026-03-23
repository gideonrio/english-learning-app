
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'English' | 'Tamil';

interface LearningContextType {
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  completedDays: Set<number>;
  toggleDayCompletion: (day: number) => void;
  bookmarkedDays: Set<number>;
  toggleBookmark: (day: number) => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  playingAudioId: string | null;
  setPlayingAudioId: (id: string | null) => void;
  
  // Global Audio Engine
  playAudio: (id: string, src: string, title?: string, onEnded?: () => void) => void;
  pauseAudio: () => void;
  currentTime: number;
  duration: number;
  isAudioPlaying: boolean;
  currentTitle: string;
  audioError: string | null;
  seekAudio: (time: number) => void;

  // New Features
  audioProgressMap: Record<string, number>;
  completedAudioIds: Set<string>;
  autoPlayEnabled: boolean;
  setAutoPlayEnabled: (enabled: boolean) => void;
  resetAllData: () => void;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1.5);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [bookmarkedDays, setBookmarkedDays] = useState<Set<number>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState<Language>('English');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  // New State
  const [audioProgressMap, setAudioProgressMap] = useState<Record<string, number>>({});
  const [completedAudioIds, setCompletedAudioIds] = useState<Set<string>>(new Set());
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);

  // Global Audio State
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTitle, setCurrentTitle] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const onEndedRef = React.useRef<(() => void) | null>(null);

  // Persistence Load
  useEffect(() => {
    try {
      const savedCompleted = localStorage.getItem('completedDays');
      const savedBookmarked = localStorage.getItem('bookmarkedDays');
      const savedSpeed = localStorage.getItem('playbackSpeed');
      const savedDark = localStorage.getItem('isDarkMode');
      const savedLang = localStorage.getItem('language');
      const savedDay = localStorage.getItem('selectedDay');
      const savedAutoPlay = localStorage.getItem('autoPlayEnabled');
      const savedProgress = localStorage.getItem('audioProgressMap');
      const savedCompletedAudios = localStorage.getItem('completedAudioIds');
      const savedLastId = localStorage.getItem('lastAudioId');

      if (savedCompleted) setCompletedDays(new Set(JSON.parse(savedCompleted)));
      if (savedBookmarked) setBookmarkedDays(new Set(JSON.parse(savedBookmarked)));
      if (savedSpeed) setPlaybackSpeed(parseFloat(savedSpeed));
      if (savedDark !== null) setIsDarkMode(JSON.parse(savedDark));
      if (savedLang) setLanguage(savedLang as Language);
      if (savedDay) setSelectedDay(parseInt(savedDay));
      if (savedAutoPlay !== null) setAutoPlayEnabled(JSON.parse(savedAutoPlay));
      if (savedProgress) setAudioProgressMap(JSON.parse(savedProgress));
      if (savedCompletedAudios) setCompletedAudioIds(new Set(JSON.parse(savedCompletedAudios)));
      
      // Handle resuming last session
      if (savedLastId) {
        setPlayingAudioId(savedLastId);
      }
    } catch (e) {
      console.error("Failed to load learning state", e);
    }
  }, []);

  // Sync Audio Progress during playback
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const updateHandler = () => {
      const time = a.currentTime;
      const dur = a.duration;
      setCurrentTime(time);
      
      if (playingAudioId) {
        setAudioProgressMap(prev => {
           // Batch updates to avoid too many re-renders
           if (Math.abs(prev[playingAudioId] - time) < 1) return prev;
           return { ...prev, [playingAudioId]: time };
        });
        
        // Mark as completed if > 90%
        if (dur > 0 && (time / dur) > 0.9) {
          setCompletedAudioIds(prev => {
            if (prev.has(playingAudioId)) return prev;
            const next = new Set(prev);
            next.add(playingAudioId);
            return next;
          });
        }
      }
    };

    a.addEventListener('timeupdate', updateHandler);
    return () => a.removeEventListener('timeupdate', updateHandler);
  }, [playingAudioId]);

  // Main Audio Initializer and Persistent Event Listener
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      const a = audioRef.current;
      
      a.addEventListener('loadedmetadata', () => setDuration(a.duration));
      a.addEventListener('play', () => {
        setIsAudioPlaying(true);
        setAudioError(null);
      });
      a.addEventListener('pause', () => setIsAudioPlaying(false));
      a.addEventListener('error', (e) => {
        console.warn("Audio file missing or invalid. Check your imports.");
        setAudioError("File missing or invalid");
        setIsAudioPlaying(false);
      });

      // The key fix for reliable autoplay: 
      a.addEventListener('ended', () => {
        setIsAudioPlaying(false);
        
        // Reset progress to 0 so the user can replay the entire track cleanly over and over
        const lastId = localStorage.getItem('lastAudioId');
        if (lastId) {
          setAudioProgressMap(prev => ({ ...prev, [lastId]: 0 }));
        }

        // We check autoPlayEnabled from localStorage directly or a ref to ensure it's fresh
        const isAutoPlay = JSON.parse(localStorage.getItem('autoPlayEnabled') || 'true');
        if (isAutoPlay && onEndedRef.current) {
          console.log("Audio ended - triggering next track via onEndedRef");
          onEndedRef.current();
        } else {
          setPlayingAudioId(null);
        }
      });
    }
  }, []); // Only once

  // Sync speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const playAudio = (id: string, src: string, title: string = '', onEnded?: () => void) => {
    if (!audioRef.current) return;
    const a = audioRef.current;

    // Update the ref so the global listener can see the NEW next-track instruction
    onEndedRef.current = onEnded || null;

    if (playingAudioId === id && a.src) {
      a.play().catch(e => console.warn("Audio play prevented:", e));
    } else {
      a.pause();
      a.src = src;
      a.load();
      a.playbackRate = playbackSpeed;
      
      // Resume from saved progress
      const savedTime = audioProgressMap[id] || 0;
      a.currentTime = savedTime;
      
      setCurrentTitle(title);
      setPlayingAudioId(id);
      localStorage.setItem('lastAudioId', id);
      
      a.play().catch(err => {
        console.warn("Playback failed. This usually needs a valid source or a user interaction first.", err);
      });
    }
  };

  const seekAudio = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const pauseAudio = () => {
    audioRef.current?.pause();
  };

  const resetAllData = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('completedDays', JSON.stringify(Array.from(completedDays)));
  }, [completedDays]);

  useEffect(() => {
    localStorage.setItem('bookmarkedDays', JSON.stringify(Array.from(bookmarkedDays)));
  }, [bookmarkedDays]);

  useEffect(() => {
    localStorage.setItem('playbackSpeed', playbackSpeed.toString());
  }, [playbackSpeed]);

  useEffect(() => {
    localStorage.setItem('selectedDay', selectedDay.toString());
  }, [selectedDay]);

  useEffect(() => {
    localStorage.setItem('autoPlayEnabled', JSON.stringify(autoPlayEnabled));
  }, [autoPlayEnabled]);

  useEffect(() => {
    localStorage.setItem('audioProgressMap', JSON.stringify(audioProgressMap));
  }, [audioProgressMap]);

  useEffect(() => {
    localStorage.setItem('completedAudioIds', JSON.stringify(Array.from(completedAudioIds)));
  }, [completedAudioIds]);

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleDayCompletion = (day: number) => {
    setCompletedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleBookmark = (day: number) => {
    setBookmarkedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  return (
    <LearningContext.Provider value={{
      playbackSpeed,
      setPlaybackSpeed,
      completedDays,
      toggleDayCompletion,
      bookmarkedDays,
      toggleBookmark,
      isDarkMode,
      setIsDarkMode,
      language,
      setLanguage,
      playingAudioId,
      setPlayingAudioId,
      playAudio,
      pauseAudio,
      currentTime,
      duration,
      isAudioPlaying,
      currentTitle,
      audioError,
      seekAudio,
      audioProgressMap,
      completedAudioIds,
      autoPlayEnabled,
      setAutoPlayEnabled,
      resetAllData,
      selectedDay,
      setSelectedDay
    }}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (context === undefined) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
}
