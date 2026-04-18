import React, { useState, useEffect } from 'react';
import { useAnimStore } from '../store/animStore';
import { X, Palette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

export function ColorPickerModal({ onClose }: { onClose: () => void }) {
  const { toolColor, setColor } = useAnimStore();
  const [localColor, setLocalColor] = useState(toolColor);
  const [hexInput, setHexInput] = useState(toolColor);

  useEffect(() => {
    setLocalColor(toolColor);
    setHexInput(toolColor);
  }, [toolColor]);

  const handleColorChange = (newColor: string) => {
    setLocalColor(newColor);
    setHexInput(newColor);
    setColor(newColor);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    
    // Valid HEX validation (3 or 6 chars, with optional #)
    if (/^#?([0-9A-F]{3}){1,2}$/i.test(val)) {
      const formatted = val.startsWith('#') ? val : `#${val}`;
      setLocalColor(formatted);
      setColor(formatted);
    }
  };

  const presetColors = [
    '#000000', '#333333', '#808080', '#CCCCCC', '#FFFFFF',
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#78350f', '#92400e', '#b45309'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-start p-6 pointer-events-none transition-all duration-300">
      <div className="bg-[#1e1e1e] border border-[#333333] rounded-2xl shadow-2xl w-[320px] flex flex-col overflow-hidden animate-in slide-in-from-left-10 fade-in duration-200 pointer-events-auto ml-[56px] backdrop-blur-md bg-opacity-95 mt-[48px]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333333] bg-[#2a2a2a]/50">
          <div className="flex items-center space-x-2">
            <Palette size={18} className="text-[#e0e0e0]" />
            <h2 className="text-[15px] font-bold text-[#e0e0e0]">Color Picker</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-[#909090] hover:text-white rounded hover:bg-[#333333] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col space-y-6 bg-transparent">
          
          <div className="flex justify-center">
            <div className="custom-color-picker-wrapper">
              <HexColorPicker color={localColor} onChange={handleColorChange} />
            </div>
          </div>

          {/* Hex Input */}
          <div className="flex items-center space-x-3 bg-[#121212] p-3 rounded-xl border border-[#333333]">
            <div 
              className="w-10 h-10 rounded-lg shadow-inner border border-[#333333] shrink-0" 
              style={{ backgroundColor: localColor }}
            />
            <div className="flex-1">
              <label className="text-[10px] font-bold text-[#909090] uppercase tracking-wider block mb-1">HEX Color</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090] font-mono text-sm">#</span>
                <input 
                  type="text" 
                  value={hexInput.replace('#', '')} 
                  onChange={handleHexInputChange}
                  className="w-full bg-[#2a2a2a] border border-[#444444] rounded-lg pl-7 pr-3 py-1.5 text-[#e0e0e0] font-mono text-sm focus:outline-none focus:border-[#3a86ff] uppercase transition-colors"
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          {/* Expanded Presets */}
          <div>
            <label className="text-[10px] font-bold text-[#909090] uppercase tracking-wider block mb-2">Preset Palette</label>
            <div className="grid grid-cols-5 gap-2">
              {presetColors.map(color => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-full aspect-square rounded cursor-pointer transition-transform hover:scale-110 shadow-sm border ${localColor.toLowerCase() === color.toLowerCase() ? 'border-white scale-110 z-10 box-shadow-outline' : 'border-[#333333]'}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-[#3a86ff] hover:bg-blue-500 text-white font-bold text-sm rounded-lg shadow-sm transition-colors mt-2"
          >
            Done
          </button>
        </div>

      </div>

      <style>{`
        /* Custom styles for react-colorful to match the dark theme */
        .custom-color-picker-wrapper .react-colorful {
          width: 100%;
          height: 200px;
        }
        .custom-color-picker-wrapper .react-colorful__pointer {
          width: 20px;
          height: 20px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        .custom-color-picker-wrapper .react-colorful__saturation {
          border-radius: 12px 12px 0 0;
          border-bottom: 2px solid #333333;
        }
        .custom-color-picker-wrapper .react-colorful__hue {
          height: 16px;
          border-radius: 0 0 12px 12px;
        }
      `}</style>
    </div>
  );
}
