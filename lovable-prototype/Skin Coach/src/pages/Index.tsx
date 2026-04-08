import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import OnboardingFlow from "@/components/OnboardingFlow";
import BottomNav from "@/components/BottomNav";
import TodayTab from "@/components/TodayTab";
import ProgressTab from "@/components/ProgressTab";
import RoutineTab from "@/components/RoutineTab";
import CoachTab from "@/components/CoachTab";
import DermReportTab from "@/components/DermReportTab";
import { ROUTINE_STORAGE_KEY, createLocalProduct, linkProductsToSteps, type RoutineProduct, type RoutineSnapshot, type RoutineStep } from "@/lib/routine";

const Index = () => {
  const [onboarded, setOnboarded] = useState(false);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [welcomeNote, setWelcomeNote] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [products, setProducts] = useState<RoutineProduct[]>([]);
  const [routineSteps, setRoutineSteps] = useState<RoutineStep[]>([]);

  useEffect(() => {
    const savedSnapshot = localStorage.getItem(ROUTINE_STORAGE_KEY);
    if (!savedSnapshot) return;

    try {
      const parsed = JSON.parse(savedSnapshot) as Partial<RoutineSnapshot>;
      setUserName(parsed.userName || "");
      setOnboarded(Boolean(parsed.onboarded));
      setProducts(parsed.products || []);
      setRoutineSteps(linkProductsToSteps(parsed.routineSteps || [], parsed.products || []));
    } catch {
      localStorage.removeItem(ROUTINE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const snapshot: RoutineSnapshot = {
      userName,
      onboarded,
      products,
      routineSteps: linkProductsToSteps(routineSteps, products),
    };

    localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(snapshot));
  }, [onboarded, products, routineSteps, userName]);

  const handleOnboardingComplete = (data: { name: string; skinType: string; concerns: string[]; concernOther: string; goals: string[]; goalOther: string; products: string[] }) => {
    setUserName(data.name);
    setProducts((currentProducts) => {
      const existingNames = new Set(currentProducts.map((product) => product.name.trim().toLowerCase()));
      const nextProducts = [...currentProducts];

      data.products.forEach((productName) => {
        const normalizedName = productName.trim().toLowerCase();
        if (!normalizedName || existingNames.has(normalizedName)) return;
        existingNames.add(normalizedName);
        nextProducts.push(createLocalProduct(productName.trim()));
      });

      return nextProducts;
    });

    const allConcerns = [...data.concerns, data.concernOther].filter(Boolean).join(", ").toLowerCase();
    const allGoals = [...data.goals, data.goalOther].filter(Boolean).join(", ").toLowerCase();
    setWelcomeNote(
      `Hey ${data.name} 🌿\n\nYou've taken a really important first step. As someone focused on ${allConcerns || "your skin"}, I want you to know — we're going to take this slow and steady.\n\nYour goals — ${allGoals || "finding what works"} — are exactly the right place to start.\n\nNo rushing. No overwhelming changes. Just one step at a time.\n\n— Hazel 🌿`
    );
    setShowWelcome(true);
  };

  const handleRoutineChange = ({ nextProducts, nextSteps }: { nextProducts: RoutineProduct[]; nextSteps: RoutineStep[] }) => {
    setProducts(nextProducts);
    setRoutineSteps(linkProductsToSteps(nextSteps, nextProducts));
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    setOnboarded(true);
  };

  if (!onboarded && !showWelcome) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (showWelcome) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-background flex flex-col items-center justify-center px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="card-warm p-6 max-w-sm w-full space-y-4"
        >
          <p className="font-serif text-sm leading-relaxed italic text-foreground/80 whitespace-pre-line">
            {welcomeNote}
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={dismissWelcome}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            I'm ready
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "today":
        return <TodayTab userName={userName} routineSteps={routineSteps} products={products} />;
      case "progress":
        return <ProgressTab userName={userName} />;
      case "routine":
        return <RoutineTab initialProducts={products} initialSteps={routineSteps} onRoutineChange={handleRoutineChange} />;
      case "coach":
        return <CoachTab userName={userName} />;
      case "report":
        return <DermReportTab userName={userName} />;
      default:
        return <TodayTab userName={userName} routineSteps={routineSteps} products={products} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto pt-[max(0.5rem,env(safe-area-inset-top))]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
