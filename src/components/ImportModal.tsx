'use client';

import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Music, Image as ImageIcon, Video, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseWhatsAppChat, groupMessagesByDay, DayContent } from '@/utils/whatsapp-parser';
import { saveMediaToDB, saveMediaBulk } from '@/utils/media-store';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: DayContent[]) => void;
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps: getChatProps, getInputProps: getChatInput } = useDropzone({
    accept: { 'text/plain': ['.txt'] },
    maxFiles: 1,
    onDrop: (files) => setChatFile(files[0])
  });

  const { getRootProps: getMediaProps, getInputProps: getMediaInput } = useDropzone({
    accept: { 
      'audio/*': ['.mp3', '.m4a', '.opus', '.wav', '.ogg'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'application/vnd.android.package-archive': ['.apk']
    },
    onDrop: (files) => setMediaFiles(prev => [...prev, ...files])
  });

  const [successInfo, setSuccessInfo] = useState<{ linked: number, missing: number } | null>(null);

  const handleImport = async () => {
    if (!chatFile) return setError("Please select a WhatsApp .txt export file.");
    
    setIsProcessing(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const text = await chatFile.text();
      const messages = parseWhatsAppChat(text);
      
      const matchedFiles: { name: string, blob: Blob }[] = [];
      let linkedCount = 0;
      let missingCount = 0;

      const updatedMessages = await Promise.all(messages.map(async msg => {
        if (!msg.fileName) return msg;
        
        // Match files case-insensitively and handle spaces properly
        const file = mediaFiles.find(f => f.name.toLowerCase().trim() === msg.fileName?.toLowerCase().trim());
        if (file) {
          const blobUrl = URL.createObjectURL(file);
          matchedFiles.push({ name: file.name, blob: file });
          linkedCount++;
          return { ...msg, mediaUrl: blobUrl };
        }
        
        missingCount++;
        // Fallback to /media/ if not found in uploads
        return { ...msg, mediaUrl: `/media/${msg.fileName}` };
      }));

      // Bulk save to IndexedDB
      if (matchedFiles.length > 0) {
        try {
          await saveMediaBulk(matchedFiles);
        } catch (e) {
          console.error("Failed to bulk save media to IDB", e);
        }
      }

      const grouped = groupMessagesByDay(updatedMessages);
      
      if (linkedCount === 0 && mediaFiles.length > 0) {
        setError(`Warning: None of the ${mediaFiles.length} uploaded files matched the chat export. Check if filenames match.`);
      } else {
        onImport(grouped);
        setSuccessInfo({ linked: linkedCount, missing: missingCount });
        // Don't close immediately if we want to show info, but for UX simple, let's close or show alert
        alert(`Import Successful! ${linkedCount} media files linked. ${missingCount} files reference missing media.`);
        onClose();
      }
    } catch (err) {
      setError("Failed to parse the file. Please ensure it's a valid WhatsApp export.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload className="text-blue-600" />
            Import WhatsApp Content
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Chat File Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Step 1: Upload Chat Log (.txt)</label>
            <div {...getChatProps()} className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${chatFile ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-400'}`}>
              <input {...getChatInput()} />
              {chatFile ? (
                <div className="flex items-center gap-3 text-blue-600 font-bold">
                  <FileText size={40} />
                  <div>
                    <p className="text-sm">{chatFile.name}</p>
                    <p className="text-xs opacity-60">{(chatFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={32} className="text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Drag chat export or click to browse</p>
                  <p className="text-xs text-slate-400 mt-1">Accepts only .txt files from WhatsApp</p>
                </>
              )}
            </div>
          </div>

          {/* Media Files Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Step 2: Upload Media Files (Optional)</label>
            <div {...getMediaProps()} className="border-2 border-dashed rounded-2xl p-8 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-400 cursor-pointer transition-all flex flex-col items-center">
              <input {...getMediaInput()} />
              <div className="flex gap-4 mb-4">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Music size={24} /></div>
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Video size={24} /></div>
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><ImageIcon size={24} /></div>
              </div>
              <p className="text-sm font-medium text-slate-600">Upload audios, videos and images</p>
              <p className="text-xs text-slate-400 mt-1">{mediaFiles.length} files selected</p>
            </div>
            {mediaFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 max-h-32 overflow-y-auto p-1">
                {mediaFiles.slice(0, 5).map(f => (
                  <div key={f.name} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium truncate max-w-[200px]">
                    {f.name}
                  </div>
                ))}
                {mediaFiles.length > 5 && <span className="text-xs text-slate-400 px-2 py-1">+{mediaFiles.length - 5} more</span>}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
          <button 
            onClick={handleImport}
            disabled={!chatFile || isProcessing}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? 'Processing...' : (
              <>
                <CheckCircle2 size={18} />
                Process and Start Learning
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
