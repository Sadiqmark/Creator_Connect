import React from 'react';
import { Check } from 'lucide-react';

export interface Step {
  number: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <nav aria-label="Progress" className="w-full py-4">
      <ol className="flex items-center justify-between relative">
        {steps.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = onStepClick && isCompleted;

          return (
            <li
              key={step.number}
              className={`flex-1 flex items-center ${
                idx !== steps.length - 1 ? 'pr-4' : ''
              }`}
            >
              <div
                onClick={() => isClickable && onStepClick(step.number)}
                className={`flex items-center gap-3 ${
                  isClickable ? 'cursor-pointer group' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    isCompleted
                      ? 'bg-success text-white'
                      : isCurrent
                      ? 'bg-accent text-white shadow-subtle'
                      : 'bg-surface-muted text-foreground-muted border border-border'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.number}
                </div>
                <div className="hidden sm:block">
                  <span
                    className={`text-xs font-medium uppercase tracking-wider block ${
                      isCurrent ? 'text-accent' : 'text-foreground-muted'
                    }`}
                  >
                    Step {step.number}
                  </span>
                  <span
                    className={`text-sm font-semibold block ${
                      isCurrent
                        ? 'text-foreground'
                        : isCompleted
                        ? 'text-foreground group-hover:text-accent transition-colors'
                        : 'text-foreground-muted'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>

              {idx !== steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ml-4 transition-colors ${
                    step.number < currentStep ? 'bg-success' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
