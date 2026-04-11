/**
 * POS Page - Point of Sale for Optical Shops
 *
 * This is the main entry point for the POS module.
 * Uses the refactored POSPageWithProvider which provides the POS context.
 */

import { POSPageWithProvider } from "./POSPageWithProvider";

export default function POSPage() {
  return <POSPageWithProvider />;
}
