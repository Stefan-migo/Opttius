import dynamic from "next/dynamic";
import { Suspense } from "react";

const AnalyticsContent = dynamic(
  () => import("./_components/AnalyticsContent"),
  { ssr: false },
);

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
