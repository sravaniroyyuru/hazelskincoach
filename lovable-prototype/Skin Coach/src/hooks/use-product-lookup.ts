import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductInfo {
  name: string;
  brand: string;
  category: string;
  keyIngredients: string[];
  flags: string[];
  summary: string;
}

export function useProductLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupProducts = async (productName: string): Promise<ProductInfo[]> => {
    if (!productName.trim() || productName.length > 200) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("product-lookup", {
        body: { productName: productName.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      return (data.products as ProductInfo[]) || [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to look up product";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Backwards compat
  const lookupProduct = async (productName: string): Promise<ProductInfo | null> => {
    const results = await lookupProducts(productName);
    return results[0] || null;
  };

  return { lookupProduct, lookupProducts, loading, error };
}
