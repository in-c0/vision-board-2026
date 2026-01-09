"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MousePointer2, Move, Maximize, RotateCw, RefreshCw } from "lucide-react";

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("vision_board_onboarding_seen");
    if (!hasSeen) {
      // Small delay to let the app load first
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("vision_board_onboarding_seen", "true");
    }
    setIsOpen(false);
  };

  // Animation variants for the icons
  const float = {
    animate: { y: [0, -5, 0], transition: { duration: 2, repeat: Infinity } }
  };
  const click = {
    animate: { scale: [1, 0.9, 1], transition: { duration: 1.5, repeat: Infinity } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-100 flex justify-between items-center">
              <h2 className="font-serif text-lg text-stone-900 font-bold">Welcome to Studio</h2>
              <button onClick={handleClose} className="text-stone-400 hover:text-stone-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content Grid */}
            <div className="p-6 grid gap-6">
              
              {/* 1. Move & Interact */}
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <motion.div variants={float} animate="animate"><MousePointer2 size={20} /></motion.div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Move & Edit</h3>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    <span className="font-semibold text-stone-700">Click & Drag</span> any card to move it. 
                    Use the white handles to <span className="font-semibold text-stone-700">Rotate</span> or <span className="font-semibold text-stone-700">Resize</span>.
                  </p>
                </div>
              </div>

              {/* 2. Flip */}
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                  <motion.div 
                     animate={{ rotateY: [0, 180, 360] }} 
                     transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <RefreshCw size={20} />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Double Click to Flip</h3>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    Flip a card to access its <strong>Reflection Journal</strong>. The menu automatically switches tabs when you flip.
                  </p>
                </div>
              </div>

              {/* 3. Infinite Canvas */}
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                  <Move size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Infinite Canvas</h3>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    <span className="bg-stone-100 px-1 py-0.5 rounded border border-stone-200 font-mono text-[10px]">Middle Click</span> or <span className="bg-stone-100 px-1 py-0.5 rounded border border-stone-200 font-mono text-[10px]">Ctrl + Drag</span> to Pan.
                    <br/>
                    <span className="bg-stone-100 px-1 py-0.5 rounded border border-stone-200 font-mono text-[10px]">Ctrl + Scroll</span> to Zoom.
                  </p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                />
                <span className="text-xs text-stone-500">Don't show this again</span>
              </label>
              
              <button 
                onClick={handleClose}
                className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-stone-900/20"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}