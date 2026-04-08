import { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Camera } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProductLookup } from "@/hooks/use-product-lookup";
import ProductPhotoCapture from "@/components/ProductPhotoCapture";
import type { ScannedProduct } from "@/hooks/use-product-scan";
import { motion } from "framer-motion";
import emptyStateImg from "@/assets/empty-state.png";
import { createLocalProduct, formatFrequencyLabel, getRoutineStepTitle, linkProductsToSteps, type RoutineProduct, type RoutineStep } from "@/lib/routine";

interface RoutineTabProps {
  initialProducts: RoutineProduct[];
  initialSteps: RoutineStep[];
  onRoutineChange: (data: { nextProducts: RoutineProduct[]; nextSteps: RoutineStep[] }) => void;
}

const RoutineTab = ({ initialProducts, initialSteps, onRoutineChange }: RoutineTabProps) => {
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [products, setProducts] = useState<RoutineProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addTimeOfDay, setAddTimeOfDay] = useState<"am" | "pm">("am");
  const [editingStep, setEditingStep] = useState<RoutineStep | null>(null);

  // Add step form state
  const [stepName, setStepName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [frequency, setFrequency] = useState("daily");
  const [usageNotes, setUsageNotes] = useState("");

  // Product search
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { lookupProducts, loading: lookupLoading } = useProductLookup();
  const [lookupResults, setLookupResults] = useState<{ name: string; brand: string; category: string; key_ingredients: string[]; flags: string[] }[]>([]);
  const [showPhotoScan, setShowPhotoScan] = useState(false);

  const syncState = (nextSteps: RoutineStep[], nextProducts: RoutineProduct[]) => {
    const linkedSteps = linkProductsToSteps(nextSteps, nextProducts);
    setSteps(linkedSteps);
    setProducts(nextProducts);
    onRoutineChange({ nextProducts, nextSteps: linkedSteps });
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      syncState(initialSteps, initialProducts);
      setLoading(false);
      return;
    }

    const [stepsRes, productsRes] = await Promise.all([
      supabase.from("routine_steps").select("*, product:products(id, name, brand, category, key_ingredients, status)").eq("user_id", user.id).order("sort_order"),
      supabase.from("products").select("*").eq("user_id", user.id).eq("status", "active"),
    ]);

    syncState(((stepsRes.data as unknown as RoutineStep[]) || []), productsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    setSteps(linkProductsToSteps(initialSteps, initialProducts));
    setProducts(initialProducts);
    setLoading(false);
  }, [initialProducts, initialSteps]);

  const amSteps = steps.filter(s => s.time_of_day === "am");
  const pmSteps = steps.filter(s => s.time_of_day === "pm");

  const openAdd = (timeOfDay: "am" | "pm") => {
    setAddTimeOfDay(timeOfDay);
    setStepName("");
    setSelectedProductId("");
    setFrequency("daily");
    setUsageNotes("");
    setEditingStep(null);
    setShowAddDialog(true);
  };

  const openEdit = (step: RoutineStep) => {
    setEditingStep(step);
    setAddTimeOfDay(step.time_of_day as "am" | "pm");
    setStepName(step.step_name);
    setSelectedProductId(step.product_id || "");
    setFrequency(step.frequency);
    setUsageNotes(step.usage_notes || "");
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!stepName.trim()) return;

    const resolvedProductId = selectedProductId === "none" ? null : selectedProductId || null;

    const payload = {
      step_name: stepName.trim(),
      time_of_day: addTimeOfDay,
      frequency,
      usage_notes: usageNotes.trim(),
      product_id: resolvedProductId,
      user_id: user?.id || "local-user",
      sort_order: editingStep ? editingStep.sort_order : (addTimeOfDay === "am" ? amSteps.length : pmSteps.length),
    };

    if (!user) {
      const nextSteps = editingStep
        ? steps.map((step) => step.id === editingStep.id ? { ...step, ...payload, time_of_day: addTimeOfDay } : step)
        : [...steps, {
            id: crypto.randomUUID(),
            is_paused: false,
            ...payload,
            time_of_day: addTimeOfDay,
          }];

      syncState(nextSteps, products);
      setShowAddDialog(false);
      return;
    }

    if (editingStep) {
      await supabase.from("routine_steps").update(payload).eq("id", editingStep.id);
    } else {
      await supabase.from("routine_steps").insert(payload);
    }

    setShowAddDialog(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      syncState(steps.filter((step) => step.id !== id), products);
      return;
    }

    await supabase.from("routine_steps").delete().eq("id", id);
    fetchData();
  };

  const handleProductSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await lookupProducts(searchQuery.trim());
    setLookupResults(results.map(r => ({
      name: r.name,
      brand: r.brand,
      category: r.category,
      key_ingredients: r.keyIngredients,
      flags: r.flags,
    })));
  };

  const handleSaveSearchedProduct = async (result: typeof lookupResults[0]) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const localProduct = createLocalProduct(result.name);
      const nextProducts = [
        ...products,
        {
          ...localProduct,
          brand: result.brand,
          category: result.category,
          key_ingredients: result.key_ingredients,
        },
      ];
      setSelectedProductId(localProduct.id);
      syncState(steps, nextProducts);
      setShowProductSearch(false);
      setSearchQuery("");
      setLookupResults([]);
      return;
    }

    const { data } = await supabase.from("products").insert({
      user_id: user.id,
      name: result.name,
      brand: result.brand,
      category: result.category,
      key_ingredients: result.key_ingredients,
      flags: result.flags,
      status: "active",
    }).select().single();

    if (data) {
      setSelectedProductId(data.id);
      syncState(steps, [...products, data]);
    }
    setShowProductSearch(false);
    setSearchQuery("");
    setLookupResults([]);
  };

  const renderStep = (step: RoutineStep) => (
    <motion.div
      key={step.id}
      layout
      className="card-warm p-4 space-y-1.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{getRoutineStepTitle(step)}</p>
          {step.product && (
            <p className="text-xs text-muted-foreground truncate">
              {step.product.brand ? `${step.product.brand} — ` : ""}
              {step.step_name !== step.product.name ? step.step_name : step.product.name}
            </p>
          )}
          <p className="text-[10px] text-accent-foreground/60 mt-0.5">
            {formatFrequencyLabel(step.frequency)}
          </p>
          {step.usage_notes && (
            <p className="text-[11px] text-muted-foreground italic mt-1 leading-snug">
              {step.usage_notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => openEdit(step)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Pencil size={13} className="text-muted-foreground" />
          </button>
          <button onClick={() => handleDelete(step.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
            <Trash2 size={13} className="text-destructive/70" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="pb-24 px-5 pt-2">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-40" />
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-5 pt-2">
      <h1 className="text-xl font-bold mb-1">Routine & Products</h1>
      <p className="text-sm text-muted-foreground mb-6">Build your routine, track your products</p>

      {/* AM Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <span>🌅</span> AM Routine
          </h3>
          <button onClick={() => openAdd("am")} className="text-xs text-primary font-semibold flex items-center gap-1">
            <Plus size={14} /> Add Step
          </button>
        </div>
        {amSteps.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No morning steps yet</p>
        ) : (
          <div className="space-y-2">{amSteps.map(renderStep)}</div>
        )}
      </div>

      {/* PM Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <span>🌙</span> PM Routine
          </h3>
          <button onClick={() => openAdd("pm")} className="text-xs text-primary font-semibold flex items-center gap-1">
            <Plus size={14} /> Add Step
          </button>
        </div>
        {pmSteps.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No evening steps yet</p>
        ) : (
          <div className="space-y-2">{pmSteps.map(renderStep)}</div>
        )}
      </div>

      {/* Product Library */}
      <div>
        <h3 className="text-sm font-bold mb-3">Product Library ({products.length})</h3>
        {products.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <img src={emptyStateImg} alt="" className="w-20 h-20 mx-auto opacity-50" loading="lazy" width={80} height={80} />
            <p className="text-xs text-muted-foreground">Add your first product to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.id} className="card-warm p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                  {p.key_ingredients && p.key_ingredients.length > 0 && (
                    <p className="text-[10px] text-accent-foreground/50 mt-0.5">{p.key_ingredients.slice(0, 3).join(", ")}</p>
                  )}
                </div>
                <span className="text-[10px] font-medium text-secondary px-2 py-0.5 rounded-full bg-secondary/10 capitalize">{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Step Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingStep ? "Edit Step" : `Add ${addTimeOfDay === "am" ? "Morning" : "Evening"} Step`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Step Name</label>
              <Input
                placeholder="e.g. Cleanser, Serum, SPF..."
                value={stepName}
                onChange={e => setStepName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Link Product</label>
              {products.length > 0 ? (
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No product</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.brand ? `${p.brand} — ` : ""}{p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">No products yet</p>
              )}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowProductSearch(true)}
                  className="text-xs text-primary font-semibold flex items-center gap-1"
                >
                  <Search size={12} /> Search product
                </button>
                <button
                  onClick={() => setShowPhotoScan(true)}
                  className="text-xs text-primary font-semibold flex items-center gap-1"
                >
                  <Camera size={12} /> Scan product
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Frequency</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="every_other_day">Every other day</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="as_needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Usage Notes</label>
              <Textarea
                placeholder="e.g. Tretinoin in sandwich method every other night, azelaic acid on alternating mornings..."
                value={usageNotes}
                onChange={e => setUsageNotes(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <VoiceInputButton
                onResult={(text) => setUsageNotes((prev) => (prev + " " + text).trim())}
                placeholder="Describe how you use this"
                className="mt-1.5"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!stepName.trim()}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
            >
              {editingStep ? "Save Changes" : "Add Step"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Photo Scan Dialog */}
      <Dialog open={showPhotoScan} onOpenChange={setShowPhotoScan}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Scan Product</DialogTitle>
          </DialogHeader>
          <ProductPhotoCapture
            onProductIdentified={async (scanned: ScannedProduct) => {
              await handleSaveSearchedProduct({
                name: scanned.name,
                brand: scanned.brand,
                category: scanned.category,
                key_ingredients: scanned.keyIngredients,
                flags: scanned.flags,
              });
              setShowPhotoScan(false);
            }}
            onClose={() => setShowPhotoScan(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Product Search Dialog */}
      <Dialog open={showProductSearch} onOpenChange={setShowProductSearch}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Search Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. The Ordinary Niacinamide"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setLookupResults([]); }}
                onKeyDown={e => e.key === "Enter" && handleProductSearch()}
              />
              <VoiceInputButton
                onResult={(text) => setSearchQuery(text)}
                placeholder="Say product name"
              />
              <button
                onClick={handleProductSearch}
                disabled={lookupLoading || !searchQuery.trim()}
                className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 shrink-0"
              >
                {lookupLoading ? "..." : "Go"}
              </button>
            </div>

            {lookupResults.length > 0 && (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                <p className="text-xs text-muted-foreground font-medium">{lookupResults.length} match{lookupResults.length > 1 ? "es" : ""}</p>
                {lookupResults.map((result, i) => (
                  <div key={`${result.name}-${i}`} className="card-warm p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{result.name}</p>
                        {result.brand && <p className="text-xs text-muted-foreground">{result.brand} · {result.category}</p>}
                      </div>
                      <button
                        onClick={() => handleSaveSearchedProduct(result)}
                        className="flex-shrink-0 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                    {result.key_ingredients?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.key_ingredients.map((ing: string) => (
                          <span key={ing} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground">{ing}</span>
                        ))}
                      </div>
                    )}
                    {result.flags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.flags.map((f: string) => (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">⚠ {f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoutineTab;
