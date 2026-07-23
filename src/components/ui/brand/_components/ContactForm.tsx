"use client";

import { Check, Mail, MessageSquare, Phone, User } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FormContainer, FormField } from "../FormComponents";

interface ContactFormData { name: string; email: string; phone: string; subject: string; message: string; interests: string[]; }

export function ContactForm({ onSubmit: onSubmitProp }: { onSubmit?: (data: ContactFormData) => void }) {
  const [formData, setFormData] = useState<ContactFormData>({ name: "", email: "", phone: "", subject: "", message: "", interests: [] });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const e: Partial<Record<keyof ContactFormData, string>> = {};
    if (!formData.name.trim()) e.name = "El nombre es requerido";
    if (!formData.email.trim()) e.email = "El email es requerido";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Email inválido";
    if (!formData.message.trim()) e.message = "El mensaje es requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (onSubmitProp) onSubmitProp(formData);
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const update = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (isSubmitted) return (
    <FormContainer subtitle="Te contactaremos pronto" title="¡Mensaje Enviado!" variant="elegant">
      <div className="text-center py-8"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8 text-green-600" /></div><p className="text-muted-foreground mb-6">Gracias por contactarnos. Hemos recibido tu mensaje y te responderemos dentro de las próximas 24 horas.</p><Button variant="line-primary" onClick={() => { setIsSubmitted(false); setFormData({ name: "", email: "", phone: "", subject: "", message: "", interests: [] }); }}>Enviar Otro Mensaje</Button></div>
    </FormContainer>
  );

  return (
    <FormContainer badge="Consulta Gratuita" subtitle="Estamos aquí para ayudarte en tu camino hacia la belleza consciente" title="Ponte en Contacto" variant="elegant">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField required error={errors.name} icon={<User className="w-4 h-4" />} label="Nombre Completo" name="name" placeholder="Tu nombre" success={formData.name && !errors.name ? "Perfecto" : undefined} type="text" />
          <FormField required error={errors.email} icon={<Mail className="w-4 h-4" />} label="Email" name="email" placeholder="tu@email.com" success={formData.email && !errors.email ? "Email válido" : undefined} type="email" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField helper="Te llamaremos si prefieres una consulta telefónica" icon={<Phone className="w-4 h-4" />} label="Teléfono (Opcional)" name="phone" placeholder="+54 9 11 1234-5678" type="tel" />
          <FormField label="Asunto" name="subject" options={[{ value: "products", label: "Consulta sobre Productos" }, { value: "membership", label: "Programa de Membresía" }, { value: "custom", label: "Rutina Personalizada" }, { value: "support", label: "Soporte Técnico" }, { value: "other", label: "Otro" }]} placeholder="Selecciona un tema" type="select" />
        </div>
        <FormField required error={errors.message} icon={<MessageSquare className="w-4 h-4" />} label="Mensaje" name="message" placeholder="Cuéntanos cómo podemos ayudarte..." rows={5} type="textarea" />
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button className="flex-1" loading={isSubmitting} size="lg" type="submit" variant="line-primary">{isSubmitting ? "Enviando..." : "Enviar Mensaje"}</Button>
          <Button size="lg" type="button" variant="line-outline" onClick={() => { setFormData({ name: "", email: "", phone: "", subject: "", message: "", interests: [] }); setErrors({}); }}>Limpiar</Button>
        </div>
      </form>
    </FormContainer>
  );
}

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false); setIsSubscribed(true);
  };

  if (isSubscribed) return (
    <div className="p-6 text-center border rounded-xl bg-card border-line-primary/10"><div className="flex flex-col items-center space-y-3"><div className="w-12 h-12 bg-line-primary/10 rounded-full flex items-center justify-center"><Check className="w-6 h-6 text-line-primary" /></div><h3 className="font-semibold text-foreground">¡Bienvenida a la comunidad!</h3><p className="text-sm text-muted-foreground">Te enviaremos las mejores tips de belleza natural y ofertas exclusivas.</p></div></div>
  );

  return (
    <div className="p-6 border rounded-xl bg-card border-line-outline">
      <div className="pb-4"><h3 className="text-lg font-semibold">Newsletter OPTTIUS</h3><p className="text-sm text-muted-foreground">Recibe tips exclusivos de belleza natural y ofertas especiales</p></div>
      <form className="flex gap-3" onSubmit={handleSubmit}>
        <Input required className="flex-1" placeholder="tu@email.com" type="email" value={email} variant="line" onChange={(e) => setEmail(e.target.value)} />
        <Button disabled={!email} loading={isLoading} type="submit" variant="line-primary">{isLoading ? "Suscribiendo..." : "Suscribirse"}</Button>
      </form>
    </div>
  );
}
