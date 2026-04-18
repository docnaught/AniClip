import { Layers, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAnimStore } from '../store/animStore';
import { cn } from '../lib/utils';

export function LayerPanel() {
  const { 
    layers, currentLayerId, setCurrentLayer, 
    addLayer, deleteLayer, updateLayer
  } = useAnimStore();

  return (
    <aside className="w-[240px] bg-[#1e1e1e] border-l border-[#333333] flex flex-col shrink-0 z-10">
      <div className="flex items-center justify-between p-3 border-b border-[#333333]">
        <div className="flex items-center space-x-2 text-[#909090] uppercase tracking-widest text-[11px] font-bold">
          <Layers size={14} />
          <span>Layers</span>
        </div>
        <button 
          onClick={addLayer}
          className="p-1 hover:bg-[#2a2a2a] rounded text-[#909090] hover:text-[#e0e0e0] transition-colors"
          title="Add Layer"
        >
          <Plus size={14} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.map((layer) => (
          <div 
            key={layer.id}
            onClick={() => setCurrentLayer(layer.id)}
            className={cn(
              "flex items-center justify-between p-2 rounded cursor-pointer transition-all border-l-[3px]",
              currentLayerId === layer.id 
                ? "bg-[#2a2a2a] border-[#3a86ff] text-[#e0e0e0]" 
                : "bg-[#2a2a2a] border-transparent text-[#909090] hover:bg-[#333333]"
            )}
          >
            <div className="flex items-center space-x-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { visible: !layer.visible });
                }}
                className={cn(
                  "opacity-50 hover:opacity-100 transition-opacity",
                  layer.visible ? "text-[#e0e0e0]" : "text-[#909090]"
                )}
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <span className="text-[12px] font-medium truncate w-24">{layer.name}</span>
            </div>
            
            <div className="flex items-center space-x-2 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={layer.opacity}
                onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                onClick={(e) => e.stopPropagation()}
                className="w-12 h-1 bg-[#121212] rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-[#909090] [&::-webkit-slider-thumb]:rounded-full"
                title="Opacity"
              />
              {layers.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                  }}
                  className="hover:text-[#ff4757] text-[#909090] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
