import { supabase } from "../supabase-client";
import type { Database } from "../types/supabase";

type SalesDeal = Database["public"]["Tables"]["sales_deals"]["Row"];

export type SalesDealResult = Pick<SalesDeal, "name" | "value">;

// Define the shape of the metrics result explicitly
type MetricsResult = {
  name: string | null;
  total_value: number;
};

export async function getSalesDeals(): Promise<{
  data: SalesDealResult[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("sales_deals")
    .select("name, value")
    .order("value", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getTotalSalesValueByName(): Promise<{
  data: MetricsResult[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("sales_deals")
    // We alias 'value.sum()' to 'total_value'
    .select("name, total_value:value.sum()");

  if (error) {
    return { data: null, error: error.message };
  }

  // Cast the data manually since Supabase inference doesn't handle
  // aggregation aliases perfectly and .returns() is deprecated.
  // We cast to 'unknown' first to avoid TS complaining about overlapping types.
  const typedData = data as unknown as MetricsResult[];

  return { data: typedData, error: null };
}
