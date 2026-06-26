"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuoteActionsCard } from "@/components/admin/QuoteActionsCard";
import { QuoteInfoCard } from "@/components/admin/QuoteInfoCard";
import { QuoteItemsCard } from "@/components/admin/QuoteItemsCard";
import { useQuote } from "@/hooks/useQuote";

export default function QuoteDetailPage() {
  const router = useRouter();
  const {
    quote,
    loading,
    loadingToPos,
    sending,
    showSendDialog,
    sendEmail,
    getCustomerId,
    handleLoadToPOS,
    handlePrint,
    handleSendQuote,
    setShowSendDialog,
    setSendEmail,
  } = useQuote();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Cargando...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Presupuesto no encontrado
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QuoteActionsCard
        quote={quote}
        loadingToPos={loadingToPos}
        sending={sending}
        showSendDialog={showSendDialog}
        sendEmail={sendEmail}
        onLoadToPOS={handleLoadToPOS}
        onPrint={handlePrint}
        onSendQuote={handleSendQuote}
        onShowSendDialog={setShowSendDialog}
        onSendEmailChange={setSendEmail}
        onBack={() => router.back()}
      />

      {/* Main Content */}
      <Tabs className="space-y-6" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="pricing">Precios</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="overview">
          <QuoteInfoCard quote={quote} getCustomerId={getCustomerId} />
        </TabsContent>

        <TabsContent className="space-y-6" value="details">
          <QuoteItemsCard quote={quote} tab="details" />
        </TabsContent>

        <TabsContent className="space-y-6" value="pricing">
          <QuoteItemsCard quote={quote} tab="pricing" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
