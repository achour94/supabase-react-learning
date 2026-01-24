import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import {
  getSalesDeals,
  getTotalSalesValueByName,
  type SalesDealResult,
} from "../api/api";
import { Dialog } from "./Dialog";
import { AddDealForm } from "./AddDealForm";

export function SalesDeals() {
  const [deals, setDeals] = useState<SalesDealResult[]>([]);
  const [metrics, setMetrics] = useState<
    { name: string | null; total_value: number }[]
  >([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fonction de chargement des données (stable avec useCallback)
  const fetchLatestData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setLoading(true);
    else setIsSyncing(true);

    setError(null);

    try {
      const [dealsResponse, metricsResponse] = await Promise.all([
        getSalesDeals(),
        getTotalSalesValueByName(),
      ]);

      if (dealsResponse.error) throw new Error(dealsResponse.error);
      if (metricsResponse.error) throw new Error(metricsResponse.error);

      setDeals(dealsResponse.data ?? []);
      setMetrics(metricsResponse.data ?? []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Impossible de rafraîchir les données");
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    fetchLatestData();
  }, [fetchLatestData]);

  // Abonnement Realtime "Signal"
  useEffect(() => {
    const channel = supabase
      .channel("sales-dashboard-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales_deals",
        },
        () => {
          console.log(
            "⚡ Signal Realtime reçu : Invalidation et rechargement des données...",
          );
          fetchLatestData(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLatestData]);

  // Gestion du succès de l'ajout
  const handleAddSuccess = useCallback(() => {
    setIsAddDialogOpen(false);
    // Les données seront automatiquement rafraîchies via Realtime
    // Mais on peut aussi forcer un refresh immédiat pour une meilleure UX
    fetchLatestData(true);
  }, [fetchLatestData]);

  if (loading && !isSyncing && deals.length === 0) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <h3 className="text-red-800 font-semibold">
          Erreur de synchronisation
        </h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => fetchLatestData()}
          className="mt-2 text-sm text-red-700 underline hover:text-red-900"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* Header avec bouton Add et indicateur de statut */}
      <div className="flex justify-between items-center">
        <div className="flex items-end gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Tableau de Bord</h2>
          <div className="text-sm pb-1">
            {isSyncing ? (
              <span className="text-blue-600 flex items-center gap-2">
                <span className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                Mise à jour...
              </span>
            ) : (
              <span className="text-green-600 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                En direct
              </span>
            )}
          </div>
        </div>

        {/* Bouton Add */}
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition shadow-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Ajouter un deal
        </button>
      </div>

      {/* Metrics View */}
      <section>
        <h3 className="text-xl font-bold text-gray-700 mb-4">Performance</h3>
        {metrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <div
                key={`${metric.name}-${index}`}
                className={`bg-white p-6 rounded-lg shadow-sm border transition-all duration-300 ${
                  isSyncing ? "border-blue-200 bg-blue-50" : "border-gray-100"
                }`}
              >
                <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">
                  {metric.name || "Inconnu"}
                </h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  ${(metric.total_value ?? 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">Aucune donnée métrique.</p>
        )}
      </section>

      {/* Deals Table */}
      <section>
        <h3 className="text-xl font-bold text-gray-700 mb-4">
          Dernières Ventes
        </h3>
        <div
          className={`bg-white shadow-sm rounded-lg border overflow-hidden transition-colors duration-300 ${isSyncing ? "border-blue-200" : "border-gray-200"}`}
        >
          {deals.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nom du Deal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Valeur
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
              Aucune vente trouvée.
            </div>
          )}
        </div>
      </section>

      {/* Dialog d'ajout */}
      <Dialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Ajouter un nouveau deal"
      >
        <AddDealForm
          onSuccess={handleAddSuccess}
          onCancel={() => setIsAddDialogOpen(false)}
        />
      </Dialog>
    </div>
  );
}
