"use client";

import React, { useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Mail,
  Phone,
  User,
  MessageSquare,
  MapPin,
  Star,
  Check,
  AlertCircle,
} from "lucide-react";

const formContainerVariants = cva("w-full max-w-2xl mx-auto space-y-6", {
  variants: {
    variant: {
      default: "p-6 bg-white rounded-lg border",
      elegant:
        "p-8 bg-gradient-to-br from-white to-line-lightest/30 rounded-xl shadow-lg border border-line-primary/10",
      minimal: "p-4 bg-transparent",
      card: "p-6 bg-card rounded-lg shadow-soft border",
    },
    spacing: {
      compact: "space-y-4",
      normal: "space-y-6",
      relaxed: "space-y-8",
    },
  },
  defaultVariants: {
    variant: "default",
    spacing: "normal",
  },
});

interface FormContainerProps
  extends VariantProps<typeof formContainerVariants> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "tel" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  error?: string;
  success?: string;
  helper?: string;
  icon?: React.ReactNode;
  options?: { value: string; label: string }[];
  rows?: number;
  className?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  interests: string[];
}

export function FormContainer({
  children,
  className,
  title,
  subtitle,
  badge,
  variant,
  spacing,
}: FormContainerProps) {
  return (
    <div className={cn(formContainerVariants({ variant, spacing }), className)}>
      {(title || subtitle || badge) && (
        <div className="mb-6 text-center">
          {badge && (
            <Badge variant="secondary" className="mb-3">
              {badge}
            </Badge>
          )}
          {title && (
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required,
  error,
  success,
  helper,
  icon,
  options,
  rows = 4,
  className,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  const fieldId = `field-${name}`;
  const hasError = !!error;
  const hasSuccess = !!success;

  const renderInput = () => {
    const baseProps = {
      id: fieldId,
      name,
      placeholder,
      required,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      className: cn(
        "transition-all duration-200",
        hasError && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
        hasSuccess &&
          "border-green-500 focus:border-green-500 focus:ring-green-500/20",
        !hasError &&
          !hasSuccess &&
          focused &&
          "border-line-primary focus:ring-line-primary/20",
      ),
    };

    if (type === "textarea") {
      return (
        <textarea
          {...baseProps}
          rows={rows}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            baseProps.className,
          )}
        />
      );
    }

    if (type === "select" && options) {
      return (
        <select
          {...baseProps}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            baseProps.className,
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <Input
        {...baseProps}
        type={type}
        variant={hasError ? "error" : hasSuccess ? "success" : "default"}
        leftIcon={icon}
      />
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          "block text-sm font-medium transition-colors duration-200",
          hasError
            ? "text-red-600"
            : hasSuccess
              ? "text-green-600"
              : "text-foreground",
          focused && !hasError && !hasSuccess && "text-line-primary",
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {renderInput()}

        {/* Status Icons */}
        {(hasError || hasSuccess) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
            {hasSuccess && <Check className="w-4 h-4 text-green-500" />}
          </div>
        )}
      </div>

      {/* Helper/Error/Success Messages */}
      {(error || success || helper) && (
        <div className="text-sm">
          {error && (
            <p className="text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
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
}

export function ContactForm({
  onSubmit,
}: {
  onSubmit?: (data: ContactFormData) => void;
}) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    interests: [],
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof ContactFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ContactFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.message.trim()) {
      newErrors.message = "El mensaje es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (onSubmit) {
      onSubmit(formData);
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const updateField = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (isSubmitted) {
    return (
      <FormContainer
        variant="elegant"
        title="¡Mensaje Enviado!"
        subtitle="Te contactaremos pronto"
      >
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-muted-foreground mb-6">
            Gracias por contactarnos. Hemos recibido tu mensaje y te
            responderemos dentro de las próximas 24 horas.
          </p>
          <Button
            variant="line-primary"
            onClick={() => {
              setIsSubmitted(false);
              setFormData({
                name: "",
                email: "",
                phone: "",
                subject: "",
                message: "",
                interests: [],
              });
            }}
          >
            Enviar Otro Mensaje
          </Button>
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      variant="elegant"
      title="Ponte en Contacto"
      subtitle="Estamos aquí para ayudarte en tu camino hacia la belleza consciente"
      badge="Consulta Gratuita"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Nombre Completo"
            name="name"
            type="text"
            placeholder="Tu nombre"
            required
            icon={<User className="w-4 h-4" />}
            error={errors.name}
            success={formData.name && !errors.name ? "Perfecto" : undefined}
          />

          <FormField
            label="Email"
            name="email"
            type="email"
            placeholder="tu@email.com"
            required
            icon={<Mail className="w-4 h-4" />}
            error={errors.email}
            success={
              formData.email && !errors.email ? "Email válido" : undefined
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Teléfono (Opcional)"
            name="phone"
            type="tel"
            placeholder="+54 9 11 1234-5678"
            icon={<Phone className="w-4 h-4" />}
            helper="Te llamaremos si prefieres una consulta telefónica"
          />

          <FormField
            label="Asunto"
            name="subject"
            type="select"
            placeholder="Selecciona un tema"
            options={[
              { value: "products", label: "Consulta sobre Productos" },
              { value: "membership", label: "Programa de Membresía" },
              { value: "custom", label: "Rutina Personalizada" },
              { value: "support", label: "Soporte Técnico" },
              { value: "other", label: "Otro" },
            ]}
          />
        </div>

        <FormField
          label="Mensaje"
          name="message"
          type="textarea"
          placeholder="Cuéntanos cómo podemos ayudarte..."
          required
          rows={5}
          error={errors.message}
          icon={<MessageSquare className="w-4 h-4" />}
        />

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            type="submit"
            variant="line-primary"
            size="lg"
            loading={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Enviando..." : "Enviar Mensaje"}
          </Button>

          <Button
            type="button"
            variant="line-outline"
            size="lg"
            onClick={() => {
              setFormData({
                name: "",
                email: "",
                phone: "",
                subject: "",
                message: "",
                interests: [],
              });
              setErrors({});
            }}
          >
            Limpiar
          </Button>
        </div>
      </form>
    </FormContainer>
  );
}

// Newsletter signup component
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSubscribed(true);
  };

  if (isSubscribed) {
    return (
      <Card variant="line-subtle" className="p-6 text-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 bg-line-primary/10 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-line-primary" />
          </div>
          <h3 className="font-semibold text-foreground">
            ¡Bienvenida a la comunidad!
          </h3>
          <p className="text-sm text-muted-foreground">
            Te enviaremos las mejores tips de belleza natural y ofertas
            exclusivas.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="line-outline" className="p-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Newsletter OPTTIUS</CardTitle>
        <p className="text-sm text-muted-foreground">
          Recibe tips exclusivos de belleza natural y ofertas especiales
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
            variant="line"
          />
          <Button
            type="submit"
            variant="line-primary"
            loading={isLoading}
            disabled={!email}
          >
            {isLoading ? "Suscribiendo..." : "Suscribirse"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
