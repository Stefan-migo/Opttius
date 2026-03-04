"use client";

import { useQuery } from "@tanstack/react-query";

export interface SurveyResponse {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  lab_work_orders?: { id: string; work_order_number: string } | null;
  customers?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface SurveyMetrics {
  total: number;
  average: number;
  distribution: Record<number, number>;
}

export interface SurveyResponsesData {
  responses: SurveyResponse[];
  metrics: SurveyMetrics;
  pagination: { page: number; limit: number; total_count: number };
}

const fetchSurveyResponses = async (
  page = 1,
  limit = 20,
): Promise<SurveyResponsesData> => {
  const res = await fetch(
    `/api/admin/system/surveys?page=${page}&limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch survey responses");
  return res.json();
};

export function useSurveyResponses(page = 1, limit = 20) {
  const query = useQuery({
    queryKey: ["surveyResponses", page, limit],
    queryFn: () => fetchSurveyResponses(page, limit),
    staleTime: 1 * 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
