/**
 * Generic Form Hook
 *
 * Hook genérico para manejo estandarizado de formularios usando react-hook-form y zod.
 * Proporciona una interfaz consistente para manejar estado, validación y submission de formularios.
 *
 * @module hooks/useForm
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  FieldErrors,
  Path,
  useForm as useReactHookForm,
  UseFormReturn,
} from "react-hook-form";
import { z } from "zod";

import { handleApiError } from "@/lib/api/services";

/**
 * Opciones para el hook useForm
 */
export interface UseFormOptions<
  T extends z.ZodType<unknown, unknown, unknown>,
  R = void,
> {
  /** Valores iniciales del formulario */
  defaultValues: z.infer<T>;
  /** Esquema de validación Zod */
  validationSchema?: T;
  /** Función de submit del formulario */
  onSubmit: (values: z.infer<T>) => Promise<R>;
  /** Callback cuando el submit es exitoso */
  onSuccess?: (result: R) => void;
  /** Callback cuando hay un error */
  onError?: (error: Error) => void;
  /** Contexto para manejo de errores */
  errorContext?: string;
  /** Si debe mostrar notificaciones de error automáticamente */
  showErrors?: boolean;
  /** Si debe mostrar notificaciones de éxito automáticamente */
  showSuccess?: boolean;
  /** Mensaje de éxito personalizado */
  successMessage?: string | ((values: z.infer<T>) => string);
}

/**
 * Return type del hook useForm
 */
export interface UseFormReturnExtended<
  T extends z.ZodType<unknown, unknown, unknown>,
  R = void,
> {
  /** Si el formulario está siendo enviado */
  isSubmitting: boolean;
  /** Error general del formulario */
  formError: string | null;
  /** Función para manejar el submit del formulario */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Función para resetear el formulario */
  resetForm: () => void;
  /** Función para setear valores específicos */
  setFieldValue: (field: keyof z.infer<T>, value: unknown) => void;
  /** Función para setear múltiples valores */
  setFieldValues: (values: Partial<z.infer<T>>) => void;
  /** Valores actuales del formulario */
  values: z.infer<T>;
  /** Errores del formulario */
  errors: FieldErrors<z.infer<T>>;
  /** Función register de react-hook-form */
  register: UseFormReturn<z.infer<T>>["register"];
  /** Función setValue de react-hook-form */
  setValue: UseFormReturn<z.infer<T>>["setValue"];
  /** Función getValues de react-hook-form */
  getValues: UseFormReturn<z.infer<T>>["getValues"];
  /** Función trigger de react-hook-form */
  trigger: UseFormReturn<z.infer<T>>["trigger"];
  /** Estado del formulario */
  formState: UseFormReturn<z.infer<T>>["formState"];
  /** Función reset de react-hook-form */
  reset: UseFormReturn<z.infer<T>>["reset"];
  /** Función clearErrors de react-hook-form */
  clearErrors: UseFormReturn<z.infer<T>>["clearErrors"];
  /** Función setError de react-hook-form */
  setError: UseFormReturn<z.infer<T>>["setError"];
  /** Función watch de react-hook-form */
  watch: UseFormReturn<z.infer<T>>["watch"];
  /** Función control de react-hook-form */
  control: UseFormReturn<z.infer<T>>["control"];
}

/**
 * Hook genérico para manejo de formularios
 *
 * @param options - Opciones del formulario
 * @returns Objeto con funciones y estado del formulario
 *
 * @example
 * // Definir el esquema de validación
 * const customerSchema = z.object({
 *   name: z.string().min(1, "El nombre es requerido"),
 *   email: z.string().email("Email inválido"),
 *   phone: z.string().optional(),
 * });
 *
 * // Usar el hook
 * const form = useForm({
 *   defaultValues: { name: "", email: "", phone: "" },
 *   validationSchema: customerSchema,
 *   onSubmit: async (values) => {
 *     await createCustomer(values);
 *   },
 *   successMessage: "Cliente creado exitosamente",
 * });
 *
 * // En el JSX
 * <form onSubmit={form.handleSubmit}>
 *   <FormField label="Nombre" error={form.formState.errors.name?.message}>
 *     <Input {...form.register("name")} />
 *   </FormField>
 *   <Button type="submit" disabled={form.isSubmitting}>
 *     {form.isSubmitting ? "Guardando..." : "Guardar"}
 *   </Button>
 * </form>
 */
export function useForm<
  T extends z.ZodType<unknown, unknown, unknown>,
  R = void,
>(options: UseFormOptions<T, R>): UseFormReturnExtended<T, R> {
  const {
    defaultValues,
    validationSchema,
    onSubmit,
    onSuccess,
    onError,
    errorContext = "Form",
    showErrors = true,
    showSuccess = false,
    successMessage,
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Configurar react-hook-form
  const reactHookForm = useReactHookForm<z.infer<T>>({
    defaultValues,
    resolver: validationSchema ? zodResolver(validationSchema) : undefined,
    mode: "onBlur", // Validar cuando el campo pierde el foco
    reValidateMode: "onBlur",
  });

  /**
   * Maneja el submit del formulario
   */
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setFormError(null);

    // Validar el formulario
    const isValid = await reactHookForm.trigger();
    if (!isValid) {
      const errors = reactHookForm.formState.errors;
      const firstErrorKey = Object.keys(errors)[0] as keyof typeof errors;
      const firstError = errors[firstErrorKey];
      const message =
        firstError && typeof firstError === "object" && "message" in firstError
          ? String(firstError.message)
          : "Por favor corrige los errores del formulario";
      const { error: notifyError } = await import("@/lib/api/services");
      notifyError(message);
      return;
    }

    setIsSubmitting(true);

    try {
      const values = reactHookForm.getValues();
      const result = await onSubmit(values);

      // Resetear el formulario después de submit exitoso
      reactHookForm.reset(defaultValues);

      // Mostrar mensaje de éxito si está configurado
      if (showSuccess && successMessage) {
        const message =
          typeof successMessage === "function"
            ? successMessage(values)
            : successMessage;
        // Importar notificationService dinámicamente para evitar dependencia circular
        const { success } = await import("@/lib/api/services");
        success(message);
      }

      // Callback de éxito
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      // Manejar el error
      if (showErrors) {
        handleApiError(error, errorContext);
      }

      // Setear error del formulario
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      setFormError(errorMessage);

      // Callback de error
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resetea el formulario a los valores iniciales
   */
  const resetForm = () => {
    reactHookForm.reset(defaultValues);
    setFormError(null);
  };

  /**
   * Setea el valor de un campo específico
   */
  const setFieldValue = (field: keyof z.infer<T>, value: unknown) => {
    reactHookForm.setValue(field as Path<z.infer<T>>, value);
    // Limpiar error del campo
    reactHookForm.clearErrors(field as Path<z.infer<T>>);
  };

  /**
   * Setea múltiples valores del formulario
   */
  const setFieldValues = (values: Partial<z.infer<T>>) => {
    Object.entries(values).forEach(([field, value]) => {
      reactHookForm.setValue(field as Path<z.infer<T>>, value);
      reactHookForm.clearErrors(field as Path<z.infer<T>>);
    });
  };

  return {
    isSubmitting,
    formError,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldValues,
    values: reactHookForm.watch(),
    errors: reactHookForm.formState.errors,
    register: reactHookForm.register,
    setValue: reactHookForm.setValue,
    getValues: reactHookForm.getValues,
    trigger: reactHookForm.trigger,
    formState: reactHookForm.formState,
    reset: reactHookForm.reset,
    clearErrors: reactHookForm.clearErrors,
    setError: reactHookForm.setError,
    watch: reactHookForm.watch,
    control: reactHookForm.control,
  };
}

/**
 * Hook simplificado para formularios sin validación Zod
 *
 * @param defaultValues - Valores iniciales del formulario
 * @param onSubmit - Función de submit del formulario
 * @param options - Opciones adicionales
 * @returns Objeto con funciones y estado del formulario
 *
 * @example
 * const form = useFormSimple(
 *   { name: "", email: "" },
 *   async (values) => {
 *     await createCustomer(values);
 *   }
 * );
 */
export function useFormSimple<T extends Record<string, unknown>, R = void>(
  defaultValues: T,
  onSubmit: (values: T) => Promise<R>,
  options?: Partial<
    Omit<
      UseFormOptions<unknown, R>,
      "defaultValues" | "onSubmit" | "validationSchema"
    >
  >,
) {
  return useForm({
    defaultValues,
    onSubmit,
    ...options,
  });
}

/**
 * Hook para formularios con validación asíncrona
 *
 * @param defaultValues - Valores iniciales del formulario
 * @param validationSchema - Esquema de validación Zod
 * @param onSubmit - Función de submit del formulario
 * @param options - Opciones adicionales
 * @returns Objeto con funciones y estado del formulario
 *
 * @example
 * const form = useFormAsync(
 *   { email: "" },
 *   z.object({
 *     email: z.string().email().refine(async (email) => {
 *       return !(await isEmailTaken(email));
 *     }, "El email ya está en uso"),
 *   }),
 *   async (values) => {
 *     await createUser(values);
 *   }
 * );
 */
export function useFormAsync<
  T extends z.ZodType<unknown, unknown, unknown>,
  R = void,
>(
  defaultValues: z.infer<T>,
  validationSchema: T,
  onSubmit: (values: z.infer<T>) => Promise<R>,
  options?: Partial<
    Omit<
      UseFormOptions<T, R>,
      "defaultValues" | "validationSchema" | "onSubmit"
    >
  >,
) {
  return useForm({
    defaultValues,
    validationSchema,
    onSubmit,
    ...options,
  });
}

/**
 * Exportar tipos y funciones
 */
export type {
  UseFormOptions as UseFormOptionsBase,
  UseFormReturnExtended as UseFormReturnExtendedBase,
};
