"use client";

import { Loader2, RefreshCw, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { useSurveyConfig } from "@/app/admin/system/hooks/useSurveyConfig";
import { useSurveyResponses } from "@/app/admin/system/hooks/useSurveyResponses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export default function SurveysConfig() {
  const { config, isLoading, updateConfig, isUpdating } = useSurveyConfig();
  const {
    data: responsesData,
    isLoading: responsesLoading,
    refetch,
  } = useSurveyResponses(1, 20);
  const [localEnabled, setLocalEnabled] = useState(false);
  const [localScale, setLocalScale] = useState<"1-5" | "1-10">("1-5");
  const [localQuestion, setLocalQuestion] = useState("");

  useEffect(() => {
    if (config) {
      setLocalEnabled(config.survey_enabled);
      setLocalScale(config.survey_scale_type);
      setLocalQuestion(config.survey_question);
    }
  }, [config]);

  const handleSave = async () => {
    await updateConfig({
      survey_enabled: localEnabled,
      survey_scale_type: localScale,
      survey_question: localQuestion,
    });
  };

  const hasChanges =
    config &&
    (localEnabled !== config.survey_enabled ||
      localScale !== config.survey_scale_type ||
      localQuestion !== config.survey_question);

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
      </div>
    );
  }

  const responses = responsesData?.responses ?? [];
  const metrics = responsesData?.metrics;
  const pagination = responsesData?.pagination;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Configuración de encuestas
          </CardTitle>
          <CardDescription>
            Activa las encuestas de satisfacción que se envían cuando un cliente
            recibe sus lentes. El enlace se incluye en el email de entrega
            completada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base font-medium" htmlFor="survey-enabled">
                Encuestas activas
              </Label>
              <p className="text-sm text-muted-foreground">
                Enviar encuesta por email cuando se marque un trabajo como
                entregado
              </p>
            </div>
            <Switch
              checked={localEnabled}
              id="survey-enabled"
              onCheckedChange={setLocalEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de escala</Label>
            <Select
              value={localScale}
              onValueChange={(v) => setLocalScale(v as "1-5" | "1-10")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-5">1 a 5 estrellas</SelectItem>
                <SelectItem value="1-10">1 a 10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="survey-question">
              Pregunta opcional (personalizada)
            </Label>
            <Textarea
              id="survey-question"
              maxLength={500}
              placeholder="¿Cómo calificarías tu experiencia?"
              rows={2}
              value={localQuestion}
              onChange={(e) => setLocalQuestion(e.target.value)}
            />
          </div>

          {hasChanges && (
            <Button disabled={isUpdating} onClick={handleSave}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar configuración"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>Respuestas del último mes</CardDescription>
          </div>
          <Button
            disabled={responsesLoading}
            size="sm"
            variant="outline"
            onClick={() => refetch()}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${responsesLoading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {responsesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-epoch-primary" />
            </div>
          ) : metrics ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Total respuestas
                </p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Promedio</p>
                <p className="text-2xl font-bold">
                  {metrics.average.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg border p-4 col-span-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Distribución
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Badge className="font-normal" key={n} variant="secondary">
                      {n}★: {metrics.distribution[n] ?? 0}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="font-medium mb-3">Respuestas recientes</h3>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Aún no hay respuestas. Las encuestas se envían cuando marcas un
                trabajo como entregado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Puntuación</TableHead>
                    <TableHead>Comentario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((r) => {
                    const wo = r.lab_work_orders;
                    const cust = r.customers;
                    const name = cust
                      ? [cust.first_name, cust.last_name]
                          .filter(Boolean)
                          .join(" ") ||
                        cust.email ||
                        "—"
                      : "—";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{name}</TableCell>
                        <TableCell>{wo?.work_order_number ?? "—"}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {r.score}
                            <Star className="h-4 w-4 fill-epoch-accent text-epoch-accent" />
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {r.comment || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {pagination && pagination.total_count > pagination.limit && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando {responses.length} de {pagination.total_count}{" "}
                respuestas
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
