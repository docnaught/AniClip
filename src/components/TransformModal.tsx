import { useState, useEffect, useRef } from 'react';
import { useAnimStore, Stroke } from '../store/animStore';
import { X, Check } from 'lucide-react';

export function TransformModal({ onClose }: { onClose: () => void }) {
  const { currentFrameIndex, layers, currentLayerId } = useAnimStore();
  
  const [dx, setDx] = useState<number>(0);
  const [dy, setDy] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // degrees

  const baseStrokesRef = useRef<Stroke[] | null>(null);

  useEffect(() => {
    const state = useAnimStore.getState();
    if (currentLayerId) {
      const frame = state.frames[state.currentFrameIndex];
      // Store exact original data to allow realtime previews and reverting
      baseStrokesRef.current = JSON.parse(JSON.stringify(frame.layerData[currentLayerId] || []));
    }
  }, [currentLayerId]); // only run once when opened for that layer

  useEffect(() => {
    if (!currentLayerId || !baseStrokesRef.current || baseStrokesRef.current.length === 0) return;

    useAnimStore.setState((state) => {
      const frame = state.frames[state.currentFrameIndex];
      const baseStrokes = baseStrokesRef.current!;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      baseStrokes.forEach(s => s.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const angle = (rotation * Math.PI) / 180;

      const transformedStrokes = baseStrokes.map(stroke => {
        const newPoints = stroke.points.map(p => {
          let px = p.x - cx;
          let py = p.y - cy;
          
          px *= scale;
          py *= scale;

          const rx = px * Math.cos(angle) - py * Math.sin(angle);
          const ry = px * Math.sin(angle) + py * Math.cos(angle);

          return {
            ...p,
            x: rx + cx + dx,
            y: ry + cy + dy
          };
        });
        
        let newRasterBounds = stroke.rasterBounds;
        if (newRasterBounds) {
          // Transform the center of the raster bounds
          const rcx = newRasterBounds.x + newRasterBounds.w / 2;
          const rcy = newRasterBounds.y + newRasterBounds.h / 2;
          
          let pcx = rcx - cx;
          let pcy = rcy - cy;
          
          pcx *= scale;
          pcy *= scale;

          const rrcx = pcx * Math.cos(angle) - pcy * Math.sin(angle);
          const rrcy = pcx * Math.sin(angle) + pcy * Math.cos(angle);
          
          const finalRcx = rrcx + cx + dx;
          const finalRcy = rrcy + cy + dy;
          
          newRasterBounds = {
            ...newRasterBounds,
            x: finalRcx - (newRasterBounds.w * scale) / 2,
            y: finalRcy - (newRasterBounds.h * scale) / 2,
            w: newRasterBounds.w * scale,
            h: newRasterBounds.h * scale
          };
        }

        return { 
          ...stroke, 
          points: newPoints, 
          rasterBounds: newRasterBounds,
          size: Math.max(1, stroke.size * scale) 
        };
      });

      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...frame,
        layerData: {
          ...frame.layerData,
          [currentLayerId]: transformedStrokes
        }
      };

      return { frames: newFrames };
    });
  }, [dx, dy, scale, rotation, currentLayerId]);

  const handleApply = () => {
    // The store is already updated from the live preview!
    onClose();
  };

  const handleCancel = () => {
    // Revert to the base states
    if (currentLayerId && baseStrokesRef.current) {
      useAnimStore.setState((state) => {
        const frame = state.frames[state.currentFrameIndex];
        const newFrames = [...state.frames];
        newFrames[state.currentFrameIndex] = {
          ...frame,
          layerData: {
            ...frame.layerData,
            [currentLayerId]: baseStrokesRef.current!
          }
        };
        return { frames: newFrames };
      });
    }
    onClose();
  };

  const activeLayerName = layers.find(l => l.id === currentLayerId)?.name || 'None';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-start p-6 pointer-events-none transition-all duration-300">
      <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl w-[320px] flex flex-col overflow-hidden animate-in slide-in-from-left-10 fade-in duration-200 pointer-events-auto ml-[56px] backdrop-blur-md bg-opacity-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#333333] bg-[#2a2a2a]/50">
          <div>
            <h2 className="text-[15px] font-bold text-[#e0e0e0]">Live Transform</h2>
            <p className="text-[#909090] text-[11px] mt-0.5">Adjust sliders to preview.</p>
          </div>
          <button 
            onClick={handleCancel} 
            className="p-1 text-[#909090] hover:text-[#ff4757] rounded hover:bg-[#333333] transition-colors"
            title="Cancel & Revert"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col space-y-4 bg-transparent">
          
          <div className="space-y-1">
            <label className="flex justify-between text-[11px] font-bold text-[#909090] uppercase tracking-wider">
              <span>Translate X</span>
              <span className="text-[#3a86ff]">{dx}</span>
            </label>
            <input 
              type="range" min="-800" max="800" value={dx} onChange={(e) => setDx(Number(e.target.value))}
              className="w-full bg-[#2a2a2a] rounded-lg appearance-none h-1.5 outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#3a86ff] [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <div className="space-y-1">
            <label className="flex justify-between text-[11px] font-bold text-[#909090] uppercase tracking-wider">
              <span>Translate Y</span>
              <span className="text-[#3a86ff]">{dy}</span>
            </label>
            <input 
              type="range" min="-800" max="800" value={dy} onChange={(e) => setDy(Number(e.target.value))}
              className="w-full bg-[#2a2a2a] rounded-lg appearance-none h-1.5 outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#3a86ff] [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <div className="space-y-1">
            <label className="flex justify-between text-[11px] font-bold text-[#909090] uppercase tracking-wider">
              <span>Scale</span>
              <span className="text-[#3a86ff]">{scale.toFixed(2)}x</span>
            </label>
            <input 
              type="range" min="0.1" max="5" step="0.1" value={scale} onChange={(e) => setScale(Number(e.target.value))}
              className="w-full bg-[#2a2a2a] rounded-lg appearance-none h-1.5 outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#3a86ff] [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <div className="space-y-1">
            <label className="flex justify-between text-[11px] font-bold text-[#909090] uppercase tracking-wider">
              <span>Rotation</span>
              <span className="text-[#3a86ff]">{rotation}°</span>
            </label>
            <input 
              type="range" min="-180" max="180" value={rotation} onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full bg-[#2a2a2a] rounded-lg appearance-none h-1.5 outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#3a86ff] [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          <div className="mt-2 pt-4 border-t border-[#333333]">
            <div className="flex items-center space-x-2 text-[11px] text-[#909090] mb-3 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3a86ff] shrink-0"></span>
              <span className="truncate">Frame {currentFrameIndex + 1} • <strong className="text-[#e0e0e0]">{activeLayerName}</strong></span>
            </div>
            <button 
              onClick={handleApply}
              className="w-full py-2 bg-[#3a86ff] hover:bg-blue-500 text-white font-bold text-xs rounded shadow-sm transition-colors flex items-center justify-center space-x-1.5"
            >
              <Check size={14} />
              <span>Apply & Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
