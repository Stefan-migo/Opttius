import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-2xl border bg-[var(--admin-bg-tertiary)] text-card-foreground shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "border-border bg-[var(--admin-bg-tertiary)] hover:shadow-md transition-shadow duration-300",
        elevated:
          "border-border/50 bg-[var(--admin-bg-tertiary)] shadow-md hover:shadow-xl hover:-translate-y-1",
        interactive:
          "border-border bg-[var(--admin-bg-tertiary)] shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer active:translate-y-0 active:shadow-md transition-shadow duration-300",
        outline:
          "border-2 border-border bg-transparent hover:bg-accent/5 hover:shadow-sm",
        ghost:
          "border-transparent bg-transparent hover:bg-accent/10 hover:border-border/50",
        glass:
          "border-white/10 dark:border-slate-800/10 bg-[var(--admin-bg-tertiary)] backdrop-blur-md shadow-lg",
        "line-outline":
          "border-2 border-line-primary bg-transparent hover:shadow-line transition-all duration-300",
        "line-subtle":
          "border border-line-primary/10 bg-line-lightest/30 hover:shadow-soft transition-all duration-300",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-12",
      },
      rounded: {
        default: "rounded-2xl",
        sm: "rounded-xl",
        lg: "rounded-3xl",
        full: "rounded-[2rem]",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      rounded: "default",
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  shimmer?: boolean;
  float?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      padding,
      rounded,
      shimmer = false,
      float = false,
      ...props
    },
    ref,
  ) => (
    <div
      className={cn(
        cardVariants({ variant, padding, rounded }),
        shimmer &&
          "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-1000",
        float && "animate-premium-float",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const cardHeaderVariants = cva("flex flex-col space-y-1.5", {
  variants: {
    padding: {
      none: "",
      sm: "p-4 pb-2",
      default: "p-6 pb-3",
      lg: "p-8 pb-4",
      xl: "p-12 pb-6",
    },
    align: {
      left: "text-left",
      center: "text-center items-center",
      right: "text-right items-end",
    },
  },
  defaultVariants: {
    padding: "default",
    align: "left",
  },
});

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding, align, ...props }, ref) => (
    <div
      className={cn(cardHeaderVariants({ padding, align }), className)}
      ref={ref}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const cardTitleVariants = cva("font-semibold leading-none tracking-tight", {
  variants: {
    size: {
      sm: "text-lg",
      default: "text-xl",
      lg: "text-2xl",
      xl: "text-3xl",
    },
    theme: {
      default: "font-body",
      elegant: "font-heading",
      sophisticated: "font-heading font-bold",
      modern: "font-body font-medium",
    },
  },
  defaultVariants: {
    size: "default",
    theme: "default",
  },
});

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardTitleVariants> {}

const CardTitle = React.forwardRef<HTMLDivElement, CardTitleProps>(
  ({ className, size, theme, ...props }, ref) => (
    <div
      className={cn(cardTitleVariants({ size, theme }), className)}
      ref={ref}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const cardDescriptionVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
    },
    theme: {
      default: "font-body",
      elegant: "font-body italic",
      sophisticated: "font-body",
    },
  },
  defaultVariants: {
    size: "default",
    theme: "default",
  },
});

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardDescriptionVariants> {}

const CardDescription = React.forwardRef<HTMLDivElement, CardDescriptionProps>(
  ({ className, size, theme, ...props }, ref) => (
    <div
      className={cn(cardDescriptionVariants({ size, theme }), className)}
      ref={ref}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const cardContentVariants = cva("", {
  variants: {
    padding: {
      none: "",
      sm: "p-4 pt-2",
      default: "p-6 pt-3",
      lg: "p-8 pt-4",
      xl: "p-12 pt-6",
    },
    spacing: {
      tight: "space-y-2",
      default: "space-y-4",
      relaxed: "space-y-6",
      loose: "space-y-8",
    },
  },
  defaultVariants: {
    padding: "default",
    spacing: "default",
  },
});

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding, spacing, ...props }, ref) => (
    <div
      className={cn(cardContentVariants({ padding, spacing }), className)}
      ref={ref}
      {...props}
    />
  ),
);
CardContent.displayName = "CardContent";

const cardFooterVariants = cva("flex items-center", {
  variants: {
    padding: {
      none: "",
      sm: "p-4 pt-2",
      default: "p-6 pt-3",
      lg: "p-8 pt-4",
      xl: "p-12 pt-6",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    },
    direction: {
      row: "flex-row",
      column: "flex-col",
      "row-reverse": "flex-row-reverse",
      "column-reverse": "flex-col-reverse",
    },
  },
  defaultVariants: {
    padding: "default",
    justify: "start",
    direction: "row",
  },
});

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding, justify, direction, ...props }, ref) => (
    <div
      className={cn(
        cardFooterVariants({ padding, justify, direction }),
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardContent,
  cardContentVariants,
  CardDescription,
  cardDescriptionVariants,
  CardFooter,
  cardFooterVariants,
  CardHeader,
  cardHeaderVariants,
  CardTitle,
  cardTitleVariants,
  cardVariants,
};
