import { useAnimStore } from '../store/animStore';
import { X, ChevronRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';

const TUTORIAL_STEPS = [
  {
    target: null, // Center
    title: "Welcome to AnimaStudio Pro!",
    content: "Let's learn the fundamentals of frame-by-frame animation. This tutorial will walk you through creating your first moving drawing.",
    position: 'center'
  },
  {
    target: '.tutorial-step-tools',
    title: "1. The Toolbar",
    content: "Select the Brush tool. Pick your favorite color. This is your main drawing arsenal.",
    position: 'right'
  },
  {
    target: '.tutorial-step-canvas',
    title: "2. The Canvas workspace",
    content: "Tap or click and drag here to draw your first starting shape! E.g. A small ball on the left side.",
    position: 'bottom'
  },
  {
    target: '.tutorial-step-add-frame',
    title: "3. Expand the Timeline",
    content: "Click this 'Add' button to create a brand new empty frame to continue your animation.",
    position: 'top-left'
  },
  {
    target: '.tutorial-step-onion:not(svg)', // Just matching the button text easily
    title: "4. Onion Skinning",
    content: "Turn ON Onion Skin. This will show a faint, ghosted version of your previous frame, allowing you to trace and move your next drawing slightly forward.",
    position: 'top'
  },
  {
    target: '.tutorial-step-canvas',
    title: "5. Draw the next frame",
    content: "Draw the shape slightly moved from the fainter 'ghost' shape. Repeat the Add Frame + Draw process a few times!",
    position: 'bottom'
  },
  {
    target: '.tutorial-step-play',
    title: "6. Playback",
    content: "You've made keyframes! Push the Play button to watch your drawings interpolate through time as an animation.",
    position: 'bottom'
  },
  {
    target: '.tutorial-step-presets',
    title: "7. Presets (Bonus!)",
    content: "Don't want to draw every frame? Click 'Presets' while targeting a layer to auto-transform a drawing across multiple frames automatically.",
    position: 'bottom-right'
  }
];

export function TutorialOverlay() {
  const { tutorialStep, setTutorialStep } = useAnimStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const activeStep = tutorialStep - 1; // 1-based index to 0-based
  const stepInfo = TUTORIAL_STEPS[activeStep];

  useEffect(() => {
    if (!stepInfo) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      if (stepInfo.target) {
        // Find the element
        const el = document.querySelector(stepInfo.target);
        if (el) {
          setTargetRect(el.getBoundingClientRect());
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    // Poll just in case UI mutates
    const interval = setInterval(updateRect, 500);

    return () => {
      window.removeEventListener('resize', updateRect);
      clearInterval(interval);
    };
  }, [stepInfo]);

  if (tutorialStep === 0 || !stepInfo) return null;

  const getOverlayStyle = () => {
    if (!targetRect || stepInfo.position === 'center') {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const PADDING = 16;
    let top = 0;
    let left = 0;

    switch (stepInfo.position) {
      case 'right':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + PADDING;
        return { top, left, transform: 'translateY(-50%)' };
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - PADDING;
        return { top, left, transform: 'translate(-100%, -50%)' };
      case 'bottom':
        top = targetRect.bottom + PADDING;
        left = targetRect.left + targetRect.width / 2;
        return { top, left, transform: 'translateX(-50%)' };
      case 'bottom-right':
        top = targetRect.bottom + PADDING;
        left = targetRect.right;
        return { top, left, transform: 'translateX(-100%)' };
      case 'top':
        top = targetRect.top - PADDING;
        left = targetRect.left + targetRect.width / 2;
        return { top, left, transform: 'translate(-50%, -100%)' };
      case 'top-left':
        top = targetRect.top - PADDING;
        left = targetRect.left;
        return { top, left, transform: 'translateY(-100%)' };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Darken background slightly if there's no target */}
      {!stepInfo.target && (
        <div className="absolute inset-0 bg-black/40 pointer-events-auto backdrop-blur-sm" />
      )}
      
      {/* Target Highlight Ring */}
      {stepInfo.target && targetRect && (
        <div 
          className="absolute border-2 border-[#3a86ff] rounded-[8px] animate-pulse pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] bg-transparent"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            transition: 'all 0.3s ease-out'
          }}
        />
      )}

      {/* Popover Box */}
      <div 
        className="absolute bg-[#1e1e1e] border border-[#333333] shadow-2xl rounded-xl p-5 w-80 text-[#e0e0e0] pointer-events-auto transition-all duration-300 z-[101]"
        style={getOverlayStyle()}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-[#e0e0e0] text-sm flex items-center">
            {stepInfo.title}
          </h3>
          <button 
            onClick={() => setTutorialStep(0)}
            className="text-[#909090] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <p className="text-xs text-[#909090] leading-relaxed mb-5">
          {stepInfo.content}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#333333]">
          <span className="text-[10px] font-bold tracking-widest text-[#909090] uppercase">
            Step {tutorialStep} of {TUTORIAL_STEPS.length}
          </span>
          <button
            onClick={() => {
              if (tutorialStep >= TUTORIAL_STEPS.length) {
                setTutorialStep(0);
              } else {
                setTutorialStep(tutorialStep + 1);
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#3a86ff] hover:bg-blue-500 rounded text-xs font-bold text-white transition-colors"
          >
            <span>{tutorialStep >= TUTORIAL_STEPS.length ? 'Finish' : 'Next'}</span>
            {tutorialStep >= TUTORIAL_STEPS.length ? <Check size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
