import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-blue-500/20 hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border-2 border-slate-200 bg-background text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        ghost: "text-slate-600 hover:bg-slate-100/50 hover:text-slate-900",
        link: "text-primary underline-offset-4 hover:underline",
        pill: "bg-primary text-white rounded-full px-6 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        brand:
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
        "line-primary":
          "bg-line-primary text-white hover:bg-line-primary/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        "line-outline":
          "border-2 border-line-primary bg-transparent text-line-primary hover:bg-line-primary/5 hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        xs: "h-8 rounded-lg px-2 text-xs",
        sm: "h-9 rounded-xl px-3 text-xs",
        default: "h-11 rounded-xl px-5 py-2",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  shimmer?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      shimmer = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // When asChild is true and we have loading, we need to ensure a single child element
    // For Slot component compatibility, wrap content in a single element if needed
    const renderContent = () => {
      if (loading && asChild) {
        // When using asChild with loading, wrap in a single span element
        return (
          <span className="inline-flex items-center justify-center gap-2">
            <svg
              className="mr-2 h-4 w-4 animate-spin"
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
            {children}
          </span>
        );
      }

      // Normal rendering for non-asChild or non-loading states
      return (
        <>
          {loading && (
            <svg
              className="mr-2 h-4 w-4 animate-spin"
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
          )}
          {children}
        </>
      );
    };

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          loading && "cursor-wait opacity-80",
          shimmer &&
            "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
          disabled && "transform-none hover:transform-none",
          className,
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {renderContent()}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
