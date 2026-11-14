import React from 'react';
import { Check } from 'lucide-react';

export interface Step {
  id: number;
  label: string;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, className = '' }) => {
  return (
    <div className={`w-full flex items-center justify-between ${className}`} aria-label="Progress">
      {steps.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isCompleted
                    ? 'bg-am-primary text-am-on-primary'
                    : isCurrent
                    ? 'bg-am-primary text-am-on-primary ring-4 ring-am-sand'
                    : 'bg-am-surface-2 text-am-ink-muted border border-am-border'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span
                className={`text-[11px] font-medium text-center hidden sm:block ${
                  isCurrent ? 'text-am-ink font-semibold' : 'text-am-ink-muted'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 -mt-4 transition-colors ${
                  step.id < currentStep ? 'bg-am-primary' : 'bg-am-border'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
