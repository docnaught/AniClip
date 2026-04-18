import { X } from 'lucide-react';
import { useState } from 'react';
import { useAnimStore } from '../store/animStore';

export function InterpolateModal({ onClose }: { onClose: () => void }) {
  const { frames, currentFrameIndex, interpolateFrames, isPlaying } = useAnimStore();
  const [numFrames, setNumFrames] = useState(5);
  const [endFrameIndex, setEndFrameIndex] = useState(Math.min(currentFrameIndex + 1, frames.length - 1));

  const handleApply = () => {
    if (isPlaying) {
      alert("Please pause playback before interpolating.");
      return;
    }
    if (endFrameIndex <= currentFrameIndex) {
      alert("End frame must be after the start frame.");
      return;
    }
    
    interpolateFrames(currentFrameIndex, endFrameIndex, numFrames);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#1e1e1e] border border-[#333333] shadow-2xl rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#333333] bg-[#2a2a2a]/50">
          <h2 className="text-sm font-bold text-[#e0e0e0] uppercase tracking-wider">Interpolate Frames</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded text-[#909090] hover:text-white hover:bg-[#333333] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-sm">
          <p className="text-[#909090] text-xs">
            Generate intermediate frames between the current frame and a target end frame on the active layer. Matches strokes by order path index.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#121212] p-3 rounded-lg border border-[#333333]">
              <span className="text-[#e0e0e0] font-medium">Start Frame</span>
              <div className="text-xs font-bold text-[#3a86ff] bg-[#3a86ff]/10 px-2 py-1 rounded">
                Frame {currentFrameIndex + 1}
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[#909090] text-xs font-bold uppercase tracking-wider">End Frame Target</label>
              <select
                className="w-full bg-[#121212] border border-[#333333] rounded px-3 py-2 text-[#e0e0e0] outline-none focus:border-[#3a86ff]"
                value={endFrameIndex}
                onChange={(e) => setEndFrameIndex(Number(e.target.value))}
              >
                {frames.map((_, i) => (
                  <option key={i} value={i} disabled={i <= currentFrameIndex}>
                     Frame {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                 <label className="text-[#909090] text-xs font-bold uppercase tracking-wider">Frames to Insert</label>
                 <span className="text-xs font-mono text-[#e0e0e0]">{numFrames} frames</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                value={numFrames}
                onChange={(e) => setNumFrames(Number(e.target.value))}
                className="w-full h-1.5 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-[#555555]">
                 <span>1</span>
                 <span>24</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#333333] bg-[#2a2a2a]/30 flex justify-end space-x-2">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-[#909090] hover:text-[#e0e0e0] transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleApply}
            className="px-6 py-1.5 bg-[#3a86ff] hover:bg-[#2563eb] text-white text-sm font-medium rounded transition-colors shadow-lg"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
