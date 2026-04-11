import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-all duration-300 ease-premium file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-body",
  {
    variants: {
      variant: {
        default:
          "border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-primary/50",
        elegant:
          "border-2 border-border bg-bg-cream/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary hover:border-brand-primary/50 hover:bg-bg-cream/30",
        outline:
          "border-2 border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary hover:border-primary/70",
        filled:
          "border-transparent bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background hover:bg-muted/80",
        ghost:
          "border-transparent bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background/50 hover:bg-background/30",

        // Enhanced OPTTIUS Brand Variants
        brand:
          "border-2 border-brand-primary/30 bg-bg-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary focus-visible:bg-bg-cream/20 hover:border-brand-primary/50 hover:bg-bg-cream/15",
        "brand-subtle":
          "border border-brand-primary/20 bg-bg-light/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary focus-visible:border-brand-primary hover:border-brand-primary/40",

        // Dynamic Line Theme Variants
        line: "border-2 border-line-primary/30 bg-line-lightest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-primary focus-visible:border-line-primary focus-visible:bg-line-lightest/20 hover:border-line-primary/50 hover:bg-line-lightest/15",
        "line-subtle":
          "border border-line-primary/20 bg-line-light/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-line-primary focus-visible:border-line-primary hover:border-line-primary/40",
        "line-accent":
          "border-2 border-line-accent/40 bg-line-light/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-accent focus-visible:border-line-accent hover:border-line-accent/60",

        // Product Line Specific Variants
        alma: "border-2 border-alma-primary/30 bg-alma-lightest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alma-primary focus-visible:border-alma-primary hover:border-alma-primary/50",
        ecos: "border-2 border-ecos-primary/30 bg-ecos-lightest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ecos-primary focus-visible:border-ecos-primary hover:border-ecos-primary/50",
        jade: "border-2 border-jade-primary/30 bg-jade-lightest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-primary focus-visible:border-jade-primary hover:border-jade-primary/50",
        umbral:
          "border-2 border-umbral-primary/30 bg-umbral-lightest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-umbral-primary focus-visible:border-umbral-primary hover:border-umbral-primary/50",
        utopica:
          "border-2 border-utopica-primary/30 bg-utopica-lightest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-utopica-primary focus-visible:border-utopica-primary hover:border-utopica-primary/50",

        // State Variants
        error:
          "border-2 border-destructive/50 bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:border-destructive text-destructive-foreground",
        success:
          "border-2 border-green-500/50 bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500",
        warning:
          "border-2 border-yellow-500/50 bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:border-yellow-500",
      },
      inputSize: {
        sm: "h-8 px-2 py-1 text-xs",
        default: "h-10 px-3 py-2",
        lg: "h-12 px-4 py-3 text-base",
        xl: "h-14 px-6 py-4 text-lg",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        default: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
      rounded: "default",
    },
  },
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant,
      inputSize,
      rounded,
      label,
      error,
      success,
      helper,
      leftIcon,
      rightIcon,
      loading = false,
      ...props
    },
    ref,
  ) => {
    // Auto-set variant based on state
    const computedVariant = error ? "error" : success ? "success" : variant;

    return (
      <div className="w-full space-y-2" style={{ background: "unset" }}>
        {label && (
          <label className="text-sm font-medium text-foreground font-body">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          <input
            className={cn(
              inputVariants({ variant: computedVariant, inputSize, rounded }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              loading && "pr-10",
              className,
            )}
            disabled={loading || props.disabled}
            ref={ref}
            type={type}
            {...props}
          />

          {(rightIcon || loading) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {loading ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>

        {(error || success || helper) && (
          <div className="text-xs space-y-1">
            {error && (
              <p className="text-destructive font-medium flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    fillRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-600 font-medium flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    fillRule="evenodd"
                  />
                </svg>
                {success}
              </p>
            )}
            {helper && !error && !success && (
              <p className="text-muted-foreground">{helper}</p>
            )}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
