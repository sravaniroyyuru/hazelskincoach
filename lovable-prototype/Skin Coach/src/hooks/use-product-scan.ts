import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ScannedProduct {
  identified: boolean;
  name: string;
  brand: string;
  category: string;
  keyIngredients: string[];
  allIngredients?: string[];
  flags: string[];
  summary: string;
  confidence: "high" | "medium" | "low";
}

export function useProductScan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanProduct = async (
    imageBase64: string,
    mode: "product" | "ingredients" = "product"
  ): Promise<ScannedProduct | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("product-scan", {
        body: { imageBase64, mode },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      return (data.product as ScannedProduct) || null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to scan product";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { scanProduct, loading, error };
}
