import { create } from 'zustand';

export type ToolType = 'brush' | 'pencil' | 'eraser' | 'shape' | 'fill' | 'text';
export type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'triangle' | 'diamond' | 'star';

export interface Stroke {
  id: string;
  tool: ToolType;
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  size: number;
  shapeType?: ShapeType;
  rasterDataUrl?: string;
  rasterBounds?: { x: number; y: number; w: number; h: number };
  text?: string;
  fontFamily?: string;
}

export interface LayerDef {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}

export interface Frame {
  id: string;
  layerData: Record<string, Stroke[]>;
}

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
  fps: number;
  width: number;
  height: number;
  layers: LayerDef[];
  frames: Frame[];
}

interface AnimState {
  // Project Settings
  projectId: string;
  projectName: string;
  fps: number;
  width: number;
  height: number;
  onionSkinEnabled: boolean;
  onionSkinFrames: number;

  // Data
  layers: LayerDef[];
  frames: Frame[];

  // Current State
  currentFrameIndex: number;
  currentLayerId: string | null;
  selectedTool: ToolType;
  selectedShape: ShapeType;
  toolColor: string;
  toolSize: number;
  textFontFamily: string;
  isPlaying: boolean;
  redoStack: Record<string, Stroke[]>;

  // Actions
  setProjectName: (name: string) => void;
  loadProject: (project: SavedProject) => void;
  saveToGallery: () => void;

  addFrame: (index?: number) => void;
  deleteFrame: (index: number) => void;
  duplicateFrame: (index: number) => void;
  setCurrentFrame: (index: number) => void;
  
  addLayer: () => void;
  deleteLayer: (id: string) => void;
  setCurrentLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<LayerDef>) => void;
  
  setTool: (tool: ToolType) => void;
  setShape: (shape: ShapeType) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setTextFontFamily: (font: string) => void;
  
  addStrokeToCurrentFrameAndLayer: (stroke: Stroke) => void;
  undoLastStroke: () => void;
  redoLastStroke: () => void;
  clearCurrentFrameAndLayer: () => void;

  togglePlayback: () => void;
  toggleOnionSkin: () => void;
  setOnionSkinFrames: (frames: number) => void;

  // Tutorial
  tutorialStep: number;
  setTutorialStep: (step: number) => void;

  // Presets
  applyPresetToLayer: (presetType: string, numFrames: number, params: any) => void;
  interpolateFrames: (startIndex: number, endIndex: number, numIntermediate: number) => void;

  // Modals
  isTransformModalOpen: boolean;
  setTransformModalOpen: (open: boolean) => void;
  isGalleryModalOpen: boolean;
  setGalleryModalOpen: (open: boolean) => void;
  isColorPickerModalOpen: boolean;
  setColorPickerModalOpen: (open: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialLayerId = generateId();

export const useAnimStore = create<AnimState>((set, get) => ({
  projectId: generateId(),
  projectName: 'Untitled Animation',
  fps: 12,
  width: 800,
  height: 600,
  onionSkinEnabled: true,
  onionSkinFrames: 2,

  layers: [
    { id: initialLayerId, name: 'Layer 1', visible: true, opacity: 1 }
  ],
  frames: [
    { id: generateId(), layerData: { [initialLayerId]: [] } }
  ],

  currentFrameIndex: 0,
  currentLayerId: initialLayerId,
  selectedTool: 'brush',
  selectedShape: 'rectangle',
  toolColor: '#000000',
  toolSize: 5,
  textFontFamily: 'Inter',
  isPlaying: false,
  redoStack: {},
  tutorialStep: 0,
  isTransformModalOpen: false,
  isGalleryModalOpen: false,
  isColorPickerModalOpen: false,

  setProjectName: (name) => set({ projectName: name }),
  
  loadProject: (project) => set({
    projectId: project.id,
    projectName: project.name,
    fps: project.fps,
    width: project.width,
    height: project.height,
    layers: project.layers,
    frames: project.frames,
    currentFrameIndex: 0,
    currentLayerId: project.layers[0]?.id || null,
  }),

  saveToGallery: () => {
    const state = get();
    try {
      const projects: SavedProject[] = JSON.parse(localStorage.getItem('anima_projects') || '[]');
      const savedProject: SavedProject = {
        id: state.projectId,
        name: state.projectName,
        updatedAt: Date.now(),
        fps: state.fps,
        width: state.width,
        height: state.height,
        layers: state.layers,
        frames: state.frames,
      };

      const existingIndex = projects.findIndex(p => p.id === state.projectId);
      if (existingIndex >= 0) {
        projects[existingIndex] = savedProject;
      } else {
        projects.push(savedProject);
      }
      
      localStorage.setItem('anima_projects', JSON.stringify(projects));
    } catch (e) {
      console.warn("Failed to save to local gallery:", e);
    }
  },

  addFrame: (index) => set((state) => {
    const newFrames = [...state.frames];
    const newFrame = { id: generateId(), layerData: {} };
    // Initialize empty layers for the new frame based on existing layers
    state.layers.forEach(l => { newFrame.layerData[l.id] = []; });
    
    if (index !== undefined) {
      newFrames.splice(index, 0, newFrame);
    } else {
      newFrames.push(newFrame);
    }
    return { frames: newFrames, currentFrameIndex: index !== undefined ? index : newFrames.length - 1 };
  }),

  deleteFrame: (index) => set((state) => {
    if (state.frames.length <= 1) return state;
    const newFrames = state.frames.filter((_, i) => i !== index);
    const newIndex = Math.min(state.currentFrameIndex, newFrames.length - 1);
    return { frames: newFrames, currentFrameIndex: newIndex };
  }),

  duplicateFrame: (index) => set((state) => {
    const frameToDuplicate = state.frames[index];
    const newFrame: Frame = {
      id: generateId(),
      layerData: JSON.parse(JSON.stringify(frameToDuplicate.layerData)) // Deep copy strokes
    };
    const newFrames = [...state.frames];
    newFrames.splice(index + 1, 0, newFrame);
    return { frames: newFrames, currentFrameIndex: index + 1 };
  }),

  setCurrentFrame: (index) => set({ currentFrameIndex: index }),

  addLayer: () => set((state) => {
    const newLayerId = generateId();
    const newLayer: LayerDef = { id: newLayerId, name: `Layer ${state.layers.length + 1}`, visible: true, opacity: 1 };
    
    // Add this layer to all existing frames
    const newFrames = state.frames.map(frame => ({
      ...frame,
      layerData: { ...frame.layerData, [newLayerId]: [] }
    }));

    return {
      layers: [newLayer, ...state.layers],
      frames: newFrames,
      currentLayerId: newLayerId
    };
  }),

  deleteLayer: (id) => set((state) => {
    if (state.layers.length <= 1) return state;
    const newLayers = state.layers.filter(l => l.id !== id);
    const currLayerId = state.currentLayerId === id ? newLayers[0].id : state.currentLayerId;
    return { layers: newLayers, currentLayerId: currLayerId };
  }),

  setCurrentLayer: (id) => set({ currentLayerId: id }),

  updateLayer: (id, updates) => set((state) => ({
    layers: state.layers.map(l => l.id === id ? { ...l, ...updates } : l)
  })),

  setTool: (tool) => set({ selectedTool: tool }),
  setShape: (shape) => set({ selectedShape: shape }),
  setColor: (color) => set({ toolColor: color }),
  setSize: (size) => set({ toolSize: size }),
  setTextFontFamily: (font) => set({ textFontFamily: font }),

  addStrokeToCurrentFrameAndLayer: (stroke) => set((state) => {
    if (!state.currentLayerId) return state;
    
    const frame = state.frames[state.currentFrameIndex];
    if (!frame) return state;

    const layerStrokes = frame.layerData[state.currentLayerId] || [];
    
    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = {
      ...frame,
      layerData: {
        ...frame.layerData,
        [state.currentLayerId]: [...layerStrokes, stroke]
      }
    };
    
    const stackKey = `${frame.id}-${state.currentLayerId}`;
    
    return { 
      frames: newFrames,
      redoStack: {
        ...state.redoStack,
        [stackKey]: []
      }
    };
  }),

  undoLastStroke: () => set((state) => {
    if (!state.currentLayerId) return state;
    
    const frame = state.frames[state.currentFrameIndex];
    if (!frame) return state;

    const layerStrokes = frame.layerData[state.currentLayerId] || [];
    if (layerStrokes.length === 0) return state;

    const strokeToUndo = layerStrokes[layerStrokes.length - 1];

    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = {
      ...frame,
      layerData: {
        ...frame.layerData,
        [state.currentLayerId]: layerStrokes.slice(0, -1)
      }
    };

    const stackKey = `${frame.id}-${state.currentLayerId}`;

    return { 
      frames: newFrames,
      redoStack: {
        ...state.redoStack,
        [stackKey]: [...(state.redoStack[stackKey] || []), strokeToUndo]
      }
    };
  }),

  redoLastStroke: () => set((state) => {
    if (!state.currentLayerId) return state;
    
    const frame = state.frames[state.currentFrameIndex];
    if (!frame) return state;

    const stackKey = `${frame.id}-${state.currentLayerId}`;
    const layerRedos = state.redoStack[stackKey] || [];
    if (layerRedos.length === 0) return state;
    
    const strokeToRedo = layerRedos[layerRedos.length - 1];
    
    const layerStrokes = frame.layerData[state.currentLayerId] || [];
    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = {
      ...frame,
      layerData: {
        ...frame.layerData,
        [state.currentLayerId]: [...layerStrokes, strokeToRedo]
      }
    };
    
    return {
      frames: newFrames,
      redoStack: {
        ...state.redoStack,
        [stackKey]: layerRedos.slice(0, -1)
      }
    };
  }),

  clearCurrentFrameAndLayer: () => set((state) => {
    if (!state.currentLayerId) return state;
    const frame = state.frames[state.currentFrameIndex];
    if (!frame) return state;
    
    const newFrames = [...state.frames];
    newFrames[state.currentFrameIndex] = {
      ...frame,
      layerData: {
        ...frame.layerData,
        [state.currentLayerId]: []
      }
    };
    return { frames: newFrames };
  }),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  toggleOnionSkin: () => set((state) => ({ onionSkinEnabled: !state.onionSkinEnabled })),
  setOnionSkinFrames: (num) => set({ onionSkinFrames: num }),

  setTutorialStep: (step) => set({ tutorialStep: step }),

  setTransformModalOpen: (open) => set({ isTransformModalOpen: open }),
  setGalleryModalOpen: (open) => set({ isGalleryModalOpen: open }),
  setColorPickerModalOpen: (open) => set({ isColorPickerModalOpen: open }),

  applyPresetToLayer: (presetType, numFrames, params) => set((state) => {
    if (!state.currentLayerId || state.frames.length === 0) return state;
    
    const layerId = state.currentLayerId;
    const startIndex = state.currentFrameIndex;
    const baseFrame = state.frames[startIndex];
    const baseStrokes = baseFrame.layerData[layerId] || [];

    if (baseStrokes.length === 0) return state;

    // Calculate bounding box center of strokes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    baseStrokes.forEach(s => s.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const newFrames = [...state.frames];

    for (let i = 1; i <= numFrames; i++) {
      const t = i / numFrames; // Normalized time (0 to 1)

      // Transform strokes based on preset
      const transformedStrokes = baseStrokes.map(stroke => {
        const newPoints = stroke.points.map(p => {
          let nx = p.x;
          let ny = p.y;

          if (presetType === 'slideRight') {
            const distance = params?.distance || 200;
            nx = p.x + (distance * t);
          } else if (presetType === 'slideLeft') {
            const distance = params?.distance || 200;
            nx = p.x - (distance * t);
          } else if (presetType === 'bounce') {
            const height = params?.height || 100;
            const bounces = params?.bounces || 3;
            const bounceY = Math.abs(Math.cos(t * Math.PI * bounces)) * height * (1 - t);
            ny = p.y - bounceY;
          } else if (presetType === 'grow') {
            const scale = t; 
            nx = cx + (p.x - cx) * scale;
            ny = cy + (p.y - cy) * scale;
          } else if (presetType === 'shrink') {
            const scale = 1 - t; 
            nx = cx + (p.x - cx) * scale;
            ny = cy + (p.y - cy) * scale;
          } else if (presetType === 'spin') {
            const rotations = params?.rotations || 1;
            const angle = t * Math.PI * 2 * rotations;
            const dx = p.x - cx;
            const dy = p.y - cy;
            nx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
            ny = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
          }

          return { ...p, x: nx, y: ny };
        });
        return { ...stroke, id: generateId(), points: newPoints };
      });

      // Insert or update frame
      const targetIndex = startIndex + i;
      if (targetIndex < newFrames.length) {
        // Merge into existing frame
        newFrames[targetIndex] = {
          ...newFrames[targetIndex],
          layerData: {
            ...newFrames[targetIndex].layerData,
            [layerId]: transformedStrokes
          }
        };
      } else {
        // Create new frame
        const newFrame = { id: generateId(), layerData: {} as Record<string, Stroke[]> };
        state.layers.forEach(l => { newFrame.layerData[l.id] = l.id === layerId ? transformedStrokes : []; });
        newFrames.push(newFrame);
      }
    }

    return { frames: newFrames, currentFrameIndex: startIndex + numFrames };
  }),

  interpolateFrames: (startIndex, endIndex, numIntermediate) => set((state) => {
    const layerId = state.currentLayerId;
    if (!layerId) return state;

    const startFrame = state.frames[startIndex];
    const endFrame = state.frames[endIndex];
    if (!startFrame || !endFrame) return state;

    const startStrokes = startFrame.layerData[layerId] || [];
    const endStrokes = endFrame.layerData[layerId] || [];

    if (startStrokes.length !== endStrokes.length || startStrokes.length === 0) {
      alert("Interpolation requires the same number of strokes in both the Start Frame and End Frame.");
      return state;
    }

    const newFrames = [...state.frames];
    const insertedFrames: Frame[] = [];

    // Precalculate interpolated frames
    for (let i = 1; i <= numIntermediate; i++) {
      const t = i / (numIntermediate + 1); // 0 < t < 1
      
      const interpolatedStrokes = startStrokes.map((sStroke, strokeIdx) => {
        const eStroke = endStrokes[strokeIdx];
        
        // We will interpolate the points array by sampling the lengths uniformly, or just linearly if point count matches exactly.
        // For simplicity, let's normalize both stroke paths to identical number of points if they differ, or map proportionally.
        const maxPts = Math.max(sStroke.points.length, eStroke.points.length);
        
        const getPt = (stroke: Stroke, idx: number, max: number) => {
          if (stroke.points.length === 0) return { x: 0, y: 0, pressure: 0.5 };
          const pIdx = Math.floor((idx / (max - 1 || 1)) * (stroke.points.length - 1));
          return stroke.points[pIdx];
        };

        const newPoints = Array.from({ length: maxPts }).map((_, ptIdx) => {
          const sp = getPt(sStroke, ptIdx, maxPts);
          const ep = getPt(eStroke, ptIdx, maxPts);
          return {
            x: sp.x + (ep.x - sp.x) * t,
            y: sp.y + (ep.y - sp.y) * t,
            pressure: (sp.pressure || 0.5) + ((ep.pressure || 0.5) - (sp.pressure || 0.5)) * t
          };
        });

        // Interpolate colors? (Simple toggle/snap at t > 0.5, or proper RGB mix)
        // Keep it simple and stick to start color or mix if we wanted, let's snap at half-way
        const newColor = t < 0.5 ? sStroke.color : eStroke.color;

        return { 
          ...sStroke, 
          id: generateId(), 
          points: newPoints,
          color: newColor,
          size: sStroke.size + (eStroke.size - sStroke.size) * t
        };
      });

      const newFrameId = generateId();
      const newFrameLayerData: Record<string, Stroke[]> = {};
      
      // Keep empty arrays for other layers
      state.layers.forEach(l => {
         newFrameLayerData[l.id] = l.id === layerId ? interpolatedStrokes : [];
      });

      insertedFrames.push({ id: newFrameId, layerData: newFrameLayerData });
    }

    // Splice inserted frames between start and end index (note end index is now shifting right!)
    newFrames.splice(startIndex + 1, 0, ...insertedFrames);

    return { frames: newFrames, currentFrameIndex: startIndex + 1 };
  })
}));
