"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type { Appointment, Customer, Prescription } from "@/lib/api/services";
import { customerService } from "@/lib/api/services";

// Local Customer interface for the form state - extended with additional fields
export interface CustomerFormData extends Partial<Customer> {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: string;
  medical_conditions?: string[];
  allergies?: string[];
  medications?: string[];
  medical_notes?: string;
  last_eye_exam_date?: string;
  next_eye_exam_due?: string;
  preferred_contact_method?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  is_active_customer?: boolean;
}

export function useCustomerDetail() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);
  const [editingPrescription, setEditingPrescription] =
    useState<Prescription | null>(null);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [showCreateQuote, setShowCreateQuote] = useState(false);

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const customerData = await customerService.getCustomer(customerId);
      setCustomer(customerData);
      setError(null);
    } catch (err) {
      console.error("Error fetching customer:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  return {
    customerId,
    customer,
    loading,
    error,
    expandedOrders,
    showCreatePrescription,
    editingPrescription,
    showCreateAppointment,
    editingAppointment,
    showCreateQuote,
    fetchCustomer,
    toggleOrderExpansion,
    setShowCreatePrescription,
    setEditingPrescription,
    setShowCreateAppointment,
    setEditingAppointment,
    setShowCreateQuote,
  };
}
