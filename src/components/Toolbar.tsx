import { Pen, Eraser, SquarePen, Undo2, Redo2, Trash2, Shapes, Square, Circle, Minus, Palette, Move, Pipette, SlidersHorizontal, PaintBucket, Triangle, Diamond, Star, Type } from 'lucide-react';
import { useAnimStore, ToolType, ShapeType } from '../store/animStore';
import { cn } from '../lib/utils';
import { useRef } from 'react';

export function Toolbar() {
  const { 
    selectedTool, setTool, 
    selectedShape, setShape,
    toolColor, setColor, 
    toolSize, setSize,
    textFontFamily, setTextFontFamily,
    undoLastStroke, redoLastStroke, clearCurrentFrameAndLayer,
    setTransformModalOpen
  } = useAnimStore();

  const colorInputRef = useRef<HTMLInputElement>(null);

  const tools: { id: ToolType; icon: any; label: string }[] = [
    { id: 'brush', icon: Pen, label: 'Brush' },
    { id: 'pencil', icon: SquarePen, label: 'Pencil' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'shape', icon: Shapes, label: 'Shapes' },
    { id: 'fill', icon: PaintBucket, label: 'Paint Bucket' },
    { id: 'text', icon: Type, label: 'Text Tool' },
  ];

  const presets = ['#000000', '#FFFFFF', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];

  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        setColor(result.sRGBHex);
      } catch (e) {
        // User Canceled
      }
    } else {
      alert("Eyedropper is not supported in this browser.");
    }
  };

  return (
    <aside className="w-[56px] bg-[#1e1e1e] border-r border-[#333333] flex flex-col items-center py-4 space-y-4 z-10 shrink-0 tutorial-step-tools overflow-y-visible relative shadow-xl">
      <div className="flex flex-col space-y-2">
        {tools.map((t) => (
          <div key={t.id} className="relative flex justify-center w-full">
            <button
              onClick={() => setTool(t.id)}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-[18px]",
                selectedTool === t.id 
                  ? "bg-[#3a86ff] text-white" 
                  : "text-[#909090] hover:bg-[#2a2a2a] hover:text-[#e0e0e0]"
              )}
              title={t.label}
            >
              <t.icon size={20} />
            </button>

            {/* Shape Options Popover */}
            {t.id === 'shape' && selectedTool === 'shape' && (
              <div className="absolute left-[56px] top-0 ml-2 flex flex-col space-y-1 bg-[#121212] p-1 rounded-lg border border-[#333333] shadow-2xl z-50">
                {(['rectangle', 'ellipse', 'line', 'triangle', 'diamond', 'star'] as ShapeType[]).map(s => (
                  <button
                     key={s}
                     onClick={() => setShape(s)}
                     className={cn(
                       "w-8 h-8 rounded flex items-center justify-center transition-colors",
                       selectedShape === s ? "bg-[#2a2a2a] text-[#3a86ff]" : "text-[#909090] hover:text-white"
                     )}
                     title={s}
                  >
                     {s === 'rectangle' && <Square size={16} />}
                     {s === 'ellipse' && <Circle size={16} />}
                     {s === 'line' && <Minus size={16} />}
                     {s === 'triangle' && <Triangle size={16} />}
                     {s === 'diamond' && <Diamond size={16} />}
                     {s === 'star' && <Star size={16} />}
                  </button>
                ))}
              </div>
            )}

            {/* Text Options Popover */}
            {t.id === 'text' && selectedTool === 'text' && (
              <div className="absolute left-[56px] top-0 ml-2 flex flex-col space-y-1 bg-[#121212] p-2 rounded-lg border border-[#333333] shadow-2xl z-50 w-32 text-center pointer-events-auto">
                <label className="text-[10px] text-[#909090] uppercase font-bold tracking-wider mb-1">Font</label>
                {(['Inter', 'Serif', 'Monospace', 'Comic Sans MS'] as string[]).map(f => (
                  <button
                     key={f}
                     onClick={() => setTextFontFamily(f)}
                     className={cn(
                       "w-full py-1.5 text-sm rounded transition-colors truncate px-2",
                       textFontFamily === f ? "bg-[#2a2a2a] text-[#3a86ff]" : "text-[#909090] hover:text-white hover:bg-[#1a1a1a]"
                     )}
                     style={{ fontFamily: f === 'Serif' ? 'serif' : f === 'Monospace' ? 'monospace' : f }}
                     title={f}
                  >
                     Aa {f.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="w-8 h-px bg-[#333333]" />
      
      <div className="flex flex-col space-y-2">
        <button
          onClick={() => setTransformModalOpen(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-[#909090] hover:bg-[#2a2a2a] hover:text-[#e0e0e0]"
          title="Transform Active Layer"
        >
          <Move size={20} />
        </button>
        <button
          onClick={handleEyedropper}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-[#909090] hover:bg-[#2a2a2a] hover:text-[#3a86ff]"
          title="Eyedropper"
        >
          <Pipette size={20} />
        </button>
        <button
          onClick={() => useAnimStore.getState().setColorPickerModalOpen(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-[#909090] hover:bg-[#2a2a2a] hover:text-[#eab308]"
          title="Advanced Color Picker"
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>

      <div className="w-8 h-px bg-[#333333]" />

      {/* Colors */}
      <div className="flex flex-col items-center space-y-2 w-full px-2">
        <button 
          onClick={() => colorInputRef.current?.click()}
          className="w-10 h-10 rounded-full border border-[#333333] shadow-inner relative flex items-center justify-center group overflow-hidden transition-transform hover:scale-105"
          style={{ 
            background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
          }}
          title="Native Color Picker"
        >
          <div className="w-5 h-5 rounded-full absolute" style={{ backgroundColor: toolColor, border: '2px solid rgba(255,255,255,0.8)' }}></div>
          <Palette size={20} className="opacity-0 group-hover:opacity-100 transition-opacity absolute text-white drop-shadow-md z-10" />
        </button>
        <input 
          ref={colorInputRef}
          type="color" 
          value={toolColor}
          onChange={(e) => setColor(e.target.value)}
          className="sr-only"
        />
        
        <div className="flex flex-col space-y-1.5 pt-2">
          {presets.map(color => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className={cn(
                "w-6 h-6 rounded border-2 transition-transform hover:scale-110",
                toolColor === color ? "border-white scale-110" : "border-[#333333]"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="w-8 h-px bg-[#333333]" />

      {/* Size Slider (Vertical) */}
      <div className="flex flex-col items-center justify-center flex-1 h-32 w-full px-2">
        <div className="text-xs text-[#909090] font-medium mb-3">{toolSize}{selectedTool === 'text' ? 'pt' : 'px'}</div>
        <input
          type="range"
          min="1"
          max={selectedTool === 'text' ? "100" : "50"}
          value={toolSize}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-24 -rotate-90 origin-center bg-[#2a2a2a] rounded-lg appearance-none h-1.5 outline-none cursor-pointer slider-thumb"
        />
      </div>

      <div className="w-8 h-px bg-[#333333]" />

      {/* Actions */}
      <div className="flex flex-col space-y-2 mb-auto">
        <button 
          onClick={undoLastStroke}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#909090] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
          title="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button 
          onClick={redoLastStroke}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#909090] hover:text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
          title="Redo"
        >
          <Redo2 size={18} />
        </button>
        <button 
          onClick={clearCurrentFrameAndLayer}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#909090] hover:text-[#ff4757] hover:bg-[#2a2a2a] transition-colors"
          title="Clear Layer"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </aside>
  );
}
