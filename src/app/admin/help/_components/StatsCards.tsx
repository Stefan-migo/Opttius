"use client";

import { AlertCircle, CheckCircle2, Clock, MessageSquare } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  total: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
}

export function StatsCards({
  total,
  openCount,
  inProgressCount,
  resolvedCount,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Abiertos</p>
              <p className="text-2xl font-bold text-blue-600">{openCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-400" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Progreso</p>
              <p className="text-2xl font-bold text-purple-600">
                {inProgressCount}
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-400" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resueltos</p>
              <p className="text-2xl font-bold text-green-600">
                {resolvedCount}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
