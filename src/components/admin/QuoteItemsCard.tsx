"use client";

import type { Quote } from "@/hooks/useQuote";

import { QuoteItemsCardDetails } from "./QuoteItemsCardDetails";
import { QuoteItemsCardPricing } from "./QuoteItemsCardPricing";

interface QuoteItemsCardProps {
  quote: Quote;
  tab: "details" | "pricing";
}

export function QuoteItemsCard({ quote, tab }: QuoteItemsCardProps) {
  if (tab === "pricing") {
    return <QuoteItemsCardPricing quote={quote} />;
  }
  return <QuoteItemsCardDetails quote={quote} />;
}
