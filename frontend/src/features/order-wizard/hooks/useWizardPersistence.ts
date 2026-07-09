import { useCallback, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { WIZARD_STORAGE_KEY } from "../constants";
import type { OrderFormData } from "../types";

export function useWizardPersistence(
  form: UseFormReturn<OrderFormData>,
  isDirty: boolean,
) {
  // On mount: restore saved draft from localStorage (only if it exists)
  useEffect(() => {
    const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<OrderFormData>;
        form.reset({ ...form.getValues(), ...parsed });
      } catch {
        localStorage.removeItem(WIZARD_STORAGE_KEY);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // On tab/window close: CLEAR the draft so stale data never persists
  // across browser sessions. This is intentional — order forms should
  // not survive a full page close.
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Save draft to localStorage only when form has been touched (isDirty)
  const save = useCallback(
    (data: OrderFormData) => {
      if (isDirty) {
        localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(data));
      }
    },
    [isDirty],
  );

  // Clear draft on successful submission
  const clear = useCallback(() => {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  }, []);

  return { save, clear };
}

