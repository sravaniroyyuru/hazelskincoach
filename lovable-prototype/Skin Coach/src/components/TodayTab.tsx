import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";
import SkinPhotoCapture from "@/components/SkinPhotoCapture";
import morningHeader from "@/assets/morning-header.png";
import { supabase } from "@/integrations/supabase/client";
import { formatFrequencyLabel, getRoutineStepTitle, linkProductsToSteps, type RoutineProduct, type RoutineStep } from "@/lib/routine";

interface TodayTabProps {
  userName: string;
  routineSteps: RoutineStep[];
  products: RoutineProduct[];
}

interface CheckInState {
  skinFeel: string;
  breakouts: string;
  routine: string;
  picking: string;
  mood: string;
}

const questions = [
  {
    key: "skinFeel" as const,
    label: "How does your skin feel today?",
    options: ["Smoother", "Same", "Rougher", "Irritated"],
    emojis: ["✨", "😐", "😕", "🔴"],
  },
  {
    key: "breakouts" as const,
    label: "Any new breakouts?",
    options: ["None", "1–2 small", "Several", "Cystic"],
    emojis: ["🎉", "🫧", "😣", "😢"],
  },
  {
    key: "routine" as const,
    label: "Did you follow your routine yesterday?",
    options: ["Both AM & PM", "AM only", "PM only", "Neither"],
    emojis: ["💪", "🌅", "🌙", "😬"],
  },
  {
    key: "picking" as const,
    label: "Did you pick or squeeze?",
    options: ["No", "A little", "Yes"],
    emojis: ["🙌", "😅", "😔"],
  },
  {
    key: "mood" as const,
    label: "How do you feel about your skin?",
    options: ["Calm", "Neutral", "Anxious", "Frustrated"],
    emojis: ["🧘", "😐", "😰", "😤"],
  },
];

const TodayTab = ({ userName, routineSteps, products }: TodayTabProps) => {
  const [checkIn, setCheckIn] = useState<CheckInState>({
    skinFeel: "",
    breakouts: "",
    routine: "",
    picking: "",
    mood: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [savedRoutineSteps, setSavedRoutineSteps] = useState<RoutineStep[]>(linkProductsToSteps(routineSteps, products));
  const [amChecks, setAmChecks] = useState<Record<string, boolean>>({});
  const [pmChecks, setPmChecks] = useState<Record<string, boolean>>({});
  const [dermNote, setDermNote] = useState("");
  const [showDermPrompt, setShowDermPrompt] = useState(false);
  const [dermNoteSaved, setDermNoteSaved] = useState(false);

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const streakPercent = 72;

  useEffect(() => {
    let active = true;

    const loadRoutine = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        setSavedRoutineSteps(linkProductsToSteps(routineSteps, products));
        return;
      }

      const { data } = await supabase
        .from("routine_steps")
        .select("*, product:products(id, name, brand, category, key_ingredients, status)")
        .eq("user_id", user.id)
        .order("sort_order");

      if (!active) return;
      setSavedRoutineSteps(linkProductsToSteps((data as RoutineStep[]) || [], products));
    };

    void loadRoutine();

    return () => {
      active = false;
    };
  }, [products, routineSteps]);

  const amRoutine = useMemo(
    () => savedRoutineSteps.filter((step) => step.time_of_day === "am").sort((a, b) => a.sort_order - b.sort_order),
    [savedRoutineSteps],
  );

  const pmRoutine = useMemo(
    () => savedRoutineSteps.filter((step) => step.time_of_day === "pm").sort((a, b) => a.sort_order - b.sort_order),
    [savedRoutineSteps],
  );

  useEffect(() => {
    setAmChecks((current) => Object.fromEntries(amRoutine.map((step) => [step.id, current[step.id] ?? false])));
  }, [amRoutine]);

  useEffect(() => {
    setPmChecks((current) => Object.fromEntries(pmRoutine.map((step) => [step.id, current[step.id] ?? false])));
  }, [pmRoutine]);

  const handleSelect = (key: keyof CheckInState, value: string) => {
    setCheckIn((prev) => ({ ...prev, [key]: value }));
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    }
  };

  const allAnswered = Object.values(checkIn).every((v) => v !== "");

  const handleSubmit = () => {
    setSubmitted(true);
    // Show derm note prompt for irritated skin or cystic breakouts
    if (checkIn.skinFeel === "Irritated" || checkIn.breakouts === "Cystic") {
      setTimeout(() => setShowDermPrompt(true), 1200);
    }
  };

  const coachResponse = () => {
    const mood = checkIn.mood;
    if (mood === "Anxious" || mood === "Frustrated") {
      return `I hear you, ${userName}. Skin days like this are tough, and it's okay to feel that way. Looking at your streak — you've been consistent 72% of the time this month. That matters more than any single day. Your skin is on a journey, not a timeline. Take a breath. You're doing more than you think. 🌿`;
    }
    if (checkIn.skinFeel === "Smoother") {
      return `That's wonderful to hear, ${userName}! Your consistency is paying off — 72% streak this month. Keep doing exactly what you're doing. Small, steady steps are building real results. Your skin is responding to your care. 🌱`;
    }
    return `Thanks for checking in, ${userName}. Consistency is everything, and you're here — that counts. Your routine streak is at 72% this month, which is solid progress. Remember: skin doesn't change in straight lines. Every steady day adds up. 🌿`;
  };

  return (
    <div className="pb-24 px-5">
      {/* Header with watercolor */}
      <div className="relative -mx-5 -mt-2 mb-4">
        <img src={morningHeader} alt="" className="w-full h-28 object-cover opacity-40" width={800} height={512} />
        <div className="absolute inset-0 flex flex-col justify-end px-5 pb-3">
          <h1 className="text-xl font-bold">{greeting}, {userName} ✨</h1>
          <p className="text-sm text-muted-foreground">{dateStr}</p>
        </div>
      </div>

      {/* Streak card */}
      <div className="card-warm p-4 mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Flame size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold">Routine streak</span>
            <span className="text-sm font-bold text-primary">{streakPercent}%</span>
          </div>
          <div className="streak-bar">
            <motion.div
              className="streak-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${streakPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Check-in card */}
      {!submitted ? (
        <div className="card-warm p-5 mb-5 space-y-4">
          <h2 className="text-lg font-bold">Daily Check-In</h2>

          {/* Question dots */}
          <div className="flex gap-1.5 mb-2">
            {questions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`h-1.5 flex-1 rounded-full cursor-pointer transition-colors ${
                  i === currentQuestion
                    ? "bg-primary"
                    : checkIn[questions[i].key]
                    ? "bg-sage-deep"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <p className="text-sm font-medium">{questions[currentQuestion].label}</p>
              <div className="grid grid-cols-2 gap-2">
                {questions[currentQuestion].options.map((opt, i) => {
                  const isSelected = checkIn[questions[currentQuestion].key] === opt;
                  return (
                    <motion.button
                      key={opt}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelect(questions[currentQuestion].key, opt)}
                      className={`check-option flex items-center gap-2 justify-center ${
                        isSelected ? "check-option-selected" : ""
                      }`}
                    >
                      <span>{questions[currentQuestion].emojis[i]}</span>
                      <span className="text-xs">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {allAnswered && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Check size={16} /> Submit Check-In
            </motion.button>
          )}
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-warm p-5 mb-3"
          >
            <p className="font-serif text-sm leading-relaxed text-foreground/80 italic">
              {coachResponse()}
            </p>
          </motion.div>

          {/* Derm note prompt */}
          <AnimatePresence>
            {showDermPrompt && !dermNoteSaved && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="card-warm p-4 mb-5 border-l-2 border-accent space-y-2.5"
              >
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  📝 Want to add a note for your dermatologist about today?
                </p>
                <textarea
                  value={dermNote}
                  onChange={(e) => setDermNote(e.target.value)}
                  placeholder="e.g. Noticed stinging after moisturizer, new bumps on chin area..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none"
                />
                <VoiceInputButton
                  onResult={(text) => setDermNote((prev) => (prev + " " + text).trim())}
                  placeholder="Describe what you noticed"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDermNoteSaved(true); setShowDermPrompt(false); }}
                    disabled={!dermNote.trim()}
                    className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
                  >
                    Save Note
                  </button>
                  <button
                    onClick={() => setShowDermPrompt(false)}
                    className="px-3 h-8 rounded-lg border border-border text-xs font-medium text-muted-foreground"
                  >
                    Skip
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {dermNoteSaved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs text-sage-deep font-medium mb-5"
            >
              ✓ Note saved for your derm report
            </motion.div>
          )}
        </>
      )}

      {/* AM Routine */}
      <div className="mb-5">
        <h3 className="text-sm font-bold mb-2.5 flex items-center gap-2">
          <span className="text-base">🌅</span> AM Routine
        </h3>
        {amRoutine.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No morning products added yet.</p>
        ) : (
          <div className="space-y-2">
            {amRoutine.map((step) => (
              <motion.button
                key={step.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAmChecks((prev) => ({ ...prev, [step.id]: !prev[step.id] }))}
                className={`w-full card-warm p-3.5 flex items-start gap-3 text-left transition-all ${
                  amChecks[step.id] ? "opacity-60" : ""
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                    amChecks[step.id]
                      ? "bg-sage-deep border-sage-deep"
                      : "border-border"
                  }`}
                >
                  {amChecks[step.id] && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="animate-check-pop">
                      <Check size={14} className="text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${amChecks[step.id] ? "line-through text-muted-foreground" : ""}`}>
                    {getRoutineStepTitle(step)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.product?.brand ? `${step.product.brand} · ` : ""}
                    {formatFrequencyLabel(step.frequency)}
                  </p>
                  {step.usage_notes && (
                    <p className="text-[11px] text-muted-foreground italic mt-1 leading-snug">
                      {step.usage_notes}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* PM Routine */}
      <div className="mb-5">
        <h3 className="text-sm font-bold mb-2.5 flex items-center gap-2">
          <span className="text-base">🌙</span> PM Routine
        </h3>
        {pmRoutine.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No evening products added yet.</p>
        ) : (
          <div className="space-y-2">
            {pmRoutine.map((step) => (
              <motion.button
                key={step.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPmChecks((prev) => ({ ...prev, [step.id]: !prev[step.id] }))}
                className={`w-full card-warm p-3.5 flex items-start gap-3 text-left transition-all ${
                  pmChecks[step.id] ? "opacity-60" : ""
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                    pmChecks[step.id]
                      ? "bg-sage-deep border-sage-deep"
                      : "border-border"
                  }`}
                >
                  {pmChecks[step.id] && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check size={14} className="text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${pmChecks[step.id] ? "line-through text-muted-foreground" : ""}`}>
                    {getRoutineStepTitle(step)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.product?.brand ? `${step.product.brand} · ` : ""}
                    {formatFrequencyLabel(step.frequency)}
                  </p>
                  {step.usage_notes && (
                    <p className="text-[11px] text-muted-foreground italic mt-1 leading-snug">
                      {step.usage_notes}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Photo capture */}
      <SkinPhotoCapture />
    </div>
  );
};

export default TodayTab;
