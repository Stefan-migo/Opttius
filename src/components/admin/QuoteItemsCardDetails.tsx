"use client";

import type { Quote } from "@/hooks/useQuote";

import { FrameDetailsCard } from "./_quote-detail/FrameDetailsCard";
import { LensDetailsCard } from "./_quote-detail/LensDetailsCard";
import { PrescriptionDetailsCard } from "./_quote-detail/PrescriptionDetailsCard";
import { QuoteNotesCard } from "./_quote-detail/QuoteNotesCard";

type PrescriptionFields = {
  od_sphere: number | null; od_cylinder: number | null; od_axis: number | null;
  od_add: number | null; od_pd: number | null; od_near_pd: number | null;
  os_sphere: number | null; os_cylinder: number | null; os_axis: number | null;
  os_add: number | null; os_pd: number | null; os_near_pd: number | null;
  frame_pd: number | null; height_segmentation: number | null;
  prism_od: string | null; prism_os: string | null;
  issued_by: string | null; notes: string | null;
};

export function QuoteItemsCardDetails({ quote }: { quote: Quote }) {
  const rx = quote.prescription as PrescriptionFields | null;
  const isTwoSeparate = quote.presbyopia_solution === "two_separate";

  return (
    <>
      <PrescriptionDetailsCard rx={rx} />
      {isTwoSeparate ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FrameDetailsCard
            customer_own_frame={quote.customer_own_frame} frame_brand={quote.frame_brand}
            frame_color={quote.frame_color} frame_model={quote.frame_model}
            frame_name={quote.frame_name} frame_price={quote.frame_price}
            frame_size={quote.frame_size} frame_sku={quote.frame_sku}
            title="Marco de Lejos"
          />
          <FrameDetailsCard
            customer_own_frame={quote.customer_own_near_frame} frame_brand={quote.near_frame_brand}
            frame_color={quote.near_frame_color} frame_model={quote.near_frame_model}
            frame_name={quote.near_frame_name} frame_price={quote.near_frame_price}
            frame_size={quote.near_frame_size} frame_sku={quote.near_frame_sku}
            title="Marco de Cerca"
          />
        </div>
      ) : (
        <FrameDetailsCard
          customer_own_frame={quote.customer_own_frame} frame_brand={quote.frame_brand}
          frame_color={quote.frame_color} frame_model={quote.frame_model}
          frame_name={quote.frame_name} frame_price={quote.frame_price}
          frame_size={quote.frame_size} frame_sku={quote.frame_sku}
        />
      )}
      {isTwoSeparate ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LensDetailsCard
            badgeText="Dos lentes separados - Lejos" cost={quote.far_lens_cost}
            familyName={quote.far_lens_family?.name} lens={quote as never}
            title="Lente de Lejos"
          />
          <LensDetailsCard
            badgeText="Dos lentes separados - Cerca" cost={quote.near_lens_cost}
            familyName={quote.near_lens_family?.name} lens={quote as never}
            title="Lente de Cerca"
          />
        </div>
      ) : (
        <LensDetailsCard
          cost={quote.lens_cost} family={quote.lens_family} lens={quote}
        />
      )}
      <QuoteNotesCard
        customerNotes={quote.customer_notes} notes={quote.notes}
        termsAndConditions={quote.terms_and_conditions}
      />
    </>
  );
}
