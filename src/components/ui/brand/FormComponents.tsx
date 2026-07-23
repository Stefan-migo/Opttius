"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, Check } from "lucide-react";
import React, { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const formContainerVariants = cva("w-full max-w-2xl mx-auto space-y-6", {
  variants: {
    variant: { default: "p-6 bg-white rounded-lg border", elegant: "p-8 bg-gradient-to-br from-white to-line-lightest/30 rounded-xl shadow-lg border border-line-primary/10", minimal: "p-4 bg-transparent", card: "p-6 bg-card rounded-lg shadow-soft border" },
    spacing: { compact: "space-y-4", normal: "space-y-6", relaxed: "space-y-8" },
  },
  defaultVariants: { variant: "default", spacing: "normal" },
});

interface FormContainerProps extends VariantProps<typeof formContainerVariants> {
  children: React.ReactNode; className?: string; title?: string; subtitle?: string; badge?: string;
}

interface FormFieldProps {
  label: string; name: string; type?: "text" | "email" | "tel" | "textarea" | "select";
  placeholder?: string; required?: boolean; error?: string; success?: string; helper?: string;
  icon?: React.ReactNode; options?: { value: string; label: string }[]; rows?: number; className?: string;
}

export function FormContainer({ children, className, title, subtitle, badge, variant, spacing }: FormContainerProps) {
  return (
    <div className={cn(formContainerVariants({ variant, spacing }), className)}>
      {(title || subtitle || badge) && <div className="mb-6 text-center">{badge && <Badge className="mb-3" variant="secondary">{badge}</Badge>}{title && <h2 className="text-2xl font-heading font-bold text-foreground mb-2">{title}</h2>}{subtitle && <p className="text-muted-foreground">{subtitle}</p>}</div>}
      {children}
    </div>
  );
}

export function FormField({ label, name, type = "text", placeholder, required, error, success, helper, icon, options, rows = 4, className }: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const fieldId = `field-${name}`;
  const hasError = !!error;
  const hasSuccess = !!success;

  const baseProps = {
    id: fieldId, name, placeholder, required,
    onFocus: () => setFocused(true), onBlur: () => setFocused(false),
    className: cn("transition-all duration-200", hasError && "border-red-500 focus:border-red-500 focus:ring-red-500/20", hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500/20", !hasError && !hasSuccess && focused && "border-line-primary focus:ring-line-primary/20"),
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className={cn("block text-sm font-medium transition-colors duration-200", hasError ? "text-red-600" : hasSuccess ? "text-green-600" : "text-foreground", focused && !hasError && !hasSuccess && "text-line-primary")} htmlFor={fieldId}>{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <div className="relative">
        {type === "textarea" ? (
          <textarea {...baseProps} className={cn("flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none", baseProps.className)} rows={rows} />
        ) : type === "select" && options ? (
          <select {...baseProps} className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", baseProps.className)}><option value="">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        ) : (
          <Input {...baseProps} leftIcon={icon} type={type} variant={hasError ? "error" : hasSuccess ? "success" : "default"} />
        )}
        {(hasError || hasSuccess) && <div className="absolute right-3 top-1/2 -translate-y-1/2">{hasError && <AlertCircle className="w-4 h-4 text-red-500" />}{hasSuccess && <Check className="w-4 h-4 text-green-500" />}</div>}
      </div>
      {(error || success || helper) && <div className="text-sm">{error && <p className="text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}{success && <p className="text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />{success}</p>}{helper && !error && !success && <p className="text-muted-foreground">{helper}</p>}</div>}
    </div>
  );
}

export { ContactForm, NewsletterForm } from "./_components/ContactForm";
