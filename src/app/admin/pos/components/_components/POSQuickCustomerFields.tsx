"use client";

import { Input } from "@/components/ui/input";
import { formatRUTAsYouType } from "@/lib/utils/rut";

interface POSQuickCustomerFieldsProps {
  customerBusinessName: string;
  onBusinessNameChange: (value: string) => void;
  customerRUT: string;
  onRUTChange: (value: string) => void;
  customerEmail?: string;
  onCustomerEmailChange?: (value: string) => void;
  customerPhone?: string;
  onCustomerPhoneChange?: (value: string) => void;
  showQuickCustomerFields: boolean;
  onShowFieldsChange: (show: boolean) => void;
}

/**
 * POSQuickCustomerFields — inline quick customer data entry fields.
 *
 * Extracted from POSCustomerSearch.tsx.
 */
export function POSQuickCustomerFields({
  customerBusinessName,
  onBusinessNameChange,
  customerRUT,
  onRUTChange,
  customerEmail,
  onCustomerEmailChange,
  customerPhone,
  onCustomerPhoneChange,
  showQuickCustomerFields,
  onShowFieldsChange,
}: POSQuickCustomerFieldsProps) {
  return (
    <div className={showQuickCustomerFields ? "grid grid-cols-2 gap-2" : ""}>
      <div className={showQuickCustomerFields ? "" : "w-full"}>
        <Input
          className="text-xs h-8"
          placeholder="Nombre del cliente"
          type="text"
          value={customerBusinessName}
          onChange={(e) => {
            onBusinessNameChange(e.target.value);
            if (e.target.value.length > 0) {
              onShowFieldsChange(true);
            }
          }}
          onFocus={() => onShowFieldsChange(true)}
        />
      </div>
      {showQuickCustomerFields && (
        <>
          <div>
            <Input
              className="text-xs h-8"
              placeholder="RUT"
              type="text"
              value={customerRUT}
              onChange={(e) =>
                onRUTChange(formatRUTAsYouType(e.target.value))
              }
            />
          </div>
          {onCustomerEmailChange && (
            <div>
              <Input
                className="text-xs h-8"
                placeholder="Email"
                type="email"
                value={customerEmail}
                onChange={(e) => onCustomerEmailChange(e.target.value)}
              />
            </div>
          )}
          {onCustomerPhoneChange && (
            <div>
              <Input
                className="text-xs h-8"
                placeholder="Teléfono"
                type="tel"
                value={customerPhone}
                onChange={(e) => onCustomerPhoneChange(e.target.value)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
