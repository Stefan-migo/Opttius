/**
 * POSAdvancedSale — Complete Optical Sale Form
 *
 * Handles "Venta Óptica" / "Crear Orden Completa" functionality.
 * State managed via usePOSAdvancedSale hook; rendering delegated to 4 tab components.
 */
"use client";

import { Glasses, Sparkles, Tag, User } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { POSAdvancedSaleProps } from "./POSAdvancedSale.types";
import { usePOSAdvancedSale } from "./usePOSAdvancedSale";
import { POSAdvancedSaleCustomerTab } from "./POSAdvancedSaleCustomerTab";
import { POSAdvancedSaleFrameTab } from "./POSAdvancedSaleFrameTab";
import { POSAdvancedSaleLensesTab } from "./POSAdvancedSaleLensesTab";
import { POSAdvancedSalePricingTab } from "./POSAdvancedSalePricingTab";

export function POSAdvancedSale(props: POSAdvancedSaleProps) {
  const s = usePOSAdvancedSale(props);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs
        className="flex flex-col h-full"
        value={s.orderFormTab}
        onValueChange={(v) => s.setOrderFormTab(v as typeof s.orderFormTab)}
      >
        <TabsList className="grid w-full grid-cols-4 gap-1 h-auto min-h-[44px] mx-4 mt-2 flex-shrink-0">
          <TabsTrigger className="text-xs sm:text-sm py-2" value="customer">
            <User className="h-4 w-4 mr-2" />
            Cliente
          </TabsTrigger>
          <TabsTrigger className="text-xs sm:text-sm py-2" value="frame">
            <Glasses className="h-4 w-4 mr-2" />
            Marco
          </TabsTrigger>
          <TabsTrigger className="text-xs sm:text-sm py-2" value="lenses">
            <Sparkles className="h-4 w-4 mr-2" />
            Lentes
          </TabsTrigger>
          <TabsTrigger className="text-xs sm:text-sm py-2" value="pricing">
            <Tag className="h-4 w-4 mr-2" />
            Precios
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
          <TabsContent className="h-auto m-0 p-4" value="customer">
            <POSAdvancedSaleCustomerTab
              customer={props.customer}
              onCustomerChange={props.onCustomerChange}
              quickCustomerName={props.quickCustomerName}
              quickCustomerRUT={props.quickCustomerRUT}
              quickCustomerEmail={props.quickCustomerEmail}
              quickCustomerPhone={props.quickCustomerPhone}
              prescriptions={s.prescriptions}
              selectedPrescription={s.selectedPrescription}
              setSelectedPrescription={s.setSelectedPrescription}
              loadingPrescriptions={s.loadingPrescriptions}
              useExternalPrescription={s.useExternalPrescription}
              setUseExternalPrescription={s.setUseExternalPrescription}
              externalPrescriptionData={s.externalPrescriptionData}
              setExternalPrescriptionData={s.setExternalPrescriptionData}
              orderFormData={s.orderFormData}
              setOrderFormData={s.setOrderFormData}
              suggestLensFamily={s.suggestLensFamily}
              onNextTab={() => s.setOrderFormTab("frame")}
            />
          </TabsContent>

          <TabsContent className="h-auto m-0 p-4" value="frame">
            <POSAdvancedSaleFrameTab
              orderFormData={s.orderFormData}
              setOrderFormData={s.setOrderFormData}
              selectedFrame={s.selectedFrame}
              setSelectedFrame={s.setSelectedFrame}
              frameSearchTerm={s.frameSearchTerm}
              setFrameSearchTerm={s.setFrameSearchTerm}
              frameResults={s.frameResults}
              frameLoading={s.frameLoading}
              nearFrameSearchTerm={s.nearFrameSearchTerm}
              setNearFrameSearchTerm={s.setNearFrameSearchTerm}
              nearFrameResults={s.nearFrameResults}
              nearFrameLoading={s.nearFrameLoading}
              selectedNearFrame={s.selectedNearFrame}
              setSelectedNearFrame={s.setSelectedNearFrame}
              customerOwnNearFrame={s.customerOwnNearFrame}
              setCustomerOwnNearFrame={s.setCustomerOwnNearFrame}
              onPrevTab={() => s.setOrderFormTab("customer")}
              onNextTab={() => s.setOrderFormTab("lenses")}
            />
          </TabsContent>

          <TabsContent className="h-auto m-0 p-4" value="lenses">
            <POSAdvancedSaleLensesTab
              orderFormData={s.orderFormData}
              setOrderFormData={s.setOrderFormData}
              lensFamilies={s.lensFamilies}
              filteredTreatments={s.filteredTreatments}
              toggleTreatment={s.toggleTreatment}
              handleUpdateTreatmentPrice={s.handleUpdateTreatmentPrice}
              nearLensPriceValue={s.nearLensPriceValue}
              contactLensConfig={s.contactLensConfig}
              setContactLensConfig={s.setContactLensConfig}
              selectedPrescription={s.selectedPrescription}
              customer={props.customer}
              branchId={props.branchId}
              onPrevTab={() => s.setOrderFormTab("frame")}
              onNextTab={() => s.setOrderFormTab("pricing")}
            />
          </TabsContent>

          <TabsContent className="h-auto m-0 p-4" value="pricing">
            <POSAdvancedSalePricingTab
              customer={props.customer}
              quickCustomerName={props.quickCustomerName}
              quickCustomerRUT={props.quickCustomerRUT}
              quickCustomerEmail={props.quickCustomerEmail}
              quickCustomerPhone={props.quickCustomerPhone}
              selectedPrescription={s.selectedPrescription}
              useExternalPrescription={s.useExternalPrescription}
              orderFormData={s.orderFormData}
              selectedFrame={s.selectedFrame}
              customerOwnNearFrame={s.customerOwnNearFrame}
              selectedNearFrame={s.selectedNearFrame}
              lensFamilies={s.lensFamilies}
              treatments={s.treatments}
              lensPrice={s.lensPrice}
              nearLensPriceValue={s.nearLensPriceValue}
              treatmentsPrice={s.treatmentsPrice}
              totalPrice={s.totalPrice}
              discountAmount={s.discountAmount}
              discountType={s.discountType}
              setDiscountType={s.setDiscountType}
              discountValue={s.discountValue}
              setDiscountValue={s.setDiscountValue}
              handleAddToCart={s.handleAddToCart}
              handleCreateQuote={s.handleCreateQuote}
              creatingQuote={s.creatingQuote}
              setOrderFormData={s.setOrderFormData}
              onPrevTab={() => s.setOrderFormTab("lenses")}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
