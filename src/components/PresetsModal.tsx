import { useState } from 'react';
import { useAnimStore } from '../store/animStore';
import { X, ArrowRight, Info } from 'lucide-react';

export function PresetsModal({ onClose }: { onClose: () => void }) {
  const { applyPresetToLayer, layers, currentLayerId } = useAnimStore();
  
  const [selectedPreset, setSelectedPreset] = useState<string>('slideRight');
  const [duration, setDuration] = useState<number>(10);
  const [distance, setDistance] = useState<number>(400); // Used for slides
  const [height, setHeight] = useState<number>(150); // bounce
  const [rotations, setRotations] = useState<number>(1); // spin

  const presets = [
    { id: 'slideRight', name: 'Slide In Right', type: 'movement', desc: 'Moves the drawing horizontally to the right across the screen.' },
    { id: 'slideLeft', name: 'Slide In Left', type: 'movement', desc: 'Moves the drawing horizontally to the left across the screen.' },
    { id: 'bounce', name: 'Bounce Drop', type: 'movement', desc: 'Drops the drawing down simulating a bouncing ball.' },
    { id: 'grow', name: 'Scale Up (Grow)', type: 'scaling', desc: 'Scales the drawing up uniformly from a point.' },
    { id: 'shrink', name: 'Scale Down (Shrink)', type: 'scaling', desc: 'Shrinks the drawing down to a point.' },
    { id: 'spin', name: 'Rotate (Spin)', type: 'rotation', desc: 'Rotates the drawing around its center point.' },
  ];

  const handleApply = () => {
    applyPresetToLayer(selectedPreset, duration, {
      distance,
      height,
      rotations,
      bounces: 3
    });
    onClose();
  };

  const activePresetInfo = presets.find(p => p.id === selectedPreset);

  const activeLayerName = layers.find(l => l.id === currentLayerId)?.name || 'None';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl w-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333333] bg-[#2a2a2a]/50">
          <div>
            <h2 className="text-lg font-bold text-[#e0e0e0]">Animation Presets Library</h2>
            <p className="text-[#909090] text-xs mt-0.5">Automate frame-by-frame transforms on the active layer.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#909090] hover:text-white rounded-md hover:bg-[#333333] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[360px]">
          {/* List */}
          <div className="w-[200px] border-r border-[#333333] bg-[#121212] overflow-y-auto p-2 space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#909090] tracking-widest p-2 pb-1">Presets</div>
            {presets.map(p => (
               <button
                 key={p.id}
                 onClick={() => setSelectedPreset(p.id)}
                 className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${selectedPreset === p.id ? 'bg-[#3a86ff] text-white' : 'text-[#909090] hover:bg-[#2a2a2a] hover:text-[#e0e0e0]'}`}
               >
                 {p.name}
               </button>
            ))}
          </div>

          {/* Config */}
          <div className="flex-1 p-5 flex flex-col items-start bg-[#1e1e1e] overflow-y-auto">
            {activePresetInfo && (
              <div className="bg-[#2a2a2a] border border-[#333333] p-3 rounded-lg flex items-start space-x-3 w-full mb-6">
                <Info size={18} className="text-[#3a86ff] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#e0e0e0]">{activePresetInfo.name}</h3>
                  <p className="text-xs text-[#909090] mt-1">{activePresetInfo.desc}</p>
                </div>
              </div>
            )}

            <div className="space-y-4 w-full">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#909090] uppercase tracking-wider">Duration (Frames)</label>
                <input 
                  type="number" 
                  value={duration} 
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-[#121212] border border-[#333333] text-[#e0e0e0] px-3 py-2 rounded text-sm outline-none focus:border-[#3a86ff] transition-colors"
                  min="2" max="100"
                />
                <p className="text-[10px] text-[#909090]">How many new frames to generate.</p>
              </div>

              {activePresetInfo?.type === 'movement' && selectedPreset !== 'bounce' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#909090] uppercase tracking-wider">Distance (Pixels)</label>
                  <input 
                    type="number" 
                    value={distance} 
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full bg-[#121212] border border-[#333333] text-[#e0e0e0] px-3 py-2 rounded text-sm outline-none focus:border-[#3a86ff] transition-colors"
                  />
                </div>
              )}

              {selectedPreset === 'bounce' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#909090] uppercase tracking-wider">Bounce Height</label>
                  <input 
                    type="number" 
                    value={height} 
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-[#121212] border border-[#333333] text-[#e0e0e0] px-3 py-2 rounded text-sm outline-none focus:border-[#3a86ff] transition-colors"
                  />
                </div>
              )}

              {selectedPreset === 'spin' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#909090] uppercase tracking-wider">Rotations/Cycles</label>
                  <input 
                    type="number" 
                    value={rotations} 
                    onChange={(e) => setRotations(Number(e.target.value))}
                    className="w-full bg-[#121212] border border-[#333333] text-[#e0e0e0] px-3 py-2 rounded text-sm outline-none focus:border-[#3a86ff] transition-colors"
                    step="0.5"
                  />
                </div>
              )}
            </div>

            <div className="mt-auto pt-6 w-full">
              <div className="flex items-center space-x-2 text-xs text-[#909090] mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3a86ff]"></span>
                <span>Applying to active layer: <strong className="text-[#e0e0e0]">{activeLayerName}</strong></span>
              </div>
              <button 
                onClick={handleApply}
                className="w-full py-2.5 bg-[#3a86ff] hover:bg-blue-500 text-white font-bold text-sm rounded shadow-sm transition-colors flex items-center justify-center space-x-2"
              >
                <span>Generate Frames</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
