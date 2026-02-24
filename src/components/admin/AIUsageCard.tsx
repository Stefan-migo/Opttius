"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu, DollarSign, RefreshCw, Zap } from "lucide-react";

interface UsageSummary {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  requestCount: number;
}

interface UsageByModel {
  model: string;
  promptTokens: number;
  completionTokens: number;
  count: number;
  totalTokens: number;
}

interface AIUsageResponse {
  organizationId: string;
  period: { days: number; startDate: string };
  summary: UsageSummary;
  byModel: UsageByModel[];
  recentLogs: Array<{
    provider: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    endpoint: string;
    created_at: string;
  }>;
}

export function AIUsageCard() {
  const [data, setData] = useState<AIUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai/usage?days=${days}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load usage");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Error loading AI usage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [days]);

  if (loading && !data) {
    return (
      <Card className="rounded-xl border-epoch-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-epoch-primary">
            <Cpu className="h-5 w-5" />
            Uso de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Cargando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-epoch-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-epoch-primary">
          <Cpu className="h-5 w-5" />
          Uso de IA
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={String(days)}
            onValueChange={(v) => setDays(Number(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
            </SelectContent>
          </Select>
          <RefreshCw
            className="h-4 w-4 cursor-pointer text-epoch-primary hover:opacity-80"
            onClick={fetchUsage}
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-destructive text-sm py-4">{error}</div>}
        {data && !error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-epoch-primary/20 p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Zap className="h-4 w-4" />
                  Total tokens
                </div>
                <div className="text-lg font-semibold text-epoch-primary mt-1">
                  {data.summary.totalTokens.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-epoch-primary/20 p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <DollarSign className="h-4 w-4" />
                  Coste estimado
                </div>
                <div className="text-lg font-semibold text-epoch-primary mt-1">
                  ${data.summary.estimatedCostUsd.toFixed(4)}
                </div>
              </div>
              <div className="rounded-xl border border-epoch-primary/20 p-3">
                <div className="text-muted-foreground text-xs">Llamadas</div>
                <div className="text-lg font-semibold text-epoch-primary mt-1">
                  {data.summary.requestCount}
                </div>
              </div>
              <div className="rounded-xl border border-epoch-primary/20 p-3">
                <div className="text-muted-foreground text-xs">
                  Input tokens
                </div>
                <div className="text-lg font-semibold text-epoch-primary mt-1">
                  {data.summary.totalPromptTokens.toLocaleString()}
                </div>
              </div>
            </div>
            {data.byModel.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Por modelo</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Llamadas</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byModel.map((m) => (
                      <TableRow key={m.model}>
                        <TableCell className="font-mono text-xs">
                          {m.model}
                        </TableCell>
                        <TableCell className="text-right">{m.count}</TableCell>
                        <TableCell className="text-right">
                          {m.totalTokens.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
