"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitCommit, ScrollText } from "lucide-react";

// --- CHANGELOG DATA ---
const CHANGELOG = [
  {
    version: "v0.8.0",
    date: "Jan 18, 2026",
    title: "ViBo Rebrand & Cloud History",
    description: "Major stability overhaul. We moved the 'Time Travel' history from your browser to the Cloud, preventing crashes and allowing cross-device undo.",
    features: [
      "Cloud History: History snapshots are now stored in the database (last 20 versions), removing the 5MB browser limit.",
      "ViBo Branding: Renamed to ViBo with a polished loading screen and logo integration.",
      "Crash Protection: Added image size limits (2MB) and 'Spam-Save' locks to prevent network congestion.",
      "Mobile Zen: Added 'touch-none' support so you can drag cards on mobile without scrolling the entire page.",
      "Guest Mode: Added clear warning banners for unauthenticated users."
    ]
  },
  {
    version: "v0.06",
    date: "Jan 08, 2026",
    title: "Infinite Canvas & Onboarding",
    description: "The board is no longer static. You can now explore an infinite space to map your vision.",
    features: [
      "Pan & Zoom: Hold Ctrl and scroll to zoom. Middle-click (or Ctrl+Click) and drag to pan around.",
      "Smart Spawn: New cards now appear near the center of your current view, respecting your zoom level.",
      "Onboarding: A new visual guide welcomes first-time users, explaining the hidden power features.",
      "Persistence: Zoom level and pan position are reset on reload to keep things centered (for now)."
    ]
  },
  {
    version: "v0.05",
    date: "Jan 03, 2026",
    title: "Context-Aware Interaction",
    description: "The interface now anticipates your intent. Menus automatically open to the correct tab based on whether you are facing the image or the reflection.",
    features: [
      "Smart Tabs: Right-clicking the back of a card immediately opens the 'Backside' templates menu.",
      "Auto-Switch: Flipping a card while the menu is open automatically toggles between 'Visuals' and 'Backside' tools.",
      "Focus Mode: Interacting with a new card or the background automatically closes any open edit menus, keeping your workspace clean."
    ]
  },
  {
    version: "v0.04",
    date: "Jan 02, 2026",
    title: "Cloud Sync (Beta)",
    description: "Your vision board now lives in the cloud. Seamlessly switch between local drafts and secure cloud storage.",
    features: [
      "Database Integration: Connected Prisma ORM with Supabase PostgreSQL for robust data storage.",
      "Hybrid Sync Engine: Automatically switches between Local Storage (Offline) and Cloud Database (Online).",
      "Timestamped Saves: The 'Saved' indicator now reflects the exact time your data hit the server.",
      "Conflict Resolution: Cloud data takes precedence on login, ensuring you always see your cross-device source of truth."
    ]
  },
  {
    version: "v0.03",
    date: "Jan 01, 2026",
    title: "Identity & Sync (Authentication)",
    description: "Added secure Google Login to prepare for multi-device syncing. The board now actively monitors your connection status.",
    features: [
      "Google OAuth: Secure login infrastructure using NextAuth.js.",
      "Smart Nudge: Unobtrusive popups remind you to log in when data is saved locally.",
      "User Profile: Top bar now displays your avatar and name when connected.",
      "Safety Checks: Auto-save detects if you are relying on cache vs. cloud (cloud sync pipeline ready)."
    ]
  },
  {
    version: "v0.02",
    date: "Dec 31, 2025",
    title: "Persistence & Time Travel",
    description: "Introduced local storage caching so you never lose your flow. The board now remembers exactly where you left off.",
    features: [
      "Auto-Save: Board state saves automatically every 30 seconds if changes are detected.",
      "Local History: Restore previous versions of your board from the 'Saved at...' dropdown.",
      "Image Persistence: Uploaded images are now converted to Base64, so they survive browser refreshes.",
      "Smart Restore: The board automatically loads your last session when you open the app."
    ]
  },
  {
    version: "v0.01",
    date: "Dec 30, 2025",
    title: "The Foundation (MVP)",
    description: "Initial release of the infinite vision board. Focused on tactile interactions, media fetching, and structured coaching templates.",
    features: [
      "Infinite Canvas: A cozy, drag-and-pan workspace.",
      "Smart Cards: 3D flip interactions with 'What You See Is What You Edit' logic.",
      "Media Engine: Pinterest video/image unfurling & local drag-and-drop uploads.",
      "Visual Editor: Draggable menu for opacity, fonts, z-index layering, and colors.",
      "Backside Templates: 4 Built-in coaching frameworks (Identity, Environment, Community, Habit).",
      "UX Polish: High-contrast inputs, draggable windows, and smooth physics."
    ]
  }
];

export default function VersionFooter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* --- FOOTER BADGE --- */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md border border-stone-200 rounded-full shadow-sm hover:shadow-md hover:border-stone-300 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-mono font-medium text-stone-600 group-hover:text-stone-900">
            {CHANGELOG[0].version}
          </span>
        </button>
      </div>

      {/* --- CHANGELOG MODAL --- */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
            />

            {/* Modal Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-100 max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-stone-200 rounded-lg text-stone-600">
                    <ScrollText size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-800">Update Log</h2>
                    <p className="text-[10px] text-stone-500 font-medium">ViBo History</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto">
                <div className="relative border-l border-stone-200 ml-3 space-y-8">
                  {CHANGELOG.map((log, index) => (
                    <div key={index} className="relative pl-8">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${index === 0 ? 'bg-blue-600' : 'bg-stone-300'}`} />
                      
                      <div className="flex flex-col gap-1 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold px-2 py-0.5 rounded text-mono ${index === 0 ? 'bg-blue-50 text-blue-900' : 'bg-stone-100 text-stone-900'}`}>
                            {log.version}
                          </span>
                          <span className="text-xs text-stone-400 font-medium">
                            {log.date}
                          </span>
                        </div>
                        <h3 className="text-base font-serif italic text-stone-800">
                          {log.title}
                        </h3>
                      </div>

                      <p className="text-xs text-stone-500 leading-relaxed mb-4">
                        {log.description}
                      </p>

                      <ul className="space-y-2">
                        {log.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-stone-700">
                            <GitCommit size={14} className="mt-0.5 shrink-0 text-stone-300" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer CTA */}
              <div className="p-4 bg-stone-50 border-t border-stone-100 text-center">
                <p className="text-[10px] text-stone-400">
                   ViBo v0.8.0 • Building in Public
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}