import { useEffect, useState } from "react";
import {
  getSalesDeals,
  getTotalSalesValueByName,
  type SalesDealResult,
} from "../api/api";

export function SalesDeals() {
  const [deals, setDeals] = useState<SalesDealResult[]>([]);
  const [metrics, setMetrics] = useState<
    { name: string | null; total_value: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We define the function INSIDE the effect to satisfy the linter
    // and ensure it captures the latest scope.
    async function loadAllData() {
      setLoading(true);
      setError(null);

      try {
        // Run both requests in parallel using Promise.all
        const [dealsResponse, metricsResponse] = await Promise.all([
          getSalesDeals(),
          getTotalSalesValueByName(),
        ]);

        // Handle Deals Response
        if (dealsResponse.error) {
          setError(dealsResponse.error);
        } else {
          setDeals(dealsResponse.data ?? []);
        }

        // Handle Metrics Response
        // (Note: If deals failed, we might still want metrics,
        // or we can overwrite the error. Here we just log metrics error if deals passed)
        if (metricsResponse.error) {
          // If we don't have an error yet, set it.
          // Otherwise keep the previous error (or combine them).
          setError((prev) => prev || metricsResponse.error);
        } else {
          setMetrics(metricsResponse.data ?? []);
        }
      } catch (err: any) {
        // Catch unexpected network crashes
        setError(err.message || "An unexpected error occurred");
      } finally {
        // Only set loading to false ONCE, after BOTH are finished
        setLoading(false);
      }
    }

    loadAllData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 m-4 text-center">
        <p className="text-gray-500">No sales deals found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Sales Deals</h2>

      {/* Optional: Display Metrics if you want to verify they loaded */}
      {/* <div className="mb-4">Metrics loaded: {metrics.length}</div> */}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {deals.map((deal, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {deal.name ?? "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {deal.value != null
                    ? `$${deal.value.toLocaleString()}`
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
