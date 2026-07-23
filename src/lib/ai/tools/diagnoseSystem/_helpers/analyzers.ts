import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

export async function analyzeOrdersHealth(supabase: SupabaseClient<Database>, startDate: Date, severity: string, organizationId: string) {
  const { data: orders, error } = await supabase.from("orders").select("id, status, payment_status, total_amount, created_at, updated_at").eq("organization_id", organizationId).gte("created_at", startDate.toISOString()).order("created_at", { ascending: false });
  if (error) return { health: "unknown", issues: [], metrics: {} };
  const total = orders?.length || 0;
  const paid = orders?.filter((o: unknown) => o.payment_status === "paid").length || 0;
  const completed = orders?.filter((o: unknown) => o.status === "completed").length || 0;
  const pending = orders?.filter((o: unknown) => o.status === "pending").length || 0;
  const failed = orders?.filter((o: unknown) => o.payment_status === "failed").length || 0;
  const paymentSuccessRate = total > 0 ? (paid / total) * 100 : 0;
  const pendingRate = total > 0 ? (pending / total) * 100 : 0;
  const failedPaymentRate = total > 0 ? (failed / total) * 100 : 0;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const issues: unknown[] = [];
  if (paymentSuccessRate < 80) issues.push({ type: "payment", severity: paymentSuccessRate < 50 ? "critical" : "high", message: `Tasa de éxito de pagos baja (${paymentSuccessRate.toFixed(1)}%)`, impact: "Pérdida de ingresos significativa" });
  if (pendingRate > 20) issues.push({ type: "process", severity: pendingRate > 40 ? "high" : "medium", message: `Alta tasa de órdenes pendientes (${pendingRate.toFixed(1)}%)`, impact: "Ineficiencia operativa" });
  if (failedPaymentRate > 5) issues.push({ type: "payment", severity: failedPaymentRate > 10 ? "critical" : "high", message: `Alta tasa de pagos fallidos (${failedPaymentRate.toFixed(1)}%)`, impact: "Pérdida de ventas potenciales" });
  return { health: calculateHealthScore([paymentSuccessRate, completionRate, 100 - pendingRate, 100 - failedPaymentRate]), issues: filterIssuesBySeverity(issues, severity), metrics: { totalOrders: total, paidOrders: paid, completedOrders: completed, pendingOrders: pending, failedPayments: failed, paymentSuccessRate: parseFloat(paymentSuccessRate.toFixed(2)), completionRate: parseFloat(completionRate.toFixed(2)), pendingRate: parseFloat(pendingRate.toFixed(2)), failedPaymentRate: parseFloat(failedPaymentRate.toFixed(2)) } };
}

export async function analyzeInventoryHealth(supabase: SupabaseClient<Database>, _startDate: Date, severity: string, organizationId: string) {
  const { data: products, error } = await supabase.from("products").select("id, name, inventory_quantity, status, cost_price, price").eq("organization_id", organizationId).eq("status", "active");
  if (error) return { health: "unknown", issues: [], metrics: {} };
  const total = products?.length || 0;
  const low = products?.filter((p: unknown) => (p.inventory_quantity || 0) <= 5).length || 0;
  const out = products?.filter((p: unknown) => (p.inventory_quantity || 0) === 0).length || 0;
  const over = products?.filter((p: unknown) => (p.inventory_quantity || 0) > 100).length || 0;
  const outRate = total > 0 ? (out / total) * 100 : 0;
  const lowRate = total > 0 ? (low / total) * 100 : 0;
  const overRate = total > 0 ? (over / total) * 100 : 0;
  const issues: unknown[] = [];
  if (outRate > 5) issues.push({ type: "inventory", severity: outRate > 15 ? "critical" : "high", message: `Alta tasa de productos sin stock (${outRate.toFixed(1)}%)`, impact: "Pérdida de ventas inmediata" });
  if (lowRate > 20) issues.push({ type: "inventory", severity: lowRate > 40 ? "high" : "medium", message: `Alta tasa de productos con stock bajo (${lowRate.toFixed(1)}%)`, impact: "Riesgo de interrupción de ventas" });
  if (overRate > 10) issues.push({ type: "inventory", severity: overRate > 20 ? "medium" : "low", message: `Alta tasa de productos con stock excesivo (${overRate.toFixed(1)}%)`, impact: "Inversión de capital ineficiente" });
  return { health: calculateHealthScore([100 - outRate, 100 - lowRate, 100 - overRate]), issues: filterIssuesBySeverity(issues, severity), metrics: { totalProducts: total, lowStock: low, outOfStock: out, overStock: over, lowStockRate: parseFloat(lowRate.toFixed(2)), outOfStockRate: parseFloat(outRate.toFixed(2)), overStockRate: parseFloat(overRate.toFixed(2)) } };
}

export async function analyzeCustomerHealth(supabase: SupabaseClient<Database>, _startDate: Date, severity: string, _organizationId: string) {
  const { data: customers, error } = await supabase.from("profiles").select("id, created_at");
  if (error) return { health: "unknown", issues: [], metrics: {} };
  const total = customers?.length || 0;
  const newCustomers = customers?.filter((c: unknown) => (new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 30).length || 0;
  const newRate = total > 0 ? (newCustomers / total) * 100 : 0;
  const issues: unknown[] = [];
  if (total > 20 && newRate < 10) issues.push({ type: "growth", severity: newRate < 5 ? "critical" : "high", message: `Baja tasa de nuevos clientes (${newRate.toFixed(1)}%)`, impact: "Riesgo de estancamiento del negocio" });
  return { health: calculateHealthScore([newRate]), issues: filterIssuesBySeverity(issues, severity), metrics: { totalCustomers: total, newCustomers, newCustomerRate: parseFloat(newRate.toFixed(2)) } };
}

export async function analyzeSystemPerformance(supabase: SupabaseClient<Database>, _startDate: Date, severity: string, organizationId: string) {
  const { data: orgData, error } = await supabase.from("organizations").select("total_orders, total_revenue, average_order_value, customer_retention_rate, order_completion_rate").eq("id", organizationId).limit(1);
  if (error || !orgData || orgData.length === 0) return { health: "unknown", issues: [], metrics: {} };
  const org = orgData[0];
  const retentionRate = org.customer_retention_rate || 0;
  const completionRate = org.order_completion_rate || 0;
  const issues: unknown[] = [];
  if (retentionRate < 60) issues.push({ type: "retention", severity: retentionRate < 40 ? "critical" : "high", message: `Baja tasa de retención de clientes (${retentionRate.toFixed(1)}%)`, impact: "Pérdida de ingresos recurrentes" });
  if (completionRate < 80) issues.push({ type: "process", severity: completionRate < 60 ? "high" : "medium", message: `Baja tasa de completación de órdenes (${completionRate.toFixed(1)}%)`, impact: "Ineficiencia operativa" });
  return { health: calculateHealthScore([retentionRate, completionRate]), issues: filterIssuesBySeverity(issues, severity), metrics: { totalOrders: org.total_orders || 0, totalRevenue: org.total_revenue || 0, averageOrderValue: org.average_order_value || 0, customerRetentionRate: parseFloat(retentionRate.toFixed(2)), orderCompletionRate: parseFloat(completionRate.toFixed(2)) } };
}

export function filterIssuesBySeverity(issues: unknown[], severity: string) {
  if (severity === "low") return issues.filter((i: unknown) => i.severity === "low");
  if (severity === "medium") return issues.filter((i: unknown) => ["medium", "low"].includes(i.severity));
  if (severity === "high") return issues.filter((i: unknown) => ["high", "critical"].includes(i.severity));
  return issues;
}

export function calculateHealthScore(scores: number[]): string {
  if (scores.length === 0) return "unknown";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 80) return "excellent"; if (avg >= 60) return "good"; if (avg >= 40) return "fair"; if (avg >= 20) return "poor";
  return "critical";
}

export function calculateOverallHealth(results: unknown[]): string {
  const scores = results.map((r: unknown) => { switch (r.health) { case "excellent": return 100; case "good": return 80; case "fair": return 60; case "poor": return 40; case "critical": return 20; default: return 50; } });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return calculateHealthScore([avg]);
}

export function getCriticalIssues(results: unknown[]): unknown[] { return results.flatMap((r: unknown) => r.issues || []).filter((i: unknown) => i.severity === "critical"); }

export function generateComprehensiveRecommendations(results: unknown[]): string[] {
  const recs: string[] = [];
  if (results[0]?.issues) results[0].issues.forEach((i: unknown) => { if (i.severity === "critical" || i.severity === "high") recs.push(`Revisar ${i.type}: ${i.message} (${i.impact})`); });
  if (results[1]?.issues) results[1].issues.forEach((i: unknown) => { if (i.severity === "critical" || i.severity === "high") recs.push(`Inventario: ${i.message}`); });
  if (results[2]?.issues) results[2].issues.forEach((i: unknown) => recs.push(`Cliente: ${i.message}`));
  if (recs.length === 0) recs.push("El sistema se encuentra en buen estado. Continuar monitoreo regular.");
  return recs;
}

export function generateSummary(results: unknown[]): string {
  const health = calculateOverallHealth(results);
  const critical = getCriticalIssues(results);
  const messages: Record<string, string> = { excellent: "El sistema se encuentra en excelente estado", good: "El sistema se encuentra en buen estado", fair: "El sistema requiere atención", poor: "El sistema requiere atención inmediata", critical: "El sistema requiere atención crítica" };
  let summary = messages[health] || "Estado desconocido";
  if (critical.length > 0) summary += `. Se identificaron ${critical.length} problemas críticos que requieren atención inmediata.`;
  else { const totalIssues = results.reduce((sum, r: unknown) => sum + (r.issues?.length || 0), 0); if (totalIssues > 0) summary += `. Se identificaron ${totalIssues} problemas leves/moderados.`; }
  return summary;
}
