"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Star, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EncuestaPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState<boolean | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      setLoading(false);
      return;
    }
    fetch(`/api/surveys/${encodeURIComponent(token)}/validate`)
      .then((res) => res.json())
      .then((data) => {
        setValid(data.valid === true);
        setOrganizationName(data.organization_name || "Nuestra Óptica");
        setLoading(false);
      })
      .catch(() => {
        setValid(false);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === null || score < 1 || score > 5) {
      toast.error("Por favor selecciona una puntuación");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/surveys/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, score, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al enviar");
      }
      setSubmitted(true);
      toast.success("¡Gracias por tu opinión!");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Error al enviar. Intenta de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-epoch-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-epoch-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <Card className="border-epoch-primary/20 rounded-xl">
            <CardHeader>
              <CardTitle className="text-epoch-primary">
                Enlace inválido o expirado
              </CardTitle>
              <CardDescription>
                Este enlace de encuesta ya no está disponible o ha expirado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-epoch-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card className="border-epoch-primary/20 bg-epoch-primary/5 rounded-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-epoch-primary/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-epoch-primary" />
              </div>
              <CardTitle className="text-2xl font-display font-bold text-epoch-primary">
                ¡Gracias por tu opinión!
              </CardTitle>
              <CardDescription className="text-epoch-primary/80">
                Tu respuesta nos ayuda a mejorar nuestro servicio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-epoch-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-epoch-primary/70 hover:text-epoch-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <h1 className="text-2xl font-display font-bold text-epoch-primary">
            Encuesta de satisfacción
          </h1>
          <p className="text-epoch-primary/80 mt-1">
            {organizationName} te invita a calificar tu experiencia
          </p>
        </div>

        <Card className="rounded-xl border border-border">
          <CardHeader>
            <CardTitle className="font-display text-epoch-primary">
              ¿Cómo calificarías tu experiencia?
            </CardTitle>
            <CardDescription>
              Tu opinión nos ayuda a mejorar. Selecciona de 1 a 5 estrellas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label>Puntuación</Label>
                <div className="flex gap-2 justify-center py-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScore(n)}
                      className="p-2 rounded-lg transition-colors hover:bg-epoch-primary/10 focus:outline-none focus:ring-2 focus:ring-epoch-primary/30"
                      aria-label={`${n} estrellas`}
                    >
                      <Star
                        className={`h-10 w-10 ${
                          score !== null && n <= score
                            ? "fill-epoch-accent text-epoch-accent"
                            : "text-epoch-primary/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comentario (opcional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="¿Algo que quieras agregar?"
                  rows={3}
                  maxLength={1000}
                  className="resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={score === null || submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar encuesta"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
