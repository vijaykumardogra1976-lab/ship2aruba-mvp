import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
} from "../schema/orderSchema";
import type { OrderFormData } from "../types";

const STEP_SCHEMAS = [
  null,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
] as const;

export function useOrderWizard(form: UseFormReturn<OrderFormData>) {
  const [step, setStep] = useState(1);

  const validateStep = (stepNum: number) => {
    const schema = STEP_SCHEMAS[stepNum];
    if (!schema) return true;
    const result = schema.safeParse(form.getValues());
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof OrderFormData;
        form.setError(field, { message: issue.message });
      }
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return false;
    setStep((s) => Math.min(s + 1, 6));
    return true;
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  const goToStep = (target: number) => {
    if (target < step) setStep(target);
  };

  const resetWizard = () => {
    setStep(1);
    form.clearErrors();
  };

  return { step, goNext, goPrev, goToStep, resetWizard, setStep, validateStep };
}
