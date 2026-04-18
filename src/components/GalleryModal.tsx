import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAnimStore, SavedProject, Stroke, LayerDef } from '../store/animStore';
import { X, Play, Trash2, FolderPen } from 'lucide-react';
import getStroke from 'perfect-freehand';

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

// Mini preview canvas for the project thumbnail
function ProjectThumbnail({ project, isHovered }: { project: SavedProject; isHovered: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Animation Loop
  useEffect(() => {
    if (!isHovered) {
      setCurrentFrame(0);
      return;
    }
    
    let f = 0;
    const interval = setInterval(() => {
      f++;
      setCurrentFrame(f % project.frames.length);
    }, 1000 / (project.fps || 12));
    
    return () => clearInterval(interval);
  }, [isHovered, project.frames.length, project.fps]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed internal size to easily scale down to thumbnail
    const thumbWidth = 240;
    const thumbHeight = 180;

    ctx.clearRect(0, 0, thumbWidth, thumbHeight);
    
    // Scale logic
    const scaleX = thumbWidth / project.width;
    const scaleY = thumbHeight / project.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Center logic
    const offsetX = (thumbWidth - project.width * scale) / 2;
    const offsetY = (thumbHeight - project.height * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStroke = (stroke: Stroke, opacity: number) => {
      if (!stroke.points || stroke.points.length === 0) return;
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
        }
        ctx.stroke();
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

    const frame = project.frames[currentFrame];
    if (frame) {
      project.layers.forEach(layer => {
        if (!layer.visible) return;
        const strokes = frame.layerData[layer.id] || [];
        strokes.forEach(s => drawStroke(s, layer.opacity));
      });
    }

    ctx.restore();
  }, [currentFrame, project]);

  return (
    <div className="w-[240px] h-[180px] bg-white rounded-t-lg overflow-hidden relative flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={240} 
        height={180} 
        className="w-full h-full object-contain"
      />
      {!isHovered && project.frames.length > 1 && (
         <div className="absolute top-2 right-2 bg-black/50 text-white rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide backdrop-blur-sm flex items-center shadow-sm">
           <Play size={10} className="mr-1" />
           {project.frames.length}
         </div>
      )}
    </div>
  );
}

export function GalleryModal({ onClose }: { onClose: () => void }) {
  const { loadProject, setProjectName, saveToGallery, projectId, projectName } = useAnimStore();
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('anima_projects') || '[]');
      setSavedProjects(data.sort((a: any, b: any) => b.updatedAt - a.updatedAt));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project permanently?")) {
      const filtered = savedProjects.filter(p => p.id !== id);
      localStorage.setItem('anima_projects', JSON.stringify(filtered));
      setSavedProjects(filtered);
    }
  };

  const currentSaveAction = () => {
    saveToGallery();
    // refresh list
    try {
      const data = JSON.parse(localStorage.getItem('anima_projects') || '[]');
      setSavedProjects(data.sort((a: any, b: any) => b.updatedAt - a.updatedAt));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className="bg-[#1e1e1e] border border-[#333333] rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333333] bg-[#2a2a2a]/30 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[#e0e0e0]">Local Gallery</h2>
            <p className="text-[#909090] text-sm mt-1">Browse and manage projects saved to your browser.</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#909090] hover:text-white rounded-lg hover:bg-[#333333] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#121212]">
          
          <div className="mb-8 flex items-center justify-between bg-[#1e1e1e] p-4 rounded-xl border border-[#3a86ff]/30 shadow-lg">
            <div className="flex-1 mr-6">
              <label className="text-xs font-bold text-[#3a86ff] uppercase tracking-wider mb-2 block">Current Workspace Sync</label>
              <div className="flex items-center space-x-3">
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-[#121212] border border-[#333333] text-[#e0e0e0] px-3 py-2 rounded-lg w-64 text-sm focus:outline-none focus:border-[#3a86ff] transition-colors"
                  placeholder="Project Name"
                />
                <button 
                  onClick={currentSaveAction}
                  className="px-4 py-2 bg-[#3a86ff] hover:bg-blue-500 text-white font-bold rounded-lg text-sm shadow-sm transition-colors flex items-center"
                >
                  <FolderPen size={16} className="mr-2" />
                  Save / Update Current Project
                </button>
              </div>
            </div>
            <div className="text-right text-xs text-[#909090] hidden sm:block">
              Saved strictly to your <br /> local browser storage.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {savedProjects.length === 0 ? (
              <div className="col-span-full py-12 text-center text-[#909090] flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-4 text-[#333333]">
                  <FolderPen size={32} />
                </div>
                <p>No projects saved to the gallery yet.</p>
              </div>
            ) : (
              savedProjects.map(project => (
                <div 
                  key={project.id}
                  onMouseEnter={() => setHoveredId(project.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    loadProject(project);
                    onClose();
                  }}
                  className={`flex flex-col bg-[#1e1e1e] border rounded-lg overflow-hidden cursor-pointer shadow-md transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl ${
                    project.id === projectId ? 'border-[#3a86ff] ring-1 ring-[#3a86ff]' : 'border-[#333333] hover:border-[#4a4a4a]'
                  }`}
                >
                  <ProjectThumbnail project={project} isHovered={hoveredId === project.id} />
                  <div className="p-4 flex flex-col items-start justify-between relative">
                    <h3 className="font-bold text-[#e0e0e0] text-sm truncate w-full pr-8" title={project.name}>{project.name}</h3>
                    <p className="text-xs text-[#909090] mt-1">
                      {new Date(project.updatedAt).toLocaleDateString()} at {new Date(project.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    <button 
                      onClick={(e) => handleDelete(project.id, e)}
                      className="absolute right-3 top-4 p-1.5 text-[#909090] hover:bg-[#333333] hover:text-[#ff4757] rounded transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
