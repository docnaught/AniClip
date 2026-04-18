import { useState, useRef, useEffect } from 'react';
import { useAnimStore } from '../store/animStore';
import { X, ArrowRight, Video, Image as ImageIcon } from 'lucide-react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const { frames, layers, width: projectWidth, height: projectHeight, fps: projectFps, setCurrentFrame } = useAnimStore();

  const [format, setFormat] = useState<'mp4' | 'webm' | 'gif'>('mp4');
  const [resolutionScale, setResolutionScale] = useState<number>(1); // 1 = 100%, 0.5 = 50%
  const [exportFps, setExportFps] = useState<number>(projectFps);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    const exportW = Math.round(projectWidth * resolutionScale);
    const exportH = Math.round(projectHeight * resolutionScale);

    const canvas = document.createElement('canvas');
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawFrameData = (frameIndex: number) => {
      const frame = frames[frameIndex];
      
      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportW, exportH);
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      layers.forEach(layer => {
        if (!layer.visible) return;
        const strokes = frame.layerData[layer.id] || [];
        strokes.forEach(stroke => {
          if (stroke.points.length === 0) return;
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
          
          const sizeObj = Math.max(1, stroke.size * resolutionScale);

          if (stroke.tool === 'shape' && stroke.points.length >= 2) {
             const start = stroke.points[0];
             const end = stroke.points[1];
             ctx.strokeStyle = stroke.color;
             ctx.lineWidth = sizeObj;
             ctx.beginPath();
             if (stroke.shapeType === 'rectangle') {
                ctx.rect(start.x * resolutionScale, start.y * resolutionScale, (end.x - start.x) * resolutionScale, (end.y - start.y) * resolutionScale);
             } else if (stroke.shapeType === 'ellipse') {
                const rx = Math.abs(end.x - start.x) / 2 * resolutionScale;
                const ry = Math.abs(end.y - start.y) / 2 * resolutionScale;
                const cx = (Math.min(start.x, end.x)) * resolutionScale + rx;
                const cy = (Math.min(start.y, end.y)) * resolutionScale + ry;
                ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
             } else if (stroke.shapeType === 'line') {
                ctx.moveTo(start.x * resolutionScale, start.y * resolutionScale);
                ctx.lineTo(end.x * resolutionScale, end.y * resolutionScale);
             }
             ctx.stroke();
          } else if (stroke.tool === 'pencil' || stroke.tool === 'brush' || stroke.tool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x * resolutionScale, stroke.points[0].y * resolutionScale);
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x * resolutionScale, stroke.points[i].y * resolutionScale);
            }
            ctx.strokeStyle = stroke.tool === 'eraser' ? 'black' : stroke.color;
            ctx.lineWidth = sizeObj;
            ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    if (format === 'mp4' || format === 'webm') {
      try {
        const stream = canvas.captureStream(exportFps);
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
        
        let recorderMimeType = mimeType;
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          // Fallback to webm if mp4 not supported in this browser
          recorderMimeType = 'video/webm';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType: recorderMimeType });
        const chunks: BlobPart[] = [];
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const actualExtension = recorderMimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: recorderMimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `animation.${actualExtension}`;
          a.click();
          URL.revokeObjectURL(url);
          setIsExporting(false);
          useAnimStore.getState().setCurrentFrame(0);
          onClose();
        };

        mediaRecorder.start();

        let currentF = 0;
        const intervalTime = 1000 / exportFps;
        
        const renderNextFrame = () => {
          if (currentF >= frames.length) {
            mediaRecorder.stop();
            return;
          }
          setProgress((currentF / frames.length) * 100);
          setCurrentFrame(currentF);
          drawFrameData(currentF);
          currentF++;
          setTimeout(renderNextFrame, intervalTime);
        };

        renderNextFrame();

      } catch (err) {
        console.error("Video export error:", err);
        setIsExporting(false);
      }
    } else if (format === 'gif') {
      try {
        const gif = GIFEncoder();
        
        for (let i = 0; i < frames.length; i++) {
          setProgress((i / frames.length) * 100);
          setCurrentFrame(i);
          drawFrameData(i);
          
          const imageData = ctx.getImageData(0, 0, exportW, exportH);
          const data = imageData.data;
          
          const palette = quantize(data, 256);
          const index = applyPalette(data, palette);
          
          gif.writeFrame(index, exportW, exportH, { palette, delay: 1000 / exportFps });
          
          // Yield to UI
          await new Promise(r => setTimeout(r, 0));
        }

        gif.finish();
        const bytes = gif.bytes();
        const blob = new Blob([bytes], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animation.gif';
        a.click();
        URL.revokeObjectURL(url);
        
        useAnimStore.getState().setCurrentFrame(0);
        setIsExporting(false);
        onClose();
      } catch (err) {
        console.error("GIF export error:", err);
        setIsExporting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl w-[480px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333333] bg-[#2a2a2a]/50">
          <div>
            <h2 className="text-lg font-bold text-[#e0e0e0]">Export Render</h2>
            <p className="text-[#909090] text-xs mt-0.5">Save your animation to your computer.</p>
          </div>
          {!isExporting && (
            <button onClick={onClose} className="p-1.5 text-[#909090] hover:text-white rounded-md hover:bg-[#333333] transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#909090] uppercase tracking-wider">Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setFormat('mp4')}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg border-2 transition-all ${format === 'mp4' || format === 'webm' ? 'bg-[#3a86ff]/10 border-[#3a86ff] text-[#e0e0e0]' : 'border-[#333333] hover:border-[#909090] text-[#909090]'}`}
              >
                <Video size={18} />
                <span className="font-semibold text-sm">Video (MP4/WebM)</span>
              </button>
              <button 
                onClick={() => setFormat('gif')}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg border-2 transition-all ${format === 'gif' ? 'bg-[#3a86ff]/10 border-[#3a86ff] text-[#e0e0e0]' : 'border-[#333333] hover:border-[#909090] text-[#909090]'}`}
              >
                <ImageIcon size={18} />
                <span className="font-semibold text-sm">Animated GIF</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#909090] uppercase tracking-wider">Resolution</label>
              <select 
                value={resolutionScale}
                onChange={(e) => setResolutionScale(Number(e.target.value))}
                className="w-full bg-[#121212] border border-[#333333] text-[#e0e0e0] px-3 py-2.5 rounded text-sm outline-none focus:border-[#3a86ff] transition-colors"
              >
                <option value={1}>100% ({projectWidth}x{projectHeight})</option>
                <option value={0.5}>50% ({Math.round(projectWidth/2)}x{Math.round(projectHeight/2)})</option>
                <option value={0.25}>25% ({Math.round(projectWidth/4)}x{Math.round(projectHeight/4)})</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#909090] uppercase tracking-wider">Frame Rate (FPS)</label>
              <div className="flex items-center space-x-3">
                <input 
                  type="range"
                  min="1"
                  max="60"
                  value={exportFps}
                  onChange={(e) => setExportFps(Number(e.target.value))}
                  className="flex-1 bg-[#2a2a2a] rounded-lg appearance-none h-1.5 outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#3a86ff] [&::-webkit-slider-thumb]:rounded-full"
                />
                <span className="w-12 text-right text-sm font-bold text-[#e0e0e0]">{exportFps}</span>
              </div>
            </div>
          </div>

          {/* Progress / Actions */}
          <div className="pt-4 border-t border-[#333333]">
            {isExporting ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#909090]">
                  <span>Exporting {format.toUpperCase()}...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#3a86ff] transition-all duration-200" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
               <button 
                onClick={handleExport}
                className="w-full py-3 bg-[#3a86ff] hover:bg-blue-500 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
              >
                <span>Start Export</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
