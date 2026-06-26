"use client";

import { MapPin, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer } from "@/lib/api/services";
import { formatDate } from "@/lib/utils";

interface CustomerInfoCardProps {
  customer: Customer;
}

export function CustomerInfoCard({ customer }: CustomerInfoCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Customer Information */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-admin-text-primary">
            <User className="h-5 w-5 mr-2" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Nombre
              </p>
              <p className="font-medium text-admin-text-primary">
                {customer.first_name || "No especificado"}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Apellido
              </p>
              <p className="font-medium text-admin-text-primary">
                {customer.last_name || "No especificado"}
              </p>
            </div>
          </div>

          {customer.rut && (
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">RUT</p>
              <p className="font-medium text-admin-text-primary">
                {customer.rut}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs sm:text-sm text-admin-text-tertiary">Email</p>
            <p className="font-medium text-admin-text-primary">
              {customer.email}
            </p>
          </div>

          {customer.phone && (
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Teléfono
              </p>
              <p className="font-medium text-admin-text-primary">
                {customer.phone}
              </p>
            </div>
          )}

          {customer.date_of_birth && (
            <div>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Fecha de Nacimiento
              </p>
              <p className="font-medium text-admin-text-primary">
                {new Date(customer.date_of_birth).toLocaleDateString("es-CL")}
              </p>
            </div>
          )}

          {customer.last_eye_exam_date && (
            <div>
              <p className="text-sm text-admin-text-tertiary">
                Último Examen de la Vista
              </p>
              <p className="font-medium">
                {formatDate(customer.last_eye_exam_date)}
              </p>
            </div>
          )}

          {customer.next_eye_exam_due && (
            <div>
              <p className="text-sm text-admin-text-tertiary">
                Próximo Examen Recomendado
              </p>
              <p className="font-medium text-admin-text-primary">
                {formatDate(customer.next_eye_exam_due)}
              </p>
            </div>
          )}

          {customer.medical_conditions &&
            customer.medical_conditions.length > 0 && (
              <div>
                <p className="text-sm text-admin-text-tertiary">
                  Condiciones Médicas
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {customer.medical_conditions.map(
                    (condition: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {condition}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}

          {customer.allergies && customer.allergies.length > 0 && (
            <div>
              <p className="text-sm text-admin-text-tertiary">Alergias</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {customer.allergies.map((allergy: string, idx: number) => (
                  <Badge
                    className="bg-red-50 text-red-700"
                    key={idx}
                    variant="outline"
                  >
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {customer.emergency_contact_name && (
            <div>
              <p className="text-sm text-admin-text-tertiary">
                Contacto de Emergencia
              </p>
              <p className="font-medium">{customer.emergency_contact_name}</p>
              {customer.emergency_contact_phone && (
                <p className="text-sm text-admin-text-tertiary">
                  {customer.emergency_contact_phone}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="text-sm text-admin-text-tertiary">Estado</p>
            <Badge
              variant={
                customer.is_active_customer !== false ? "default" : "outline"
              }
            >
              {customer.is_active_customer !== false
                ? "Cliente Activo"
                : "Cliente Inactivo"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-admin-text-primary">
            <MapPin className="h-5 w-5 mr-2" />
            Dirección
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          {customer.address_line_1 ? (
            <>
              <div>
                <p className="text-sm text-admin-text-tertiary">Dirección</p>
                <p className="font-medium">{customer.address_line_1}</p>
                {customer.address_line_2 && (
                  <p className="font-medium">{customer.address_line_2}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-admin-text-tertiary">Ciudad</p>
                  <p className="font-medium">
                    {customer.city || "No especificado"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-admin-text-tertiary">Provincia</p>
                  <p className="font-medium">
                    {customer.state || "No especificado"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-admin-text-tertiary">
                    Código Postal
                  </p>
                  <p className="font-medium">
                    {customer.postal_code || "No especificado"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-admin-text-tertiary">País</p>
                  <p className="font-medium">{customer.country || "Chile"}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-admin-text-tertiary">
              No hay dirección registrada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
