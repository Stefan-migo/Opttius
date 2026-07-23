"use client";

import { Copy, Key, Link2, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OpticasToken {
  id: string;
  token_preview: string;
  expires_at: string;
  label: string | null;
  created_at: string;
}

export function OpticasTokensSection() {
  const [opticasTokens, setOpticasTokens] = useState<OpticasToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [newTokenModal, setNewTokenModal] = useState<{ open: boolean; url: string }>({ open: false, url: "" });

  const fetchOpticasTokens = useCallback(async () => {
    setTokensLoading(true);
    try {
      const res = await fetch("/api/admin/opticas-access-tokens");
      const data = await res.json();
      if (res.ok) setOpticasTokens(data.tokens ?? []);
    } catch {
      toast.error("Error al cargar tokens");
    } finally {
      setTokensLoading(false);
    }
  }, []);

  useEffect(() => { fetchOpticasTokens(); }, [fetchOpticasTokens]);

  const handleGenerate = async (label?: string) => {
    setGeneratingToken(true);
    try {
      const res = await fetch("/api/admin/opticas-access-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || null, expires_in_days: 90 }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al generar enlace"); return; }
      setNewTokenModal({ open: true, url: data.url });
      fetchOpticasTokens();
      toast.success("Enlace generado. Cópialo ahora; no se mostrará de nuevo.");
    } catch { toast.error("Error de conexión"); }
    finally { setGeneratingToken(false); }
  };

  const handleCopyUrl = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/opticas-access-tokens/${id}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al obtener URL"); return; }
      await navigator.clipboard.writeText(data.url);
      toast.success("URL copiada al portapapeles");
    } catch { toast.error("Error al copiar"); }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/opticas-access-tokens/${id}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); toast.error(data.error || "Error al revocar"); return; }
      toast.success("Token revocado");
      fetchOpticasTokens();
    } catch { toast.error("Error de conexión"); }
  };

  return (
    <>
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Acceso ópticas conocidas
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Genera enlaces únicos para ópticas de confianza. Cada enlace es revocable y tiene expiración.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button disabled={generatingToken} onClick={() => handleGenerate()}>
            {generatingToken ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generando...</> : <><Link2 className="h-4 w-4 mr-2" /> Generar enlace único</>}
          </Button>

          {tokensLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando tokens…</div>
          ) : opticasTokens.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Vista previa</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opticasTokens.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.label || "—"}</TableCell>
                      <TableCell><code className="text-xs">{t.token_preview}</code></TableCell>
                      <TableCell>{new Date(t.expires_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleCopyUrl(t.id)}><Copy className="h-3 w-3 mr-1" /> Copiar URL</Button>
                        <Button size="sm" variant="outline" onClick={() => handleRevoke(t.id)}><Trash2 className="h-3 w-3 mr-1" /> Revocar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={newTokenModal.open} onOpenChange={(open) => setNewTokenModal((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enlace generado</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Copia este enlace ahora. No se mostrará de nuevo.</p>
          <div className="flex gap-2">
            <Input readOnly className="font-mono text-sm" value={newTokenModal.url} />
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(newTokenModal.url); toast.success("URL copiada"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
