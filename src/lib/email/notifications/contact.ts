import { sendEmail } from "../client";

// Send contact form notification
export async function sendContactFormNotification(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // For Resend onboarding domain (resend.dev), we can only send to the registered email
    // When proper domain is configured, use the business contact email
    const recipientEmail = process.env.RESEND_FROM_EMAIL?.includes(
      "resend.dev",
    )
      ? process.env.RESEND_FROM_EMAIL // Use the onboarding email (registered email with Resend)
      : "contacto@opttius.cl"; // Use business email when domain is configured

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #AE0000;">Nuevo mensaje de contacto</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Nombre:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Asunto:</strong> ${data.subject}</p>
            <div style="margin-top: 20px;">
              <strong>Mensaje:</strong>
              <p style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 3px; margin-top: 10px;">
                ${data.message}
              </p>
            </div>
          </div>
          <p style="color: #666; font-size: 12px;">
            Este mensaje fue enviado desde el formulario de contacto de la web.
          </p>
        </div>
      `;

    const text = `
Nuevo mensaje de contacto

Nombre: ${data.name}
Email: ${data.email}
Asunto: ${data.subject}

Mensaje:
${data.message}

---
Este mensaje fue enviado desde el formulario de contacto de la web.
      `;

    return await sendEmail({
      to: recipientEmail,
      subject: `Contacto: ${data.subject}`,
      html,
      text,
      replyTo: data.email,
    });
  } catch (error) {
    console.error("Error sending contact form notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
