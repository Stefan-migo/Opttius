import dynamic from "next/dynamic";
import { Suspense } from "react";

const WorkOrderDetailContent = dynamic(
  () => import("./_components/WorkOrderDetailContent"),
  { ssr: false },
);

// ponytail: removed server auth guard (createClient/getUser), moved to client
// side. Add back if unauthenticated flashes occur before client bundle loads.

export default function WorkOrderDetailPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <WorkOrderDetailContent />
    </Suspense>
  );
}
