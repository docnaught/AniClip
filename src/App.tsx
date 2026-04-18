/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Toolbar } from './components/Toolbar';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { Timeline } from './components/Timeline';
import { LayerPanel } from './components/LayerPanel';
import { Topbar } from './components/Topbar';
import { TutorialOverlay } from './components/TutorialOverlay';
import { TransformModal } from './components/TransformModal';
import { GalleryModal } from './components/GalleryModal';
import { ColorPickerModal } from './components/ColorPickerModal';
import { useAnimStore } from './store/animStore';

export default function App() {
  const isTransformModalOpen = useAnimStore(state => state.isTransformModalOpen);
  const setTransformModalOpen = useAnimStore(state => state.setTransformModalOpen);
  
  const isGalleryModalOpen = useAnimStore(state => state.isGalleryModalOpen);
  const setGalleryModalOpen = useAnimStore(state => state.setGalleryModalOpen);

  const isColorPickerModalOpen = useAnimStore(state => state.isColorPickerModalOpen);
  const setColorPickerModalOpen = useAnimStore(state => state.setColorPickerModalOpen);

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-[#e0e0e0] overflow-hidden font-sans">
      <Topbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        
        <main className="flex-1 flex flex-col bg-[#121212] relative overflow-hidden">
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <CanvasWorkspace />
          </div>
          <Timeline />
        </main>
        
        <LayerPanel />
      </div>

      <TutorialOverlay />
      {isTransformModalOpen && (
        <TransformModal onClose={() => setTransformModalOpen(false)} />
      )}
      {isGalleryModalOpen && (
        <GalleryModal onClose={() => setGalleryModalOpen(false)} />
      )}
      {isColorPickerModalOpen && (
        <ColorPickerModal onClose={() => setColorPickerModalOpen(false)} />
      )}
    </div>
  );
}
