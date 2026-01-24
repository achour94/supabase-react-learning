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
    async function loadAllData() {
      setLoading(true);
      setError(null);

      try {
        const [dealsResponse, metricsResponse] = await Promise.all([
          getSalesDeals(),
          getTotalSalesValueByName(),
        ]);

        if (dealsResponse.error) {
          setError(dealsResponse.error);
        } else {
          setDeals(dealsResponse.data ?? []);
        }

        if (metricsResponse.error) {
          setError((prev) => prev || metricsResponse.error);
        } else {
          setMetrics(metricsResponse.data ?? []);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred");
        }
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* Metrics View */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Performance Metrics
        </h2>
        {metrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <div
                key={`${metric.name}-${index}`}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
                  {metric.name || "Unknown"}
                </h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  ${(metric.total_value ?? 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No metrics available.</p>
        )}
      </section>

      {/* Deals Table */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Deals</h2>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          {deals.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Deal Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deals.map((deal, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {deal.name ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right font-mono">
                      {deal.value != null
                        ? `$${deal.value.toLocaleString()}`
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No sales deals found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
