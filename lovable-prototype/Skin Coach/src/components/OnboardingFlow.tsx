import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Plus, X, Search, Loader2, AlertTriangle, Camera } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";
import emptyStateImg from "@/assets/empty-state.png";
import { useProductLookup, type ProductInfo } from "@/hooks/use-product-lookup";
import SkinPhotoCapture from "@/components/SkinPhotoCapture";

interface OnboardingData {
  skinType: string;
  concerns: string[];
  concernOther: string;
  complexity: string;
  products: string[];
  goals: string[];
  goalOther: string;
  name: string;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

const slideVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
};

// AI-powered product search step with match list
const ProductStep = ({
  products,
  productInput,
  setProductInput,
  onAddProduct,
  onRemoveProduct,
}: {
  products: string[];
  productInput: string;
  setProductInput: (v: string) => void;
  onAddProduct: (name: string) => void;
  onRemoveProduct: (i: number) => void;
}) => {
  const { lookupProducts, loading, error } = useProductLookup();
  const [results, setResults] = useState<ProductInfo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!productInput.trim()) return;
    setHasSearched(true);
    const matches = await lookupProducts(productInput);
    setResults(matches);
  };

  const handleAdd = (name: string) => {
    onAddProduct(name);
    setProductInput("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">What products are you using?</h2>
        <p className="text-sm text-muted-foreground">Search a product and choose from matching results.</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="e.g. CeraVe Hydrating Cleanser"
          value={productInput}
          onChange={(e) => { setProductInput(e.target.value); setResults([]); setHasSearched(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          maxLength={200}
        />
      </div>

      {productInput.trim() && !hasSearched && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSearch}
          disabled={loading}
          className="w-full check-option flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? "Searching..." : `Search "${productInput.trim()}"`}
        </motion.button>
      )}

      {loading && hasSearched && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Finding matches...
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      {/* Match list */}
      {hasSearched && !loading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">{results.length} match{results.length > 1 ? "es" : ""} found</p>
          {results.map((product, i) => (
            <motion.div
              key={`${product.name}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-warm p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.brand} · {product.category}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAdd(product.name)}
                  className="flex-shrink-0 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1"
                >
                  <Plus size={12} /> Add
                </motion.button>
              </div>
              <p className="text-xs text-foreground/70 font-serif italic">{product.summary}</p>
              {product.keyIngredients.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.keyIngredients.map((ing) => (
                    <span key={ing} className="text-[10px] px-2 py-0.5 rounded-full bg-sage/30 text-sage-deep font-medium">{ing}</span>
                  ))}
                </div>
              )}
              {product.flags.length > 0 && (
                <div className="space-y-0.5">
                  {product.flags.map((flag) => (
                    <div key={flag} className="flex items-center gap-1.5 text-[10px] text-destructive">
                      <AlertTriangle size={10} /> {flag}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && !error && (
        <p className="text-xs text-muted-foreground text-center py-2">No matches found.</p>
      )}

      {/* Add without lookup */}
      {productInput.trim() && !loading && (
        <button
          onClick={() => handleAdd(productInput.trim())}
          className="text-xs text-muted-foreground text-center w-full py-1"
        >
          Or just add "{productInput.trim()}" without lookup
        </button>
      )}

      {products.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">{products.length} product{products.length > 1 ? "s" : ""} added</p>
          {products.map((product, i) => (
            <motion.div
              key={`${product}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="check-option check-option-selected flex items-center justify-between"
            >
              <span className="text-xs truncate">{product}</span>
              <button
                onClick={() => onRemoveProduct(i)}
                className="ml-2 flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <X size={12} className="text-primary" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {products.length === 0 && !productInput && !hasSearched && (
        <p className="text-xs text-muted-foreground text-center py-2">No worries if you're unsure — you can always add products later.</p>
      )}
    </div>
  );
};

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    skinType: "",
    concerns: [],
    concernOther: "",
    complexity: "",
    products: [],
    goals: [],
    goalOther: "",
    name: "",
  });
  const [productInput, setProductInput] = useState("");
  const [photosComplete, setPhotosComplete] = useState(false);
  const [photoSkipped, setPhotoSkipped] = useState(false);

  const totalSteps = 7; // Added photo step

  const selectOption = (field: "skinType" | "complexity", value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMulti = (field: "concerns" | "goals", value: string) => {
    setData((prev) => {
      const current = prev[field];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else onComplete(data);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return data.name.trim().length > 0;
      case 1: return !!data.skinType;
      case 2: return data.concerns.length > 0 || data.concernOther.trim().length > 0;
      case 3: return !!data.complexity;
      case 4: return true; // products optional
      case 5: return data.goals.length > 0 || data.goalOther.trim().length > 0;
      case 6: return photosComplete || photoSkipped; // photos step
      default: return false;
    }
  };

  const OptionButton = ({
    label,
    selected,
    onClick,
    emoji,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
    emoji?: string;
  }) => (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`check-option text-left w-full flex items-center gap-3 ${
        selected ? "check-option-selected" : ""
      }`}
    >
      {emoji && <span className="text-lg">{emoji}</span>}
      <span>{label}</span>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto"
        >
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </motion.div>
      )}
    </motion.button>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <img src={emptyStateImg} alt="" className="w-24 h-24 mx-auto mb-4" width={96} height={96} />
              <h1 className="text-2xl font-bold">Welcome to Hazel</h1>
              <p className="text-muted-foreground text-sm">Your calm, kind guide to better skin days. Let's start with your name.</p>
            </div>
            <input
              type="text"
              placeholder="Your first name"
              value={data.name}
              onChange={(e) => setData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-card text-foreground text-center text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              autoFocus
            />
            <div className="flex justify-center">
              <VoiceInputButton
                onResult={(text) => setData((prev) => ({ ...prev, name: text }))}
                placeholder="Say your name"
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">What's your skin type?</h2>
              <p className="text-sm text-muted-foreground">Pick what feels most accurate — you can always change it later.</p>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Sensitive", emoji: "🍃" },
                { label: "Combination", emoji: "🔄" },
                { label: "Dry", emoji: "🏜️" },
                { label: "Oily", emoji: "💧" },
                { label: "Normal", emoji: "☀️" },
              ].map((opt) => (
                <OptionButton key={opt.label} label={opt.label} emoji={opt.emoji} selected={data.skinType === opt.label} onClick={() => selectOption("skinType", opt.label)} />
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">What are your main concerns?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply — or describe in your own words.</p>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Acne & breakouts", emoji: "🫧" },
                { label: "Texture & roughness", emoji: "🪨" },
                { label: "Redness & irritation", emoji: "🌡️" },
                { label: "Scarring & marks", emoji: "🩹" },
                { label: "General skin health", emoji: "🌿" },
              ].map((opt) => (
                <OptionButton key={opt.label} label={opt.label} emoji={opt.emoji} selected={data.concerns.includes(opt.label)} onClick={() => toggleMulti("concerns", opt.label)} />
              ))}
            </div>
            <div className="pt-1 space-y-2">
              <input
                type="text"
                placeholder="Anything else? Describe in your own words..."
                value={data.concernOther}
                onChange={(e) => setData((prev) => ({ ...prev, concernOther: e.target.value.slice(0, 200) }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <VoiceInputButton
                onResult={(text) => setData((prev) => ({ ...prev, concernOther: (prev.concernOther + " " + text).trim().slice(0, 200) }))}
                placeholder="Describe your concerns"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">How complex is your current routine?</h2>
              <p className="text-sm text-muted-foreground">No judgment — we meet you where you are.</p>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "No routine yet", emoji: "🌱" },
                { label: "Basic (cleanser + moisturizer)", emoji: "🧴" },
                { label: "Intermediate (3–5 steps)", emoji: "📋" },
                { label: "Advanced (6+ steps)", emoji: "🔬" },
              ].map((opt) => (
                <OptionButton key={opt.label} label={opt.label} emoji={opt.emoji} selected={data.complexity === opt.label} onClick={() => selectOption("complexity", opt.label)} />
              ))}
            </div>
          </div>
        );
      case 4:
        return <ProductStep
          products={data.products}
          productInput={productInput}
          setProductInput={setProductInput}
          onAddProduct={(name) => setData((prev) => ({ ...prev, products: [...prev.products, name] }))}
          onRemoveProduct={(i) => setData((prev) => ({ ...prev, products: prev.products.filter((_, j) => j !== i) }))}
        />;
      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">What are your goals?</h2>
              <p className="text-sm text-muted-foreground">Pick as many as you like — or tell us in your own words.</p>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Build a solid routine", emoji: "🏗️" },
                { label: "Track my progress", emoji: "📈" },
                { label: "Reduce skin anxiety", emoji: "🧘" },
                { label: "Improve consistency", emoji: "🎯" },
              ].map((opt) => (
                <OptionButton key={opt.label} label={opt.label} emoji={opt.emoji} selected={data.goals.includes(opt.label)} onClick={() => toggleMulti("goals", opt.label)} />
              ))}
            </div>
            <div className="pt-1 space-y-2">
              <input
                type="text"
                placeholder="Anything else you're hoping for?"
                value={data.goalOther}
                onChange={(e) => setData((prev) => ({ ...prev, goalOther: e.target.value.slice(0, 200) }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <VoiceInputButton
                onResult={(text) => setData((prev) => ({ ...prev, goalOther: (prev.goalOther + " " + text).trim().slice(0, 200) }))}
                placeholder="Describe your goals"
              />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            {photosComplete ? (
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">✅</div>
                <h2 className="text-xl font-bold">Baseline photos captured!</h2>
                <p className="text-sm text-muted-foreground">You're all set. These will help you track progress over time.</p>
              </div>
            ) : (
              <>
                <SkinPhotoCapture inline onComplete={() => setPhotosComplete(true)} />
                {!photoSkipped && (
                  <button
                    onClick={() => setPhotoSkipped(true)}
                    className="w-full text-xs text-muted-foreground py-2"
                  >
                    Skip for now — I'll do this later
                  </button>
                )}
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-muted">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex gap-3">
        {step > 0 && (
          <button onClick={back} className="flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-card text-foreground">
            <ArrowLeft size={20} />
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={next}
          disabled={!canProceed()}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {step === totalSteps - 1 ? "Let's go!" : "Continue"}
          <ArrowRight size={18} />
        </motion.button>
      </div>
    </div>
  );
};

export default OnboardingFlow;
