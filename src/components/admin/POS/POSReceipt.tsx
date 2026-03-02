"use client";

import React, { forwardRef } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";

interface POSReceiptProps {
  order: any;
  settings: any;
  branch: any;
  organization: any;
  receiptType?: "sale" | "payment";
}

export const POSReceipt = forwardRef<HTMLDivElement, POSReceiptProps>(
  ({ order, settings, branch, organization, receiptType = "sale" }, ref) => {
    if (!order) return null;

    const isThermal = settings?.printer_type === "thermal";
    const width = settings?.printer_width_mm
      ? `${settings.printer_width_mm}mm`
      : isThermal
        ? "80mm"
        : "210mm";

    return (
      <div
        ref={ref}
        id="pos-receipt-print"
        className="bg-white text-black p-4 font-mono text-[12px] leading-tight"
        style={{ width: isThermal ? width : "100%", maxWidth: "100%" }}
      >
        {/* Header Section - Config from /admin/system Boletas y Facturas */}
        {settings?.header_text && (
          <div className="text-center mb-4 text-xs border-b border-black pb-2">
            {settings.header_text}
          </div>
        )}
        <div className="text-center mb-6">
          {settings?.logo_url && (
            <div className="flex justify-center mb-4">
              <img
                src={settings.logo_url}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          <h1 className="text-lg font-bold uppercase">
            {settings?.business_name || organization?.name || "Opttius"}
          </h1>
          <p className="text-[10px] mt-1">
            RUT: {settings?.business_rut || organization?.rut || "XX.XXX.XXX-X"}
          </p>
          <p className="text-[10px]">{branch?.name || "Sucursal"}</p>
          <p className="text-[10px]">
            {branch?.address || settings?.business_address}
          </p>
          <p className="text-[10px]">
            {branch?.phone || settings?.business_phone}
          </p>
        </div>

        {/* Info Grid */}
        <div className="border-t border-b border-black py-2 mb-4 space-y-1">
          {receiptType === "payment" && (
            <div className="text-center font-bold text-sm mb-2">
              COMPROBANTE DE PAGO - SALDO PENDIENTE
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-bold">ORDEN:</span>
            <span>#{order.order_number}</span>
          </div>
          {order.sii_invoice_number && (
            <div className="flex justify-between">
              <span className="font-bold">FOLIO:</span>
              <span>{order.sii_invoice_number}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>FECHA:</span>
            <span>{formatDate(order.created_at || new Date())}</span>
          </div>
          <div className="flex justify-between">
            <span>DOCUMENTO:</span>
            <span className="uppercase">
              {order.sii_invoice_type && order.sii_invoice_type !== "none"
                ? order.sii_invoice_type
                : "Venta Interna"}
            </span>
          </div>
        </div>

        {/* Customer Section */}
        {(order.customer_name ||
          order.billing_first_name ||
          order.customer_rut ||
          order.sii_rut) && (
          <div className="mb-4 text-[11px]">
            <p className="font-bold border-b border-gray-200 mb-1">CLIENTE:</p>
            {order.customer_name ? (
              <p>{order.customer_name}</p>
            ) : order.billing_first_name ? (
              <p>
                {order.billing_first_name} {order.billing_last_name}
              </p>
            ) : null}
            {(order.customer_rut || order.sii_rut) && (
              <p>RUT: {order.customer_rut || order.sii_rut}</p>
            )}
          </div>
        )}

        {/* Items Table */}
        <table className="w-full mb-4 text-[11px]">
          <thead className="border-b border-black">
            <tr>
              <th className="text-left py-1">DETALLE</th>
              <th className="text-right py-1">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(
              order.order_items ||
              order.items ||
              order.order?.order_items ||
              []
            )?.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="py-2">
                  <div className="font-bold">{item.product_name}</div>
                  <div className="text-[10px]">
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </div>
                </td>
                <td className="text-right py-2 align-top">
                  {formatCurrency(item.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="border-t border-black pt-2 space-y-1 text-[12px]">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>{formatCurrency(order.subtotal || order.total_amount)}</span>
          </div>
          {Number(order.tax_amount) > 0 && (
            <div className="flex justify-between">
              <span>IVA (19%):</span>
              <span>{formatCurrency(order.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-100">
            <span>TOTAL:</span>
            <span>{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {/* Payments Section */}
        <div className="mt-4 pt-2 border-t border-black space-y-1 text-[11px]">
          <p className="font-bold mb-1">PAGOS:</p>
          {order.order_payments && order.order_payments.length > 0 ? (
            order.order_payments.map((payment: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <span className="capitalize">{payment.payment_method}:</span>
                <span>{formatCurrency(payment.amount)}</span>
              </div>
            ))
          ) : order.payment_method_type ? (
            <div className="flex justify-between">
              <span className="capitalize">{order.payment_method_type}:</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span>Pago Registrado:</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          )}

          {order.payment_status === "partial" && (
            <div className="flex justify-between font-bold text-red-600 mt-1 pt-1 border-t border-gray-100">
              <span>SALDO PENDIENTE:</span>
              <span>
                {formatCurrency(
                  Number(order.total_amount) -
                    (order.order_payments?.reduce(
                      (acc: number, p: any) => acc + Number(p.amount),
                      0,
                    ) ||
                      Number(order.deposit_amount) ||
                      0),
                )}
              </span>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="mt-8 text-center text-[10px] space-y-2 italic">
          {settings?.footer_text && <p>{settings.footer_text}</p>}
          <p>*** GRACIAS POR SU COMPRA ***</p>
          <p className="not-italic font-bold">WWW.OPTTIUS.COM</p>
        </div>

        {/* Anti-fraud / Cut line for thermal */}
        {isThermal && (
          <div className="mt-10 border-t border-dashed border-gray-300 pt-2 flex justify-center opacity-30">
            <span>- CORTE AQUÍ -</span>
          </div>
        )}
      </div>
    );
  },
);

POSReceipt.displayName = "POSReceipt";
