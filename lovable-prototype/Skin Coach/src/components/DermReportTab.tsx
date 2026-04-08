import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Calendar, MessageSquare, ChevronRight, Download, Share2, Clock, Pill, History, TrendingUp, Brain, Camera, HelpCircle } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";

interface DermReportTabProps {
  userName: string;
}

const DermReportTab = ({ userName }: DermReportTabProps) => {
  const [appointmentDate, setAppointmentDate] = useState("");
  const [concerns, setConcerns] = useState("");
  const [questions, setQuestions] = useState("");
  const [reportGenerated, setReportGenerated] = useState(false);

  const handleGenerate = () => {
    setReportGenerated(true);
  };

  const reportSections = [
    {
      icon: FileText,
      title: "Skin Profile",
      preview: "Sensitive skin · Acne & breakouts · Tracking for 6 weeks",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Pill,
      title: "Current Routine",
      preview: "3 AM steps · 3 PM steps · All products with ingredients listed",
      color: "text-sage-deep",
      bgColor: "bg-sage/30",
    },
    {
      icon: History,
      title: "Product History",
      preview: "1 discontinued product · Notes on reactions included",
      color: "text-dusty-rose-deep",
      bgColor: "bg-accent/20",
    },
    {
      icon: TrendingUp,
      title: "Skin Trend Summary",
      preview: "Stable trend · 1 flare event · AI-generated insights",
      color: "text-sage-deep",
      bgColor: "bg-sage/30",
    },
    {
      icon: Brain,
      title: "Check-In Patterns",
      preview: "Avg. skin feel: Same · 72% consistency · Picking: 2 events",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Camera,
      title: "Photo Timeline",
      preview: "Week 1 → Week 6 comparison · Key progression photos",
      color: "text-dusty-rose-deep",
      bgColor: "bg-accent/20",
    },
    {
      icon: HelpCircle,
      title: "Your Notes & Questions",
      preview: "3 AI-suggested questions · Your custom notes included",
      color: "text-sage-deep",
      bgColor: "bg-sage/30",
    },
  ];

  const aiSuggestedQuestions = [
    "My skin flared significantly around week 3 — is this purging or a reaction?",
    "I've been using tretinoin for 8 weeks — when should I expect results?",
    "Is my current routine appropriate for my skin type long-term?",
  ];

  if (reportGenerated) {
    return (
      <div className="pb-24 px-5 pt-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Derm Report</h1>
          <button
            onClick={() => setReportGenerated(false)}
            className="text-xs text-primary font-semibold"
          >
            Edit Details
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>

        {/* Export actions */}
        <div className="flex gap-2 mb-6">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Download size={16} /> Export PDF
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="flex-1 h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Share2 size={16} /> Share Link
          </motion.button>
        </div>

        {/* Appointment info */}
        {appointmentDate && (
          <div className="card-warm p-4 mb-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Appointment</p>
              <p className="text-sm font-semibold">{new Date(appointmentDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            </div>
          </div>
        )}

        {/* Report sections */}
        <div className="space-y-2.5 mb-6">
          {reportSections.map((section) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-warm p-4 flex items-center gap-3 cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-full ${section.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={section.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{section.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{section.preview}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </motion.div>
            );
          })}
        </div>

        {/* AI-suggested questions preview */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span>🤖</span> AI-Suggested Questions for Your Derm
          </h3>
          <div className="space-y-2">
            {aiSuggestedQuestions.map((q, i) => (
              <div key={i} className="card-warm p-3.5">
                <p className="font-serif text-xs italic text-foreground/75 leading-relaxed">"{q}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coach note */}
        <div className="card-warm p-4 border-l-2 border-primary">
          <p className="font-serif text-xs italic text-foreground/70 leading-relaxed">
            This report is designed to help your dermatologist understand your journey quickly. It's not a diagnosis — it's a conversation starter. Bring it on your phone or print it out. You've got this, {userName}. 🌿
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-5 pt-2">
      <h1 className="text-xl font-bold mb-1">Derm Report</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Generate a professional summary to share with your dermatologist
      </p>

      {/* Hero card */}
      <div className="card-warm p-5 mb-6 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <FileText size={24} className="text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold">Your Skin Journey, Summarized</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Everything you've tracked — routines, check-ins, photos, trends — compiled into a clean, readable report your derm will appreciate.
          </p>
        </div>
      </div>

      {/* Optional fields */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-semibold mb-1.5 block flex items-center gap-2">
            <Calendar size={14} className="text-primary" />
            Appointment date
            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block flex items-center gap-2">
            <MessageSquare size={14} className="text-primary" />
            Specific concerns to highlight
            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="e.g. Persistent redness on cheeks, reaction to new moisturizer..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
          <VoiceInputButton
            onResult={(text) => setConcerns((prev) => (prev + " " + text).trim())}
            placeholder="Describe your concerns"
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block flex items-center gap-2">
            <HelpCircle size={14} className="text-primary" />
            Questions for your derm
            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            placeholder="e.g. Should I switch to a gentler retinoid? Is my sunscreen adequate?"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
          <VoiceInputButton
            onResult={(text) => setQuestions((prev) => (prev + " " + text).trim())}
            placeholder="Ask your questions"
            className="mt-1.5"
          />
        </div>
      </div>

      {/* What's included preview */}
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-3">What's included in your report</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: "📋", label: "Skin Profile" },
            { icon: "🧴", label: "Full Routine" },
            { icon: "📦", label: "Product History" },
            { icon: "📈", label: "Skin Trends" },
            { icon: "🧠", label: "Check-In Data" },
            { icon: "📸", label: "Photo Timeline" },
            { icon: "❓", label: "Your Questions" },
          ].map((item) => (
            <div key={item.label} className="card-warm p-3 flex items-center gap-2">
              <span className="text-sm">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleGenerate}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2"
      >
        <FileText size={18} /> Generate Derm Report
      </motion.button>

      {/* Reassurance note */}
      <p className="text-center text-[11px] text-muted-foreground mt-3 px-4">
        Your report is private. Only you decide who sees it.
      </p>
    </div>
  );
};

export default DermReportTab;
