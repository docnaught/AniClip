import { Plus, Copy, Trash2, Ghost, Wand2 } from 'lucide-react';
import { useAnimStore } from '../store/animStore';
import { cn } from '../lib/utils';
import { useEffect, useRef, useState } from 'react';
import { InterpolateModal } from './InterpolateModal';

export function Timeline() {
  const { 
    frames, currentFrameIndex, setCurrentFrame, 
    addFrame, deleteFrame, duplicateFrame,
    onionSkinEnabled, toggleOnionSkin,
    isPlaying, fps
  } = useAnimStore();

  const [isInterpolateModalOpen, setInterpolateModalOpen] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected frame
  useEffect(() => {
    if (timelineRef.current) {
      const selectedEl = timelineRef.current.children[currentFrameIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentFrameIndex]);

  // Playback logic
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      useAnimStore.getState().setCurrentFrame((useAnimStore.getState().currentFrameIndex + 1) % useAnimStore.getState().frames.length);
    }, 1000 / fps);
    
    return () => clearInterval(interval);
  }, [isPlaying, fps]);


  return (
    <div className="h-[180px] bg-[#1e1e1e] border-t border-[#333333] flex flex-col shrink-0 w-full overflow-hidden">
      <div className="h-10 flex items-center justify-between px-4 border-b border-[#333333]">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-[11px] text-[#909090] uppercase tracking-widest">Timeline</span>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleOnionSkin}
              className={cn(
                "tutorial-step-onion flex items-center space-x-1.5 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors",
                onionSkinEnabled ? "bg-[#3a86ff] text-white" : "bg-[#2a2a2a] text-[#909090] hover:text-[#e0e0e0]"
              )}
            >
              <Ghost size={12} strokeWidth={2.5} />
              <span>Onion Skin : {onionSkinEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button 
              onClick={() => setInterpolateModalOpen(true)}
              className="flex items-center space-x-1.5 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors bg-[#2a2a2a] text-[#909090] hover:text-[#3a86ff]"
              title="Interpolate Motion"
            >
              <Wand2 size={12} strokeWidth={2.5} />
              <span>Interpolate</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-xs font-bold text-[#e0e0e0]">
          <span className="text-[#3a86ff]">Frame {currentFrameIndex + 1} / {frames.length}</span>
          <span className="text-[#909090]">{fps} FPS</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[120px] font-bold text-[11px] text-[#909090] p-2 border-r border-[#333333] bg-[#1e1e1e] flex flex-col uppercase tracking-widest shrink-0">
          Animation
        </div>
        
        <div className="flex-1 flex items-center px-4 overflow-x-auto relative bg-[#121212] custom-scrollbar">
          {/* Mock Playhead */}
          <div 
            className="absolute top-0 w-[2px] h-full bg-[#ff4757] z-10 pointer-events-none transition-all duration-75"
            style={{ left: `${(currentFrameIndex * (96 + 8)) + 16 + 48}px` }} // 96px width + 8px gap + 16px paddingLeft + 48px offset to center on box
          >
            <div className="absolute top-0 -left-1 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-[#ff4757]"></div>
          </div>
          
          <div className="flex items-center space-x-2 min-w-max py-2" ref={timelineRef}>
            {frames.map((frame, index) => (
              <div 
                key={frame.id}
                className={cn(
                  "relative group flex-shrink-0 w-24 h-[100px] border cursor-pointer transition-all bg-[#1e1e1e] flex flex-col items-center justify-center overflow-hidden rounded",
                  currentFrameIndex === index 
                    ? "border-[#3a86ff] shadow-[0_0_0_1px_#3a86ff] bg-[rgba(58,134,255,0.1)]" 
                    : "border-[#333333] hover:border-[#909090]"
                )}
                onClick={() => setCurrentFrame(index)}
              >
                <div className="absolute top-0 left-0 w-full h-3 border-b flex items-center justify-center bg-[#2a2a2a] border-[#333333]">
                    <span className="text-[9px] font-bold text-[#909090]">{index + 1}</span>
                </div>
                
                {/* Frame thumbnail placeholder */}
                <div className="w-16 h-12 bg-white/5 rounded mt-3 border border-[#333333]"></div>
                
                <div className={cn(
                  "absolute -bottom-1 -right-1 flex space-x-1 p-1 bg-[#2a2a2a] rounded-tl-lg border border-[#333333] transition-opacity",
                  currentFrameIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); duplicateFrame(index); }}
                    className="p-1 hover:bg-[#333333] rounded text-[#909090] hover:text-[#e0e0e0]"
                    title="Duplicate"
                  >
                    <Copy size={12} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteFrame(index); }}
                    className="p-1 hover:bg-[#ff4757]/20 hover:text-[#ff4757] rounded text-[#909090]"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => addFrame()}
              className="tutorial-step-add-frame flex-shrink-0 w-24 h-[100px] rounded border border-dashed border-[#333333] hover:border-[#909090] hover:bg-[#2a2a2a] flex flex-col items-center justify-center text-[#909090] hover:text-white transition-colors ml-2"
            >
              <Plus size={24} />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Add</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Audio Track mock */}
      <div className="h-10 bg-[rgba(0,0,0,0.2)] border-t border-[#333333] flex items-center w-full">
        <div className="w-[120px] font-bold text-[11px] text-[#909090] p-2 border-r border-[#333333] h-full flex items-center uppercase tracking-widest shrink-0">
          Audio
        </div>
        <div className="flex-1 h-5 mx-2 opacity-50" style={{ background: 'repeating-linear-gradient(90deg, #555 0px, #555 1px, transparent 1px, transparent 4px)' }}></div>
      </div>

      {isInterpolateModalOpen && (
        <InterpolateModal onClose={() => setInterpolateModalOpen(false)} />
      )}
    </div>
  );
}
