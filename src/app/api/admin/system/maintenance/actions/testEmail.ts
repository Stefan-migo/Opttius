import type { Database, SupabaseClient } from "@/types/supabase";

export async function handleTestEmail(userEmail: string, supabase: SupabaseClient<Database>) {
  if (!userEmail) return { error: "Email del usuario no disponible" };

  const { sendEmail } = await import("@/lib/email/client");
  const emailResult = await sendEmail({
    to: userEmail,
    subject: "Test Email - Sistema de Mantenimiento",
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.info-box{background:white;padding:20px;border-radius:5px;margin:20px 0;border-left:4px solid #667eea}.footer{text-align:center;margin-top:20px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>✅ Email de Prueba</h1><p>Sistema de Mantenimiento</p></div><div class="content"><p>Este es un email de prueba del sistema de mantenimiento.</p><div class="info-box"><h3>Información del Test:</h3><ul><li><strong>Enviado por:</strong> ${userEmail}</li><li><strong>Fecha:</strong> ${new Date().toLocaleString("es-AR")}</li><li><strong>Estado:</strong> ✅ Configuración de email funcionando correctamente</li></ul></div><p>Si recibiste este email, la configuración de Resend está funcionando correctamente.</p></div><div class="footer"><p>Este es un email automático del sistema de mantenimiento.</p></div></div></body></html>`,
    text: `Email de prueba del sistema de mantenimiento.\n\nEnviado por: ${userEmail}\nFecha: ${new Date().toLocaleString("es-AR")}\n\nSi recibiste este email, la configuración de Resend está funcionando correctamente.`,
  });

  if (!emailResult.success) return { error: "Error al enviar email", details: emailResult.error };

  await supabase.rpc("log_admin_activity", {
    action: "maintenance_test_email", resource_type: "system", resource_id: null,
    details: { action: "test_email", test_email_to: userEmail, email_id: emailResult.id || null, initiated_by: "system" },
  });

  return { success: true, message: `Email de prueba enviado exitosamente a ${userEmail}`, action: "test_email", email_id: emailResult.id || null };
}
