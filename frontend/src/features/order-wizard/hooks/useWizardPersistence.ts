import { useCallback, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { WIZARD_STORAGE_KEY } from "../constants";
import type { OrderFormData } from "../types";

export function useWizardPersistence(
  form: UseFormReturn<OrderFormData>,
  isDirty: boolean,
) {
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
  }, [form]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const save = useCallback((data: OrderFormData) => {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  }, []);

  return { save, clear };
}
