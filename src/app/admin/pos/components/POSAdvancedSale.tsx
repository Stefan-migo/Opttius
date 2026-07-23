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
import { POSAdvancedSaleCustomerTab } from "./POSAdvancedSaleCustomerTab";
import { POSAdvancedSaleFrameTab } from "./POSAdvancedSaleFrameTab";
import { POSAdvancedSaleLensesTab } from "./POSAdvancedSaleLensesTab";
import { POSAdvancedSalePricingTab } from "./POSAdvancedSalePricingTab";
import { usePOSAdvancedSale } from "./usePOSAdvancedSale";

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
              externalPrescriptionData={s.externalPrescriptionData}
              loadingPrescriptions={s.loadingPrescriptions}
              orderFormData={s.orderFormData}
              prescriptions={s.prescriptions}
              quickCustomerEmail={props.quickCustomerEmail}
              quickCustomerName={props.quickCustomerName}
              quickCustomerPhone={props.quickCustomerPhone}
              quickCustomerRUT={props.quickCustomerRUT}
              selectedPrescription={s.selectedPrescription}
              setExternalPrescriptionData={s.setExternalPrescriptionData}
              setOrderFormData={s.setOrderFormData}
              setSelectedPrescription={s.setSelectedPrescription}
              setUseExternalPrescription={s.setUseExternalPrescription}
              suggestLensFamily={s.suggestLensFamily}
              useExternalPrescription={s.useExternalPrescription}
              onCustomerChange={props.onCustomerChange}
              onNextTab={() => s.setOrderFormTab("frame")}
            />
          </TabsContent>

          <TabsContent className="h-auto m-0 p-4" value="frame">
            <POSAdvancedSaleFrameTab
              customerOwnNearFrame={s.customerOwnNearFrame}
              frameLoading={s.frameLoading}
              frameResults={s.frameResults}
              frameSearchTerm={s.frameSearchTerm}
              nearFrameLoading={s.nearFrameLoading}
              nearFrameResults={s.nearFrameResults}
              nearFrameSearchTerm={s.nearFrameSearchTerm}
              orderFormData={s.orderFormData}
              selectedFrame={s.selectedFrame}
              selectedNearFrame={s.selectedNearFrame}
              setCustomerOwnNearFrame={s.setCustomerOwnNearFrame}
              setFrameSearchTerm={s.setFrameSearchTerm}
              setNearFrameSearchTerm={s.setNearFrameSearchTerm}
              setOrderFormData={s.setOrderFormData}
              setSelectedFrame={s.setSelectedFrame}
              setSelectedNearFrame={s.setSelectedNearFrame}
              onNextTab={() => s.setOrderFormTab("lenses")}
              onPrevTab={() => s.setOrderFormTab("customer")}
            />
          </TabsContent>

          <TabsContent className="h-auto m-0 p-4" value="lenses">
            <POSAdvancedSaleLensesTab
              branchId={props.branchId}
              contactLensConfig={s.contactLensConfig}
              customer={props.customer}
              filteredTreatments={s.filteredTreatments}
              handleUpdateTreatmentPrice={s.handleUpdateTreatmentPrice}
              lensFamilies={s.lensFamilies}
              nearLensPriceValue={s.nearLensPriceValue}
              orderFormData={s.orderFormData}
              selectedPrescription={s.selectedPrescription}
              setContactLensConfig={s.setContactLensConfig}
              setOrderFormData={s.setOrderFormData}
              toggleTreatment={s.toggleTreatment}
              onNextTab={() => s.setOrderFormTab("pricing")}
              onPrevTab={() => s.setOrderFormTab("frame")}
            />
          </TabsContent>

          <TabsContent className="h-auto m-0 p-4" value="pricing">
            <POSAdvancedSalePricingTab
              creatingQuote={s.creatingQuote}
              customer={props.customer}
              customerOwnNearFrame={s.customerOwnNearFrame}
              discountAmount={s.discountAmount}
              discountType={s.discountType}
              discountValue={s.discountValue}
              handleAddToCart={s.handleAddToCart}
              handleCreateQuote={s.handleCreateQuote}
              lensFamilies={s.lensFamilies}
              lensPrice={s.lensPrice}
              nearLensPriceValue={s.nearLensPriceValue}
              orderFormData={s.orderFormData}
              quickCustomerEmail={props.quickCustomerEmail}
              quickCustomerName={props.quickCustomerName}
              quickCustomerPhone={props.quickCustomerPhone}
              quickCustomerRUT={props.quickCustomerRUT}
              selectedFrame={s.selectedFrame}
              selectedNearFrame={s.selectedNearFrame}
              selectedPrescription={s.selectedPrescription}
              setDiscountType={s.setDiscountType}
              setDiscountValue={s.setDiscountValue}
              setOrderFormData={s.setOrderFormData}
              totalPrice={s.totalPrice}
              treatments={s.treatments}
              treatmentsPrice={s.treatmentsPrice}
              useExternalPrescription={s.useExternalPrescription}
              onPrevTab={() => s.setOrderFormTab("lenses")}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
