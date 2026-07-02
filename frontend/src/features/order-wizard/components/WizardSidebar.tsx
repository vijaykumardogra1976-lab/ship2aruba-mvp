import {
  Banknote,
  CreditCard,
  FileCheck2,
  FileText,
  Pencil,
  User,
} from "lucide-react";
import { WIZARD_STEPS } from "../constants";
import { cn } from "@/lib/utils";

const icons = [User, FileText, Banknote, CreditCard, Pencil, FileCheck2];

interface WizardSidebarProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardSidebar({ currentStep, onStepClick }: WizardSidebarProps) {
  return (
    <aside className="sticky top-24 hidden w-64 shrink-0 lg:block border-r border-slate-100 pr-4">
      <nav className="space-y-0">
        {WIZARD_STEPS.map((step, index) => {
          const Icon = icons[index];
          const isActive = currentStep === step.id;
          const isComplete = currentStep > step.id;
          return (
            <div key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[19px] top-10 h-[calc(100%-1.3rem)] w-0.5",
                    isComplete ? "bg-violet-500" : "bg-slate-100",
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                disabled={step.id > currentStep}
                className="relative z-10 flex gap-3 text-left disabled:cursor-default cursor-pointer group"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center border transition-all",
                    isActive
                      ? "rounded-xl border-violet-650 bg-violet-600 text-white shadow-md shadow-violet-100"
                      : isComplete
                        ? "rounded-full border-violet-500 bg-violet-50 text-violet-600"
                        : "rounded-full border-slate-200 bg-white text-slate-400 group-hover:border-slate-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="pt-0.5">
                  <p
                    className={cn(
                      "text-sm font-bold tracking-tight transition-colors",
                      isActive ? "text-violet-650 font-extrabold" : "text-slate-700",
                    )}
                  >
                    {step.title}
                  </p>
                  <p className={cn("text-[11px] font-bold mt-0.5", isActive ? "text-violet-600/80" : "text-slate-550")}>
                    {step.description}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
