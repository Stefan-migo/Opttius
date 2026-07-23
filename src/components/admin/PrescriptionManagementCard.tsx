import type { Customer } from "@/lib/api/services";

import { AppointmentsSection, PrescriptionsSection, QuotesSection } from "./_components/PrescriptionManagementSections";

interface PrescriptionManagementCardProps {
  customer: Customer;
  section: "prescriptions" | "appointments" | "quotes";
  onNew?: () => void;
  onEdit?: (item: unknown) => void;
}

export function PrescriptionManagementCard({ customer, section, onNew, onEdit }: PrescriptionManagementCardProps) {
  switch (section) {
    case "prescriptions": return <PrescriptionsSection customer={customer} onNew={onNew} onEdit={onEdit} />;
    case "appointments": return <AppointmentsSection customer={customer} onNew={onNew} onEdit={onEdit} />;
    case "quotes": return <QuotesSection customer={customer} onNew={onNew} />;
    default: return null;
  }
}
