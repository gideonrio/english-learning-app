'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Settings, Headphones, CheckCircle2, Volume2 } from 'lucide-react';
import { useLearning } from '@/context/LearningContext';

interface AudioPlayerProps {
  id: string; // Unique ID for each audio
  src: string;
  title?: string;
  onEnded?: () => void;
}

export default function AudioPlayer({ id, src, title, onEnded }: AudioPlayerProps) {
  const { 
    playbackSpeed, 
    setPlaybackSpeed, 
    playingAudioId, 
    playAudio, 
    pauseAudio,
    currentTime,
    duration,
    isAudioPlaying,
    audioError,
    seekAudio,
    completedAudioIds,
    audioProgressMap
  } = useLearning();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isCurrent = playingAudioId === id;
  const isCompleted = completedAudioIds.has(id);
  const hasError = isCurrent && !!audioError;

  // Auto-scroll when starts playing
  useEffect(() => {
    if (isCurrent && isAudioPlaying && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrent, isAudioPlaying]);

  const togglePlay = () => {
    if (isCurrent && isAudioPlaying) {
      pauseAudio();
    } else {
      playAudio(id, src, title, onEnded);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isCurrent && !hasError) {
      seekAudio((val / 100) * duration);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If not current, try to show the saved progress time
  const displayTime = isCurrent ? currentTime : (audioProgressMap[id] || 0);
  const displayDuration = isCurrent ? duration : 0; // Duration is only known when loaded
  const progress = displayDuration > 0 ? (displayTime / displayDuration) * 100 : 0;

  return (
    <div 
      ref={containerRef} 
      className={`
        bg-white dark:bg-slate-900 border transition-all duration-300 rounded-2xl p-5 group
        ${hasError ? 'border-red-300 dark:border-red-900/50 bg-red-50/10' : 
          (isCurrent && isAudioPlaying) ? 'border-blue-500 shadow-xl ring-2 ring-blue-500/10 dark:ring-blue-500/5 shadow-blue-500/10' : 
          isCurrent ? 'border-blue-400 dark:border-blue-700 shadow-lg' :
          'border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-200 dark:hover:border-blue-800'}
        ${isCompleted ? 'bg-green-50/20 dark:bg-emerald-950/10 border-emerald-500/20' : ''}
      `}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            disabled={hasError}
            className={`
              w-14 h-14 flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-lg
              ${hasError ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 
                (isCurrent && isAudioPlaying) ? 'bg-blue-600 text-white shadow-blue-500/40' : 
                'bg-slate-100 dark:bg-slate-800 text-blue-600 hover:bg-blue-600 hover:text-white'}
            `}
          >
            {(isCurrent && isAudioPlaying) ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
          
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center gap-2 mb-1">
              {isCurrent && isAudioPlaying ? (
                <div className="flex items-center gap-0.5 h-3">
                    <div className="w-1 bg-blue-500 animate-[sound-bar_0.8s_ease-in-out_infinite] rounded-full" />
                    <div className="w-1 bg-blue-500 animate-[sound-bar_1.2s_ease-in-out_infinite] rounded-full" />
                    <div className="w-1 bg-blue-500 animate-[sound-bar_0.9s_ease-in-out_infinite] rounded-full" />
                </div>
              ) : isCompleted ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <Headphones size={14} className={hasError ? 'text-red-500' : isCurrent ? 'text-blue-500' : 'text-slate-400'} />
              )}
              <h4 className={`text-sm font-bold truncate max-w-[180px] ${hasError ? 'text-red-500' : isCurrent ? 'text-blue-600' : 'text-slate-700 dark:text-slate-200'}`}>
                {title || 'Voice Explanation'}
              </h4>
            </div>
            {hasError ? (
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">File missing or invalid</p>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatTime(displayTime)}
                </span>
                {displayDuration > 0 && (
                  <>
                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatTime(displayDuration)}
                    </span>
                  </>
                )}
                {isCurrent && isAudioPlaying && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded-full shadow-sm">NOW PLAYING</span>
                )}
                {isCompleted && !isAudioPlaying && (
                    <span className="ml-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase rounded-full">Finished</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 w-full">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            disabled={!isCurrent || hasError}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-600 ${(!isCurrent || hasError) ? 'bg-slate-50 dark:bg-slate-900 opacity-50' : 'bg-slate-100 dark:bg-slate-800'}`}
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-1.5 border border-slate-100 dark:border-slate-700 shadow-inner">
          <Settings size={14} className="text-slate-400 mx-1" />
          {[1, 1.5, 2].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`
                px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all
                ${playbackSpeed === speed 
                  ? 'bg-blue-600 text-white shadow-md scale-105' 
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}
              `}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
