"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    HelpCircle, X, Youtube, Mail, MessageCircle, Heart, ExternalLink,
    MousePointer2, Move, RefreshCw 
} from "lucide-react";

type Tab = 'what' | 'why' | 'how' | 'controls' | 'feedback';

export default function HelpModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('what');
  // Animation variants (Reused from Onboarding)
  const float = { animate: { y: [0, -5, 0], transition: { duration: 2, repeat: Infinity } } };

  // --- CONTENT CONFIGURATION ---
  const CONTENT = {
    what: {
      title: "What is this space?",
      body: (
        <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
          <p>
            <strong className="text-stone-900">This space is about creating your Vision Board.</strong>
          </p>
          <p>
            A Vision Board is a personalized roadmap that helps you clarify what you want and inspires you to take steps towards achieving it. It can be a collection of images, quotes, affirmations, and ideas.
          </p>
          <p>
            A great thing about making a vision board here (digitally) is you can also add images or even videos from Pinterest, or log in with your Google account to save histories so you can see how your vision evolves over time.
          </p>
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-800 font-medium">
               ✨ Plus, you can use templates and add-ons created by communities. For example, <span className="underline decoration-dotted cursor-help" title="Feature coming soon!">play clubhouse music and dance floor</span> to add flow to your vision board. (Trust me, it's gonna change how you think/feel about your future!)
            </p>
          </div>
        </div>
      )
    },
    why: {
      title: "Why should I do this?",
      body: (
        <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
          <p>
            Vision boards aren't magic, but they are <strong className="text-stone-900">evidence-based tools leveraging psychology</strong>: they use visualization (strengthening neural pathways), priming (making you notice opportunities), and repetition (reducing fear of new actions) to boost focus, motivation, and goal attainment.
          </p>
          <p>
            Similar to how athletes train mentally; success hinges on pairing the visuals with concrete action and aligning goals with your values, not just fantasy.
          </p>
          
          <div className="mt-6">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">The Science of Vision Boards</h4>
            <div className="grid gap-2">
                <VideoLink title="Neuroscience of Visualization (Dr. Tara Swart)" url="https://www.youtube.com/watch?v=id55BKWLZKM" duration="15 min" />
                <VideoLink title="Why Vision Boards Work (Mel Robbins)" url="https://youtu.be/ZJDOEFmTy0E?t=109" duration="10 min" />
                <VideoLink title="Quick Primer: Vision Board Psychology" url="https://youtube.com/shorts/h4XPNq5Y1Ks?si=UT3LlfHaDlZipDLn" duration="60 sec" />
            </div>
          </div>
        </div>
      )
    },
    how: {
      title: "How do I make a Vision Board?",
      body: (
        <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
          <p>
            There are a million different ways for creating a Vision Board. To find the one that works for you, we recommend trying out different templates — we provide four basic templates in the "Edit Card" menu.
          </p>
          
          <div className="pl-4 border-l-2 border-stone-200 space-y-2 my-4">
            <h4 className="font-serif text-stone-800 text-base">The Monthly Method</h4>
            <p className="text-xs">
                Instead of one giant yearly board, create a <strong>February Vision Board</strong>. Then, review how you went by creating a <strong>February Revision Board</strong>. This way you can compare how you went in reality vs. how you started out the vision.
            </p>
          </div>

          <p>
            Fill it up with actual photos and videos that you took and log your thoughts at the back of your card — this will become a great diary journal for you!
          </p>
          <p className="italic text-stone-500 text-xs">
              "Whether you end up with just one board or 24 boards a year, if you've found the one that works for you, you would be realizing your visions!"
          </p>
        </div>
      )
    },
    controls: {
        title: "Tutorial & Controls",
        body: (
            <div className="space-y-6">
                {/* 1. Move & Interact */}
                <div className="flex gap-4 items-start p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                        <motion.div variants={float} animate="animate"><MousePointer2 size={18} /></motion.div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-stone-900">Move & Edit</h3>
                        <p className="text-xs text-stone-500 leading-relaxed mt-1">
                            <strong className="text-stone-700">Click & Drag</strong> any card to move it. 
                            Use the white handles to <strong className="text-stone-700">Rotate</strong> or <strong className="text-stone-700">Resize</strong>.
                        </p>
                    </div>
                </div>

                {/* 2. Flip */}
                <div className="flex gap-4 items-start p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-purple-600 shrink-0 shadow-sm">
                        <motion.div animate={{ rotateY: [0, 180, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                            <RefreshCw size={18} />
                        </motion.div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-stone-900">Double Click to Flip</h3>
                        <p className="text-xs text-stone-500 leading-relaxed mt-1">
                            Flip a card to access its <strong className="text-stone-700">Reflection Journal</strong>. The right-click menu automatically switches tabs when you flip.
                        </p>
                    </div>
                </div>

                {/* 3. Infinite Canvas */}
                <div className="flex gap-4 items-start p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
                        <Move size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-stone-900">Infinite Canvas</h3>
                        <div className="mt-2 space-y-2">
                             <div className="flex items-center gap-2">
                                <span className="bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-[10px] text-stone-600 font-bold shadow-sm">Middle Click</span>
                                <span className="text-[10px] text-stone-400">or</span>
                                <span className="bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-[10px] text-stone-600 font-bold shadow-sm">Ctrl + Drag</span>
                                <span className="text-xs text-stone-600">= Pan View</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono text-[10px] text-stone-600 font-bold shadow-sm">Ctrl + Scroll</span>
                                <span className="text-xs text-stone-600">= Zoom In/Out</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    feedback: {
      title: "Feedback",
      body: (
        <div className="space-y-6 text-sm text-stone-600 leading-relaxed">
            <p>
                <strong>LifeOS Studio</strong> is evolving with the communities, and your feedback matters.
            </p>
            
            <div className="grid grid-cols-1 gap-3">
                <a href="#" className="flex items-center gap-3 p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-900 transition-colors border border-indigo-100">
                    <div className="p-2 bg-white rounded-md shadow-sm text-indigo-600"><MessageCircle size={18}/></div>
                    <div className="flex flex-col">
                        <span className="font-bold text-xs">Join Discord</span>
                        <span className="text-[10px] opacity-70">Community & Discussion</span>
                    </div>
                </a>
                <a href="mailto:hello@visionboard.co" className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-900 transition-colors border border-stone-200">
                    <div className="p-2 bg-white rounded-md shadow-sm text-stone-600"><Mail size={18}/></div>
                    <div className="flex flex-col">
                        <span className="font-bold text-xs">Email Us</span>
                        <span className="text-[10px] opacity-70">Bugs & Suggestions</span>
                    </div>
                </a>
            </div>

            <ul className="list-disc pl-5 space-y-1 text-xs text-stone-500">
                <li>Share what feels helpful or confusing</li>
                <li>Suggest features or templates</li>
                <li>Report bugs or friction</li>
                <li>Tell us what you wish existed</li>
            </ul>

            <div className="pt-4 border-t border-stone-100 text-center">
                <p className="flex items-center justify-center gap-1 text-xs font-serif italic text-stone-400">
                    Thank you for using our Vision Board <Heart size={10} className="fill-red-400 text-red-400" />
                </p>
            </div>
        </div>
      )
    }
  };

  return (
    <>
      {/* --- TRIGGER BUTTON --- */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-white/50 hover:bg-white border border-transparent hover:border-stone-200 rounded-full text-stone-500 hover:text-stone-800 transition-all shadow-sm backdrop-blur-sm"
        title="Help & Guide"
      >
        <HelpCircle size={16} />
        <span className="text-xs font-medium hidden sm:inline">Guide</span>
      </button>

      {/* --- MODAL --- */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
            />

            {/* Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-100 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                  <h2 className="font-serif text-lg text-stone-800">VisionBoard.co</h2>
                  <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors">
                      <X size={20} />
                  </button>
              </div>

              <div className="flex flex-col md:flex-row h-full overflow-hidden">
                  {/* SIDEBAR TABS */}
                  <div className="w-full md:w-48 bg-stone-50 border-r border-stone-100 flex flex-row md:flex-col p-2 gap-1 shrink-0 overflow-x-auto md:overflow-visible">
                      {(['what', 'why', 'how', 'controls', 'feedback'] as Tab[]).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all ${
                                activeTab === tab 
                                ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-900/5' 
                                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                            }`}
                          >
                              {tab}
                          </button>
                      ))}
                  </div>

                  {/* CONTENT AREA */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white scrollbar-thin scrollbar-thumb-stone-200">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                          <h3 className="text-xl font-serif text-stone-900 mb-6">
                              {CONTENT[activeTab].title}
                          </h3>
                          {CONTENT[activeTab].body}
                      </motion.div>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper for Video Links
function VideoLink({ title, url, duration }: { title: string, url: string, duration: string }) {
    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-stone-200 hover:border-red-200 hover:bg-red-50 group transition-all"
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                    <Youtube size={14} />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-stone-800 group-hover:text-red-900">{title}</span>
                    <span className="text-[10px] text-stone-400 group-hover:text-red-700/60">Watch on YouTube • {duration}</span>
                </div>
            </div>
            <ExternalLink size={12} className="text-stone-300 group-hover:text-red-400" />
        </a>
    );
}