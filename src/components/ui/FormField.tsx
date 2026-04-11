/**
 * Form Field Component
 *
 * Componente reutilizable para campos de formulario con label, error y descripción.
 * Proporciona una interfaz consistente para todos los campos de formulario.
 *
 * @module components/ui/FormField
 */

import * as React from "react";
import { FieldError } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Props del componente FormField
 */
export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Etiqueta del campo */
  label?: string;
  /** Mensaje de error - puede ser string o FieldError */
  error?: string | FieldError | null | undefined;
  /** Descripción del campo */
  description?: string;
  /** Si el campo es requerido */
  required?: boolean;
  /** Si el campo está deshabilitado */
  disabled?: boolean;
  /** Contenido del campo (input, select, etc.) */
  children: React.ReactNode;
  /** Posición del label */
  labelPosition?: "top" | "left";
  /** Clases adicionales para el contenedor */
  containerClassName?: string;
  /** Clases adicionales para el label */
  labelClassName?: string;
  /** Clases adicionales para el error */
  errorClassName?: string;
}

/**
 * Función para obtener el mensaje de error de un FieldError o string
 */
function getErrorMessage(
  error: string | FieldError | null | undefined,
): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return error.message;
  }
  return undefined;
}

/**
 * Componente FormField
 *
 * @example
 * <FormField label="Nombre" error={errors.name?.message} required>
 *   <Input {...register("name")} />
 * </FormField>
 *
 * @example
 * <FormField
 *   label="Email"
 *   error={errors.email?.message}
 *   description="Usaremos este email para contactarte"
 *   required
 * >
 *   <Input type="email" {...register("email")} />
 * </FormField>
 */
// Exportar componentes
export default function FormField({
  label,
  error,
  description,
  required = false,
  disabled = false,
  children,
  labelPosition = "top",
  containerClassName,
  labelClassName,
  errorClassName,
  className,
  ...props
}: FormFieldProps) {
  const labelId = React.useId();
  const errorId = React.useId();
  const descriptionId = React.useId();

  const errorMessage = getErrorMessage(error);

  return (
    <div
      className={cn(
        "space-y-2",
        labelPosition === "left" && "flex items-start gap-4 space-y-0",
        containerClassName,
      )}
      {...props}
    >
      {label && (
        <Label
          className={cn(
            "text-sm font-medium",
            labelPosition === "left" && "min-w-[120px] pt-2",
            disabled && "opacity-50",
            labelClassName,
          )}
          htmlFor={labelId}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className={cn("flex-1", className)}>
        {React.cloneElement(children as React.ReactElement<unknown>, {
          id: labelId,
          "aria-describedby": cn(
            description && descriptionId,
            errorMessage && errorId,
          ),
          "aria-invalid": !!errorMessage,
          disabled,
        })}

        {description && !errorMessage && (
          <p className="text-xs text-muted-foreground mt-1" id={descriptionId}>
            {description}
          </p>
        )}

        {errorMessage && (
          <p
            className={cn(
              "text-xs text-destructive mt-1 flex items-center gap-1",
              errorClassName,
            )}
            id={errorId}
            role="alert"
          >
            <svg
              fill="none"
              height="12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Componente FormFieldGroup para agrupar campos relacionados
 */
export interface FormFieldGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Título del grupo */
  title?: string;
  /** Descripción del grupo */
  description?: string;
  /** Campos del grupo */
  children: React.ReactNode;
  /** Número de columnas para el grid */
  columns?: 1 | 2 | 3 | 4;
}

/**
 * Componente FormFieldGroup
 */
export function FormFieldGroup({
  title,
  description,
  children,
  columns = 1,
  className,
  ...props
}: FormFieldGroupProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className={cn("grid gap-4", gridCols[columns])}>{children}</div>
    </div>
  );
}

/**
 * Componente FormFieldSection para secciones de formulario
 */
export interface FormFieldSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Título de la sección */
  title?: string;
  /** Descripción de la sección */
  description?: string;
  /** Campos de la sección */
  children: React.ReactNode;
  /** Si la sección está colapsada */
  collapsible?: boolean;
  /** Estado inicial de colapsado */
  defaultCollapsed?: boolean;
}

/**
 * Componente FormFieldSection
 */
export function FormFieldSection({
  title,
  description,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className,
  ...props
}: FormFieldSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {(title || description) && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {collapsible && (
            <button
              className="text-sm text-muted-foreground hover:text-foreground"
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? "Mostrar" : "Ocultar"}
            </button>
          )}
        </div>
      )}
      {!isCollapsed && <div className="space-y-4">{children}</div>}
    </div>
  );
}

/**
 * Componente FormFieldActions para botones de acción del formulario
 */
export interface FormFieldActionsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Alineación de los botones */
  align?: "left" | "center" | "right" | "space-between";
}

/**
 * Componente FormFieldActions
 */
export function FormFieldActions({
  children,
  align = "right",
  className,
  ...props
}: FormFieldActionsProps) {
  const alignment = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    "space-between": "justify-between",
  };

  return (
    <div
      className={cn("flex gap-2 pt-4", alignment[align], className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Componente FormFieldActionsExtended con botones por defecto
 */
export interface FormFieldActionsExtendedProps extends FormFieldActionsProps {
  /** Función para cancelar */
  onCancel?: () => void;
  /** Función para submit */
  onSubmit?: (e?: React.FormEvent) => Promise<void>;
  /** Si el formulario está siendo enviando */
  isSubmitting?: boolean;
  /** Label del botón de submit */
  submitLabel?: string;
  /** Label del botón de submit cuando está enviando */
  submittingLabel?: string;
  /** Icono del botón de submit */
  submitIcon?: React.ReactNode;
}

export function FormFieldActionsExtended({
  onCancel,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Guardar",
  submittingLabel = "Guardando...",
  submitIcon,
  align = "right",
  className,
  children,
  ...props
}: FormFieldActionsExtendedProps) {
  return (
    <FormFieldActions align={align} className={className} {...props}>
      {onCancel && (
        <button
          className="px-6 py-2 border border-admin-border-primary/50 rounded-lg text-admin-text-secondary hover:bg-admin-bg-tertiary transition-all disabled:opacity-50 font-medium text-sm"
          disabled={isSubmitting}
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
      )}
      {onSubmit && (
        <button
          className="px-6 py-2 bg-admin-accent-primary text-[#1A2B23] rounded-lg hover:bg-admin-accent-secondary transition-all disabled:opacity-50 flex items-center gap-2 font-bold text-sm shadow-premium-sm"
          disabled={isSubmitting}
          type="button"
          onClick={onSubmit as unknown}
        >
          {submitIcon}
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      )}
      {children}
    </FormFieldActions>
  );
}
