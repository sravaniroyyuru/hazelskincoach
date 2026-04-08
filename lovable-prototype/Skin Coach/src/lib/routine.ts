export type RoutineProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  key_ingredients: string[] | null;
  status: string;
};

export type RoutineStep = {
  id: string;
  step_name: string;
  time_of_day: "am" | "pm";
  frequency: string;
  sort_order: number;
  is_paused: boolean;
  usage_notes: string;
  product_id: string | null;
  product?: RoutineProduct | null;
};

export type RoutineSnapshot = {
  userName: string;
  onboarded: boolean;
  products: RoutineProduct[];
  routineSteps: RoutineStep[];
};

export const ROUTINE_STORAGE_KEY = "hazel-routine-snapshot";

export const createLocalProduct = (name: string): RoutineProduct => ({
  id: crypto.randomUUID(),
  name,
  brand: null,
  category: null,
  key_ingredients: [],
  status: "active",
});

export const linkProductsToSteps = (steps: RoutineStep[], products: RoutineProduct[]): RoutineStep[] =>
  steps.map((step) => ({
    ...step,
    product: step.product ?? products.find((product) => product.id === step.product_id) ?? null,
  }));

export const getRoutineStepTitle = (step: RoutineStep) => step.product?.name?.trim() || step.step_name;

export const formatFrequencyLabel = (frequency: string) => {
  switch (frequency) {
    case "daily":
      return "Every day";
    case "every_other_day":
      return "Every other day";
    case "weekly":
      return "Weekly";
    case "as_needed":
      return "As needed";
    default:
      return frequency;
  }
};