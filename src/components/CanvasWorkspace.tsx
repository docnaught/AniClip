import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Undo2, Redo2, Check, X } from 'lucide-react';
import getStroke from 'perfect-freehand';
import { useAnimStore, Stroke } from '../store/animStore';
import { floodFill } from '../lib/floodFill';

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

export function CanvasWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { 
    width, height, frames, layers, currentFrameIndex, currentLayerId,
    selectedTool, toolColor, toolSize, addStrokeToCurrentFrameAndLayer,
    onionSkinEnabled, onionSkinFrames, isPlaying,
    undoLastStroke, redoLastStroke
  } = useAnimStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{x: number, y: number, pressure: number}[]>([]);
  
  // Pan & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  
  const pointerStartRef = useRef<{clientX: number, clientY: number, panX: number, panY: number} | null>(null);
  
  // Multi-touch refs
  const activePointers = useRef<Map<number, {clientX: number, clientY: number}>>(new Map());
  const pinchState = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number, y: number };
    initialCenter: { x: number, y: number };
  } | null>(null);

  const hasInitialized = useRef(false);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

  // Text Tool State
  const [textInputPos, setTextInputPos] = useState<{clientX: number, clientY: number, canvasX: number, canvasY: number} | null>(null);
  const [textInputValue, setTextInputValue] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  // Setup initial fit scale on first mount or dimension change
  useEffect(() => {
    if (!containerRef.current) return;
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    const fitScale = Math.min((containerW - 80) / width, (containerH - 80) / height, 2);
    setZoom(fitScale);
    setPan({ x: 0, y: 0 }); 
  }, [width, height]);

  // Focus Text Input on Open
  useEffect(() => {
    if (textInputPos && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputPos]);

  // Handle Spacebar state and global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.code === 'Space' && !e.repeat) {
        setIsSpaceDown(true);
      }
      
      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLastStroke();
      }
      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redoLastStroke();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undoLastStroke, redoLastStroke]);

  // Handle Wheel manually to prevent passive scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || e.altKey) {
        setZoom(z => Math.min(Math.max(0.1, z * (1 - e.deltaY * 0.005)), 10));
      } else {
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Main render loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Helper to draw a single stroke
    const drawStroke = (stroke: Stroke, opacity: number = 1) => {
      if (stroke.points.length === 0) return;
      
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

      if (stroke.tool === 'shape' && stroke.points.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[1];
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.beginPath();
        if (stroke.shapeType === 'rectangle') {
           ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else if (stroke.shapeType === 'ellipse') {
           const rx = Math.abs(end.x - start.x) / 2;
           const ry = Math.abs(end.y - start.y) / 2;
           const cx = Math.min(start.x, end.x) + rx;
           const cy = Math.min(start.y, end.y) + ry;
           ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        } else if (stroke.shapeType === 'line') {
           ctx.moveTo(start.x, start.y);
           ctx.lineTo(end.x, end.y);
        } else if (stroke.shapeType === 'triangle') {
           ctx.moveTo(start.x + (end.x - start.x) / 2, start.y);
           ctx.lineTo(end.x, end.y);
           ctx.lineTo(start.x, end.y);
           ctx.closePath();
        } else if (stroke.shapeType === 'diamond') {
           const cx = start.x + (end.x - start.x) / 2;
           const cy = start.y + (end.y - start.y) / 2;
           ctx.moveTo(cx, start.y);
           ctx.lineTo(end.x, cy);
           ctx.lineTo(cx, end.y);
           ctx.lineTo(start.x, cy);
           ctx.closePath();
        } else if (stroke.shapeType === 'star') {
           const cx = start.x + (end.x - start.x) / 2;
           const cy = start.y + (end.y - start.y) / 2;
           const r = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) / 2;
           const spikes = 5;
           const inset = 0.5;
           ctx.moveTo(cx, cy - r);
           for (let i = 0; i < spikes; i++) {
             ctx.lineTo(cx + Math.cos(Math.PI * 2 * i / spikes - Math.PI / 2) * r, cy + Math.sin(Math.PI * 2 * i / spikes - Math.PI / 2) * r);
             ctx.lineTo(cx + Math.cos(Math.PI * 2 * (i + 0.5) / spikes - Math.PI / 2) * r * inset, cy + Math.sin(Math.PI * 2 * (i + 0.5) / spikes - Math.PI / 2) * r * inset);
           }
           ctx.closePath();
        }
        ctx.stroke();
      } else if (stroke.tool === 'fill' && stroke.rasterDataUrl && stroke.rasterBounds) {
        // Render raster data if it's cached
        const cachedImage = imageCacheRef.current[stroke.id];
        if (cachedImage) {
          ctx.drawImage(
            cachedImage, 
            stroke.rasterBounds.x, 
            stroke.rasterBounds.y, 
            stroke.rasterBounds.w, 
            stroke.rasterBounds.h
          );
        } else {
          // Fire and forget image loading to cache it
          const img = new Image();
          img.onload = () => {
             imageCacheRef.current[stroke.id] = img;
             // We don't force re-render here, it will naturally appear on next frame play or stroke
             // But to ensure it shows immediately:
             renderCanvas();
          };
          img.src = stroke.rasterDataUrl;
        }
      } else if (stroke.tool === 'text' && stroke.text) {
        ctx.fillStyle = stroke.color;
        
        let fontFamily = stroke.fontFamily || 'Inter';
        if (fontFamily === 'Serif') fontFamily = 'serif';
        if (fontFamily === 'Monospace') fontFamily = 'monospace';
        
        // Font size scales with toolSize.
        const fontSize = Math.max(1, stroke.size * 3);
        ctx.font = `${fontSize}px ${fontFamily}`;
        
        ctx.textBaseline = "top";
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
      } else if (stroke.tool === 'pencil') {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.stroke();
      } else {
        // Brush and Eraser use perfect-freehand
        const outlinePoints = getStroke(stroke.points, {
          size: stroke.size,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        });
        
        if (outlinePoints.length === 0) return;
        
        ctx.beginPath();
        const path = new Path2D(getSvgPathFromStroke(outlinePoints));
        ctx.fillStyle = stroke.tool === 'eraser' ? 'black' : stroke.color;
        ctx.fill(path);
      }
    };

    // 1. Draw Onion Skins
    if (onionSkinEnabled && !isPlaying) {
      for (let i = 1; i <= onionSkinFrames; i++) {
        const prevFrameIndex = currentFrameIndex - i;
        if (prevFrameIndex >= 0) {
          const frame = frames[prevFrameIndex];
          const opacity = (onionSkinFrames - i + 1) / (onionSkinFrames + 1) * 0.3; // Decay opacity
          
          layers.forEach(layer => {
            if (!layer.visible) return;
            const strokes = frame.layerData[layer.id] || [];
            // To make onion skin pure color (e.g., green/red like flipaclip), we could tint it.
            // But for simplicity, we just draw with reduced opacity.
            strokes.forEach(s => drawStroke(s, opacity * layer.opacity));
          });
        }
      }
    }

    // 2. Draw Current Frame Layers
    const currentFrame = frames[currentFrameIndex];
    if (currentFrame) {
      layers.forEach(layer => {
        if (!layer.visible) return;
        const strokes = currentFrame.layerData[layer.id] || [];
        strokes.forEach(s => drawStroke(s, layer.opacity));
      });
    }

    // 3. Draw Draft Stroke (currently actively drawing)
    if (isDrawing && currentPoints.length > 0) {
      drawStroke({
        id: 'draft',
        tool: selectedTool,
        color: toolColor,
        size: selectedTool === 'eraser' ? toolSize * 2 : toolSize, // Make eraser slightly larger visibly
        points: currentPoints,
        shapeType: useAnimStore.getState().selectedShape
      }, 1);
    }

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

  }, [width, height, frames, layers, currentFrameIndex, onionSkinEnabled, onionSkinFrames, isPlaying, isDrawing, currentPoints, selectedTool, toolColor, toolSize]);

  // Re-render when dependencies change
  useEffect(() => {
    requestAnimationFrame(renderCanvas);
  }, [renderCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPlaying) return;
    
      // Track pointer
      activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
  
      // Multi-touch pinch/pan start
      if (activePointers.current.size === 2) {
        setIsDrawing(false);
        setCurrentPoints([]);
        const pts = Array.from(activePointers.current.values()) as {clientX: number, clientY: number}[];
        const dist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY);
        const center = { x: (pts[0].clientX + pts[1].clientX) / 2, y: (pts[0].clientY + pts[1].clientY) / 2 };
        
        pinchState.current = {
        initialDistance: dist,
        initialZoom: zoom,
        initialPan: { ...pan },
        initialCenter: center
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Single-touch Pan start (Middle click or Spacebar)
    if (e.button === 1 || isSpaceDown) {
      setIsPanning(true);
      pointerStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: pan.x, panY: pan.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activePointers.current.size > 2) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // For paint bucket, trigger immediately on down
    if (selectedTool === 'fill' && currentLayerId) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Run flood fill on the current rendered state
        // NOTE: Make sure the pan is NOT affecting internal dimensions. The canvas pixels are 1:1 with width/height!
        // Wait, the pan/scale uses CSS transform! So internal coordinates are mapped nicely.
        const fillResult = floodFill(ctx, x, y, toolColor, width, height);
        if (fillResult) {
          addStrokeToCurrentFrameAndLayer({
            id: Math.random().toString(36).substr(2, 9),
            tool: 'fill',
            color: toolColor,
            size: toolSize,
            points: [{ x, y }],
            rasterDataUrl: fillResult.dataUrl,
            rasterBounds: fillResult.bounds
          });
        }
      }
      return;
    }

    if (selectedTool === 'text' && currentLayerId) {
      e.preventDefault(); // Prevent native focus steering from immediate mousedown
      
      if (textInputPos) {
        // If already open, close it (or apply logic happens in blur/keydown)
        setTextInputPos(null);
        return;
      }
      
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const rect = canvas.getBoundingClientRect();

      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      // Prevent starting text off-canvas
      if (x < 0 || x > width || y < 0 || y > height) {
        return;
      }

      // Position relative to the workspace container
      const overlayX = e.clientX - containerRect.left;
      const overlayY = e.clientY - containerRect.top;
      
      setTextInputPos({ clientX: overlayX, clientY: overlayY, canvasX: x, canvasY: y });
      setTextInputValue("");
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const pressure = e.pressure !== 0.5 ? e.pressure : e.pointerType === 'pen' ? e.pressure : 1; 

    setIsDrawing(true);
    setCurrentPoints([{ x, y, pressure }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    }

    // Handle Multi-touch Pinch/Pan
    if (activePointers.current.size === 2 && pinchState.current) {
      const pts = Array.from(activePointers.current.values()) as {clientX: number, clientY: number}[];
      const dist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY);
      const center = { x: (pts[0].clientX + pts[1].clientX) / 2, y: (pts[0].clientY + pts[1].clientY) / 2 };
      
      const scale = dist / pinchState.current.initialDistance;
      setZoom(Math.min(Math.max(0.1, pinchState.current.initialZoom * scale), 10));
      
      const deltaX = center.x - pinchState.current.initialCenter.x;
      const deltaY = center.y - pinchState.current.initialCenter.y;
      setPan({
        x: pinchState.current.initialPan.x + deltaX,
        y: pinchState.current.initialPan.y + deltaY
      });
      return;
    }

    // Single-touch Pan
    if (isPanning && pointerStartRef.current) {
      const dx = e.clientX - pointerStartRef.current.clientX;
      const dy = e.clientY - pointerStartRef.current.clientY;
      setPan({ x: pointerStartRef.current.panX + dx, y: pointerStartRef.current.panY + dy });
      return;
    }

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const pressure = e.pressure !== 0.5 ? e.pressure : e.pointerType === 'pen' ? e.pressure : 1; 

    if (selectedTool === 'shape' && currentPoints.length >= 1) {
      setCurrentPoints([currentPoints[0], { x, y, pressure }]);
    } else {
      setCurrentPoints(prev => [...prev, { x, y, pressure }]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    
    if (activePointers.current.size < 2) {
      pinchState.current = null;
    }

    if (isPanning) {
      setIsPanning(false);
      pointerStartRef.current = null;
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentPoints.length > 0 && currentLayerId) {
      if (selectedTool === 'shape' && currentPoints.length < 2) {
        setCurrentPoints([]);
        return;
      }
      addStrokeToCurrentFrameAndLayer({
        id: Math.random().toString(36).substr(2, 9),
        tool: selectedTool,
        color: selectedTool === 'eraser' ? '#000000' : toolColor, // Eraser color doesn't matter for dest-out
        size: selectedTool === 'eraser' ? toolSize * 2 : toolSize,
        points: currentPoints,
        shapeType: selectedTool === 'shape' ? useAnimStore.getState().selectedShape : undefined
      });
    }
    setCurrentPoints([]);
  };

  const handleZoomReset = () => {
    if (!containerRef.current) return;
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    const fitScale = Math.min((containerW - 80) / width, (containerH - 80) / height, 2);
    setZoom(fitScale);
    setPan({ x: 0, y: 0 }); 
  };

  return (
    <div 
      ref={containerRef} 
      className={`tutorial-step-canvas w-full h-full flex items-center justify-center relative touch-none overflow-hidden ${
        isSpaceDown || isPanning 
          ? 'cursor-grab active:cursor-grabbing' 
          : selectedTool === 'text' 
            ? 'cursor-text' 
            : selectedTool === 'fill'
              ? 'cursor-pointer'
              : 'cursor-crosshair'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {selectedTool === 'text' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#3a86ff]/20 border border-[#3a86ff]/50 text-[#3a86ff] px-4 py-2 rounded-full text-xs font-bold pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300 shadow-lg backdrop-blur-sm">
          Click anywhere on the canvas to add text
        </div>
      )}

      {/* Floating Canvas Controls - Top Left */}
      <div className="absolute top-4 left-4 z-40 bg-[#1e1e1e]/80 backdrop-blur-md rounded-lg border border-[#333333] flex items-center shadow-md p-1 space-x-1 cursor-auto" onPointerDown={e => e.stopPropagation()}>
        <button 
          onClick={undoLastStroke}
          className="p-1.5 rounded hover:bg-[#333333] text-[#909090] hover:text-[#e0e0e0] transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <div className="w-px h-4 bg-[#333333]"></div>
        <button 
          onClick={redoLastStroke}
          className="p-1.5 rounded hover:bg-[#333333] text-[#909090] hover:text-[#e0e0e0] transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Floating View Controls - Top Right */}
      <div 
        className="absolute top-4 right-4 z-40 bg-[#1e1e1e]/80 backdrop-blur-md rounded-lg border border-[#333333] flex flex-col shadow-md p-2 space-y-2 cursor-auto" 
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="text-xs font-bold text-[#e0e0e0] px-2 w-full text-center cursor-pointer hover:text-white" onClick={handleZoomReset} title="Reset View">
           {Math.round(zoom * 100)}%
        </div>
        <input 
          type="range" 
          min="0.1" 
          max="10" 
          step="0.1" 
          value={zoom} 
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-24 h-1.5 bg-[#2a2a2a] rounded-lg appearance-none outline-none cursor-pointer slider-thumb"
        />
      </div>
      <div 
        className="bg-white shadow-2xl relative"
        style={{
          width: width,
          height: height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center'
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full absolute top-0 left-0 pointer-events-none"
        />
      </div>

      {/* Text Input Render Layer Overlay */}
      {textInputPos && (
        <div 
          className="absolute z-[100] flex flex-col items-start pointer-events-auto"
          style={{ 
            left: `${textInputPos.clientX}px`, 
            top: `${textInputPos.clientY}px`,
            transform: `translate(-2px, -2px)` // Offset slightly to match crosshair
          }}
          onPointerDown={e => e.stopPropagation()} 
          onMouseDown={e => e.stopPropagation()}
        >
          <input
            autoFocus
            type="text"
            className="bg-transparent border border-dashed border-[#3a86ff] outline-none px-2 py-1 shadow-lg backdrop-blur bg-white/20 text-white placeholder-white/50"
            style={{ 
              color: toolColor === '#ffffff' ? '#000000' : toolColor, // Fallback high contrast if drawing with white
              fontFamily: useAnimStore.getState().textFontFamily === 'Serif' ? 'serif' : useAnimStore.getState().textFontFamily === 'Monospace' ? 'monospace' : useAnimStore.getState().textFontFamily,
              fontSize: Math.max(4, toolSize * 3 * zoom) + 'px',
              minWidth: '200px'
            }}
            placeholder="Type here..."
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (textInputValue.trim() !== '') {
                  addStrokeToCurrentFrameAndLayer({
                    id: Math.random().toString(36).substr(2, 9),
                    tool: 'text',
                    color: toolColor,
                    size: toolSize,
                    points: [{ x: textInputPos.canvasX, y: textInputPos.canvasY }],
                    text: textInputValue,
                    fontFamily: useAnimStore.getState().textFontFamily
                  });
                }
                setTextInputPos(null);
              }
              if (e.key === 'Escape') {
                setTextInputPos(null);
              }
            }}
            onBlur={() => {
              // Only apply if user actually clicked away and there's text
              if (textInputValue.trim() !== '') {
                addStrokeToCurrentFrameAndLayer({
                  id: Math.random().toString(36).substr(2, 9),
                  tool: 'text',
                  color: toolColor,
                  size: toolSize,
                  points: [{ x: textInputPos.canvasX, y: textInputPos.canvasY }],
                  text: textInputValue,
                  fontFamily: useAnimStore.getState().textFontFamily
                });
              }
              setTextInputPos(null);
            }}
          />
          <div className="flex flex-col space-y-1 mt-2">
            <div className="flex items-center space-x-2">
              <button 
                onPointerDown={e => e.preventDefault()} // Keep focus in input, don't trigger blur
                onClick={() => {
                  if (textInputValue.trim() !== '') {
                    addStrokeToCurrentFrameAndLayer({
                      id: Math.random().toString(36).substr(2, 9),
                      tool: 'text',
                      color: toolColor,
                      size: toolSize,
                      points: [{ x: textInputPos.canvasX, y: textInputPos.canvasY }],
                      text: textInputValue,
                      fontFamily: useAnimStore.getState().textFontFamily
                    });
                  }
                  setTextInputPos(null);
                }}
                className="bg-[#3a86ff] hover:bg-[#2a76ef] text-white px-3 py-1.5 rounded flex items-center space-x-1 shadow-lg text-sm font-medium transition-colors"
              >
                <Check size={16} />
                <span>Apply</span>
              </button>
              <button 
                onPointerDown={e => {
                  e.preventDefault();
                  // Clears immediately so that if it DOES blur, it saves nothing.
                  setTextInputValue(""); 
                  setTextInputPos(null);
                }}
                className="bg-[#2a2a2a] hover:bg-[#333333] text-[#e0e0e0] px-3 py-1.5 rounded flex items-center space-x-1 shadow-lg text-sm font-medium transition-colors border border-[#333333]"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
            <div className="bg-[#1e1e1e]/90 text-[#909090] text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap border border-[#333333]">
              Press <strong className="text-white">Enter</strong> to apply, <strong className="text-white">ESC</strong> to cancel.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
