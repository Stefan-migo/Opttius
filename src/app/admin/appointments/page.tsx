import dynamic from "next/dynamic";
import { Suspense } from "react";

const AppointmentsContent = dynamic(
  () => import("./_components/AppointmentsContent"),
  { ssr: false },
);

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
