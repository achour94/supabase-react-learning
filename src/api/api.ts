import { supabase } from "../supabase-client";
import type { Database } from "../types/supabase";

type SalesDeal = Database["public"]["Tables"]["sales_deals"]["Row"];

export type SalesDealResult = Pick<SalesDeal, "name" | "value">;

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
  data: { name: string | null; total_value: number }[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("sales_deals")
    .select("name, total_value:value.sum()");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
