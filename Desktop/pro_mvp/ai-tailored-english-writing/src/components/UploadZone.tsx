
import React, { useRef, useState } from 'react';
import { UploadIcon, CameraIcon, KeyboardIcon, DocumentTextIcon } from './Icons';

interface Props {
  onUploadFiles: (files: FileList) => void;
  onSubmitText: (data: { name: string; topic: string; text: string }) => void;
  onUploadMarkdown?: (files: FileList) => void;
  disabled: boolean;
}

const UploadZone: React.FC<Props> = ({ onUploadFiles, onSubmitText, onUploadMarkdown, disabled }) => {
  const [mode, setMode] = useState<'image' | 'text'>('image');
  
  // Text Input State
  const [textData, setTextData] = useState({ name: '', topic: '', text: '' });

  // File Input Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const markdownInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
    }
  };

  const handleMarkdownFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUploadMarkdown && e.target.files && e.target.files.length > 0) {
      onUploadMarkdown(e.target.files);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textData.text.trim()) return;
    onSubmitText(textData);
    setTextData({ name: '', topic: '', text: '' }); // Reset
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      
      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button 
          onClick={() => setMode('image')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'image' ? 'bg-white text-brand-600 border-t-2 border-t-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CameraIcon /> Image Upload
        </button>
        <button 
           onClick={() => setMode('text')}
           className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'text' ? 'bg-white text-brand-600 border-t-2 border-t-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <KeyboardIcon /> Digital Input
        </button>
      </div>

      {/* Content: Image Mode */}
      {mode === 'image' && (
        <div className="p-8 text-center">
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-brand-300 transition-colors bg-slate-50/30">
                <div className="flex justify-center gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-full text-brand-500">
                    <UploadIcon />
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Upload Student Essays</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                    Batch upload images of handwritten or printed essays.
                </p>
                
                <div className="flex justify-center gap-4">
                    <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg shadow hover:bg-slate-800 disabled:opacity-50 transition-all"
                    >
                    Select Files
                    </button>
                    
                    <button 
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={disabled}
                    className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 text-sm font-medium rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                    <CameraIcon />
                    Take Photo
                    </button>
                    <button
                      onClick={() => markdownInputRef.current?.click()}
                      disabled={disabled}
                      className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 text-sm font-medium rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      <DocumentTextIcon />
                      导入 MD
                    </button>
                </div>
            </div>

            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFiles}
            />
            <input 
                type="file" 
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFiles}
            />
            <input
              type="file"
              ref={markdownInputRef}
              className="hidden"
              multiple
              accept=".md,text/markdown"
              onChange={handleMarkdownFiles}
            />
        </div>
      )}

      {/* Content: Text Mode */}
      {mode === 'text' && (
        <div className="p-6">
            <form onSubmit={handleTextSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Student Name (Optional)</label>
                        <input 
                           type="text"
                           className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                           placeholder="e.g., John Doe"
                           value={textData.name}
                           onChange={e => setTextData({...textData, name: e.target.value})}
                           disabled={disabled}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Topic (Optional)</label>
                        <input 
                           type="text"
                           className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                           placeholder="e.g., My Summer Vacation"
                           value={textData.topic}
                           onChange={e => setTextData({...textData, topic: e.target.value})}
                           disabled={disabled}
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Essay Content</label>
                    <textarea 
                        className="w-full h-48 p-3 border border-slate-200 rounded-lg text-sm font-serif leading-relaxed focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                        placeholder="Paste or type the essay here..."
                        value={textData.text}
                        onChange={e => setTextData({...textData, text: e.target.value})}
                        disabled={disabled}
                    ></textarea>
                </div>

                <div className="flex justify-end">
                     <button 
                        type="submit"
                        disabled={!textData.text.trim() || disabled}
                        className="px-6 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        Add to Queue
                     </button>
                </div>
            </form>
        </div>
      )}

    </div>
  );
};

export default UploadZone;
