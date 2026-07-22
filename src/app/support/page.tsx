"use client";

import { useState } from "react";

import { SuccessView } from "./_components/SuccessView";
import { SupportTicketForm } from "./_components/SupportTicketForm";

export default function SupportPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  if (isSuccess && ticketNumber) {
    return (
      <SuccessView
        ticketNumber={ticketNumber}
        onReset={() => {
          setIsSuccess(false);
          setTicketNumber(null);
        }}
      />
    );
  }

  return (
    <SupportTicketForm
      onSuccess={(num) => {
        setIsSuccess(true);
        setTicketNumber(num);
      }}
    />
  );
}
