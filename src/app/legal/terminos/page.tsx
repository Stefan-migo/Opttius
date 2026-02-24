import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Condiciones del Ecosistema Operativo",
  description:
    "Términos de uso del servicio Opttius - Sistema de gestión para ópticas",
};

export default function TerminosPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
        Condiciones del Ecosistema Operativo
      </h1>
      <p className="text-epoch-primary/70 font-body text-sm mb-12">
        Última actualización: 22 de febrero de 2026
      </p>

      <div className="prose prose-epoch max-w-none space-y-10 font-body text-epoch-primary/90 leading-relaxed">
        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            1. El Estándar Profesional (Aceptación de los términos)
          </h2>
          <p>
            Al acceder a la infraestructura de Opttius, usted ingresa a un
            sistema operativo diseñado exclusivamente para clínicas
            oftalmológicas, tecnólogos médicos y negocios ópticos de alto
            rendimiento. El uso continuo de nuestra plataforma implica la
            aceptación de estos términos, diseñados para proteger la integridad
            y la velocidad de sus operaciones diarias.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            2. Arquitectura del Servicio (Descripción funcional)
          </h2>
          <p>
            Opttius no es un CRM genérico; es el motor central de su negocio.
            Proveemos automatización integral: desde la agudeza visual
            (historiales clínicos y OD/OS) hasta la facturación, pasando por el
            control exacto de inventario, trazabilidad de laboratorio y agenda
            inteligente. Nuestra tecnología está calibrada milimétricamente para
            el flujo real de una óptica.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            3. Integridad y Práctica Clínica (Uso responsable)
          </h2>
          <p>
            Como usuario del ecosistema, usted asume la responsabilidad de
            mantener la confidencialidad absoluta de los historiales de sus
            pacientes y utilizar la plataforma bajo los más altos estándares
            éticos y comerciales. Queda estrictamente prohibido el uso de la
            infraestructura de Opttius para fines ajenos a la gestión óptica
            profesional o la alteración de flujos de trabajo validados.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            4. Escalabilidad y Suscripciones (Facturación clara)
          </h2>
          <p>
            Nuestro modelo de negocio es transparente y escalable junto con su
            óptica. La fase de evaluación inicial (prueba gratuita) se despliega
            sin fricción y sin requerir tarjeta de crédito. Posteriormente, la
            facturación se automatiza según el plan contratado, permitiéndole
            gestionar, actualizar o pausar su suscripción directamente desde su
            panel de control en cualquier momento.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            5. Soporte y Auditoría Legal (Contacto)
          </h2>
          <p>
            Si requiere clarificación técnica o legal sobre estos términos de
            servicio, nuestro equipo de soporte especializado está disponible.
            Puede auditar nuestras políticas comunicándose a través de los
            canales oficiales habilitados en la plataforma de Opttius.
          </p>
        </section>
      </div>
    </article>
  );
}
