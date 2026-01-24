import { useState, type FormEvent } from "react";
import { createSalesDeal, type CreateSalesDealInput } from "../api/api";

interface AddDealFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddDealForm({ onSuccess, onCancel }: AddDealFormProps) {
  const [formData, setFormData] = useState<CreateSalesDealInput>({
    name: "",
    value: 0,
  });
  const [errors, setErrors] = useState<{
    name?: string;
    value?: string;
    submit?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom du deal est requis";
    }

    if (formData.value <= 0) {
      newErrors.value = "La valeur doit être supérieure à 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await createSalesDeal(formData);

      if (error) {
        setErrors({ submit: error });
        return;
      }

      // Succès : réinitialiser le formulaire et notifier le parent
      setFormData({ name: "", value: 0 });
      onSuccess();
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : "Une erreur inattendue s'est produite",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Erreur générale */}
      {errors.submit && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
          role="alert"
        >
          <p className="text-sm">{errors.submit}</p>
        </div>
      )}

      {/* Champ Nom */}
      <div>
        <label
          htmlFor="deal-name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Nom du deal <span className="text-red-500">*</span>
        </label>
        <input
          id="deal-name"
          type="text"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            // Effacer l'erreur lors de la saisie
            if (errors.name) {
              setErrors({ ...errors, name: undefined });
            }
          }}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
            errors.name
              ? "border-red-300 bg-red-50"
              : "border-gray-300 bg-white"
          }`}
          placeholder="Ex: Contrat annuel entreprise ABC"
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* Champ Valeur */}
      <div>
        <label
          htmlFor="deal-value"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Valeur (€) <span className="text-red-500">*</span>
        </label>
        <input
          id="deal-value"
          type="number"
          step="0.01"
          min="0"
          value={formData.value || ""}
          onChange={(e) => {
            setFormData({
              ...formData,
              value: parseFloat(e.target.value) || 0,
            });
            // Effacer l'erreur lors de la saisie
            if (errors.value) {
              setErrors({ ...errors, value: undefined });
            }
          }}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
            errors.value
              ? "border-red-300 bg-red-50"
              : "border-gray-300 bg-white"
          }`}
          placeholder="Ex: 50000"
          disabled={isSubmitting}
          aria-invalid={!!errors.value}
          aria-describedby={errors.value ? "value-error" : undefined}
        />
        {errors.value && (
          <p id="value-error" className="mt-1 text-sm text-red-600">
            {errors.value}
          </p>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Création...
            </>
          ) : (
            "Créer le deal"
          )}
        </button>
      </div>
    </form>
  );
}
