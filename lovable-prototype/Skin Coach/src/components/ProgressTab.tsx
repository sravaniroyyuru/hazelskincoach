import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ChevronLeft, ChevronRight, TrendingUp as TrendIcon, Target, Brain, Lightbulb, ImageIcon, Maximize2 } from "lucide-react";
import PhotoProgressGallery from "@/components/PhotoProgressGallery";
import SkinPhotoCapture from "@/components/SkinPhotoCapture";


interface ProgressTabProps {
  userName: string;
}

const weeklyCards = [
  {
    id: "trend",
    icon: TrendIcon,
    title: "This Week's Trend",
    badge: "Stable",
    badgeColor: "bg-sage/40 text-sage-deep",
    content: "Your skin feel reports have been steady all week. No major shifts — which is exactly the kind of stability we want to build on. Consistency is doing its quiet work.",
    emoji: "🌿",
  },
  {
    id: "consistency",
    icon: Target,
    title: "Routine Consistency",
    badge: "5/7 days",
    badgeColor: "bg-primary/10 text-primary",
    content: "AM routine: 86%\nPM routine: 71%\nBest streak: 4 days\n\nYou showed up most days this week. That matters.",
    emoji: "🎯",
  },
  {
    id: "behaviors",
    icon: Brain,
    title: "Behaviors",
    badge: "Gentle week",
    badgeColor: "bg-sage/40 text-sage-deep",
    content: "Picking events: 1 (down from 3 last week)\nRoutine skips: 2 evening skips\n\nYou're being kinder to your skin this week. That's real progress, even if it doesn't feel dramatic.",
    emoji: "💛",
  },
  {
    id: "directive",
    icon: Lightbulb,
    title: "This Week's Focus",
    badge: "One thing",
    badgeColor: "bg-primary/10 text-primary",
    content: "Stay the course. Your routine is working. No changes needed this week — just keep showing up for your PM routine. That's the only lever to pull right now.",
    emoji: "🧘",
  },
  {
    id: "photos",
    icon: ImageIcon,
    title: "Photo Comparison",
    badge: "Week 1 → Now",
    badgeColor: "bg-accent/30 text-dusty-rose-deep",
    content: "Progress isn't always dramatic — but it's there. Your skin texture has shown subtle improvements over the last 4 weeks. Keep taking weekly photos so we can track the bigger picture.",
    emoji: "📸",
  },
];

const ProgressTab = ({ userName }: ProgressTabProps) => {
  const [activeCard, setActiveCard] = useState(0);
  const [showZoomOut, setShowZoomOut] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const goToCard = (direction: number) => {
    const next = Math.max(0, Math.min(weeklyCards.length - 1, activeCard + direction));
    setActiveCard(next);
  };

  return (
    <div className="pb-24 px-5 pt-2">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">Progress</h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowZoomOut(!showZoomOut)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold"
        >
          <Maximize2 size={13} /> Zoom Out
        </motion.button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Track your journey over time</p>

      {/* Zoom Out modal */}
      <AnimatePresence>
        {showZoomOut && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="card-warm p-5 mb-5 border-l-2 border-primary"
          >
            <h3 className="text-sm font-bold mb-2">Your Full Journey 🌿</h3>
            <p className="font-serif text-sm italic text-foreground/75 leading-relaxed">
              {userName}, you've been tracking for 6 weeks now. In that time, you've logged 38 check-ins, maintained a 72% routine consistency, and your skin feel trend has been stable-to-improving.
            </p>
            <p className="font-serif text-sm italic text-foreground/75 leading-relaxed mt-2">
              One bad day is just one bad day. Weeks of data is where the truth lives. You're building something real here — even on the days it doesn't feel like it.
            </p>
            <button
              onClick={() => setShowZoomOut(false)}
              className="mt-3 text-xs text-primary font-semibold"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly Summary Story Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Weekly Summary</h3>
          <span className="text-xs text-muted-foreground">Updated Sundays</span>
        </div>

        {/* Card navigation dots */}
        <div className="flex gap-1.5 mb-3">
          {weeklyCards.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveCard(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i === activeCard ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Story card */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCard}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="card-warm p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                {(() => {
                  const Icon = weeklyCards[activeCard].icon;
                  return <Icon size={16} className="text-primary" />;
                })()}
                <span className="text-sm font-bold">{weeklyCards[activeCard].title}</span>
                <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${weeklyCards[activeCard].badgeColor}`}>
                  {weeklyCards[activeCard].badge}
                </span>
              </div>
              <p className="font-serif text-sm italic text-foreground/75 leading-relaxed whitespace-pre-line">
                {weeklyCards[activeCard].content}
              </p>
              <div className="mt-3 text-right">
                <span className="text-lg">{weeklyCards[activeCard].emoji}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Nav arrows */}
          <div className="flex justify-between mt-3">
            <button
              onClick={() => goToCard(-1)}
              disabled={activeCard === 0}
              className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center disabled:opacity-30 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-muted-foreground self-center">
              {activeCard + 1} / {weeklyCards.length}
            </span>
            <button
              onClick={() => goToCard(1)}
              disabled={activeCard === weeklyCards.length - 1}
              className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center disabled:opacity-30 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Trend label */}
      <div className="card-warm p-4 mb-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-sage/30 flex items-center justify-center">
          <TrendIcon size={16} className="text-sage-deep" />
        </div>
        <div>
          <span className="text-sm font-semibold">Trend: Stable</span>
          <p className="text-xs text-muted-foreground">Based on your last 14 check-ins</p>
        </div>
      </div>

      {/* Hands-off Streak */}
      <div className="card-warm p-4 mb-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm">🙌</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">Hands-off streak</span>
            <span className="text-sm font-bold text-sage-deep">4 days</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Days without picking · Personal best: 12 days 🎉</p>
        </div>
      </div>

      {/* Photo Progress Gallery */}
      <div className="card-warm p-5 mb-5">
        <PhotoProgressGallery />
        <div className="mt-4">
          <SkinPhotoCapture />
        </div>
      </div>
    </div>
  );
};

export default ProgressTab;
