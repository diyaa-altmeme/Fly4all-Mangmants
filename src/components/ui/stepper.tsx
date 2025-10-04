
"use client";

import * as React from "react";
import { Check, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  initialStep?: number;
  steps: {
    label: string;
    icon?: React.ReactNode;
  }[];
  activeStep?: number;
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ className, children, initialStep, steps, activeStep, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full flex-row justify-between gap-x-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Stepper.displayName = "Stepper";

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  isCompleted?: boolean;
  isActive?: boolean;
  isOptional?: boolean;
  icon?: React.ReactNode;
  isLast?: boolean;
}

const StepperItem = React.forwardRef<HTMLDivElement, StepperItemProps>(
  (
    {
      className,
      label,
      isCompleted,
      isActive,
      isOptional,
      icon,
      isLast,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-1 items-center gap-x-2", className)}
        {...props}
      >
        <div className="flex items-center">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold ring-2 transition-colors",
              isActive ? "bg-primary text-primary-foreground ring-primary" : 
              isCompleted ? "bg-secondary text-secondary-foreground ring-secondary" :
              "bg-muted text-muted-foreground ring-muted"
            )}
          >
            {isCompleted ? <Check /> : icon}
          </div>
        </div>
        <div className="hidden md:flex flex-col">
          <h3
            className={cn(
              "font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {label}
          </h3>
        </div>
        {!isLast && (
          <div className="h-px w-full flex-1 bg-border transition-colors" aria-hidden="true" />
        )}
      </div>
    );
  }
);

StepperItem.displayName = "StepperItem";

interface UseStepperProps {
  initialStep?: number;
  steps: {
    label: string;
  }[];
}

const useStepper = ({ initialStep = 0, steps }: UseStepperProps) => {
  const [activeStep, setActiveStep] = React.useState(initialStep);

  const goToNextStep = React.useCallback(() => {
    setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
  }, [steps.length]);

  const goToPreviousStep = React.useCallback(() => {
    setActiveStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const resetSteps = React.useCallback(() => {
    setActiveStep(initialStep);
  }, [initialStep]);

  const isDisabledStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;

  return {
    activeStep,
    setActiveStep,
    goToNextStep,
    goToPreviousStep,
    resetSteps,
    isDisabledStep,
    isLastStep,
  };
};

export { Stepper, StepperItem, useStepper };
