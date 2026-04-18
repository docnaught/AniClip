import { Download, Settings, Play, Pause, Loader, ChevronDown, FolderOpen, Save, Layers3, MonitorDown } from 'lucide-react';
import { useAnimStore } from '../store/animStore';
import React, { useState, useRef, useEffect } from 'react';
import { PresetsModal } from './PresetsModal';
import { ExportModal } from './ExportModal';

export function Topbar() {
  const { 
    isPlaying, togglePlayback, setTutorialStep, setGalleryModalOpen
  } = useAnimStore();

  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  
  // PWA Installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("App is already installed or installation is not supported on this browser.");
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProject = () => {
    const state = useAnimStore.getState();
    const data = {
      frames: state.frames,
      layers: state.layers,
      fps: state.fps,
      width: state.width,
      height: state.height
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.anima';
    a.click();
    URL.revokeObjectURL(url);
    setIsFileMenuOpen(false);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      try {
        const data = JSON.parse(re.target?.result as string);
        useAnimStore.setState({ 
          frames: data.frames, 
          layers: data.layers, 
          fps: data.fps || 12, 
          width: data.width || 800, 
          height: data.height || 600, 
          currentFrameIndex: 0 
        });
      } catch (err) {
        alert("Failed to load project file.");
      }
    };
    reader.readAsText(file);
    setIsFileMenuOpen(false);
  };

  return (
    <>
      <header className="h-[48px] bg-[#1e1e1e] border-b border-[#333333] flex items-center justify-between px-4 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center space-x-2 font-bold tracking-tight">
          <span className="text-[#e0e0e0] text-[16px]">Anima<span className="text-[#3a86ff]">Studio</span> Pro</span>
        </div>

        <div className="flex items-center space-x-5 text-[13px] text-[#909090] hidden md:flex font-medium">
          <div className="relative">
            <span 
              className="hover:text-[#e0e0e0] cursor-pointer flex items-center"
              onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
            >
              File <ChevronDown size={12} className="ml-1" />
            </span>
            {isFileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFileMenuOpen(false)}></div>
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#1e1e1e] border border-[#333333] rounded-md shadow-xl py-1 z-50">
                  <button 
                    onClick={() => {
                      setIsFileMenuOpen(false);
                      setGalleryModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#3a86ff] hover:text-white flex items-center space-x-2 font-bold border-b border-[#333333] mb-1"
                  >
                    <Layers3 size={14} />
                    <span>Project Gallery...</span>
                  </button>
                  <button 
                    onClick={handleSaveProject}
                    className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#3a86ff] hover:text-white flex items-center space-x-2"
                  >
                    <Save size={14} />
                    <span>Export Project File</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-left px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#3a86ff] hover:text-white flex items-center space-x-2"
                  >
                    <FolderOpen size={14} />
                    <span>Import Project File...</span>
                  </button>
                  <input 
                    type="file" 
                    onChange={handleLoadProject} 
                    accept=".anima,application/json" 
                    className="hidden" 
                    ref={fileInputRef} 
                  />
                </div>
              </>
            )}
          </div>
          
          <span className="hover:text-[#e0e0e0] cursor-pointer">Edit</span>
          <span 
            className="hover:text-[#3a86ff] cursor-pointer text-[#e0e0e0] transition-colors tutorial-step-presets font-bold border-b border-[#3a86ff]"
            onClick={() => setIsPresetsModalOpen(true)}
            title="Open Automation Presets"
          >
            Presets
          </span>
          <span className="hover:text-[#e0e0e0] cursor-pointer">View</span>
          <span 
            className="hover:text-[#3a86ff] cursor-pointer text-[#e0e0e0] transition-colors tutorial-step-help"
            onClick={() => setTutorialStep(1)}
          >
            Tutorial
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {isInstallable && (
            <button 
              onClick={handleInstallClick}
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30 border border-[#22c55e]/30 font-semibold rounded text-xs transition-colors shadow-sm"
              title="Install AnimaStudio Pro to your device for offline use"
            >
              <MonitorDown size={14} />
              <span>Install Offline App</span>
            </button>
          )}
          <button 
            onClick={togglePlayback}
            className="flex items-center space-x-2 px-3 py-1.5 bg-[#2a2a2a] text-[#e0e0e0] hover:bg-[#333333] border-none font-semibold rounded text-xs transition-colors tutorial-step-play"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-[#3a86ff] text-white hover:bg-blue-500 border-none font-semibold rounded text-xs transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Export Render</span>
          </button>
        </div>
      </header>

      {isPresetsModalOpen && <PresetsModal onClose={() => setIsPresetsModalOpen(false)} />}
      {isExportModalOpen && <ExportModal onClose={() => setIsExportModalOpen(false)} />}
    </>
  );
}
