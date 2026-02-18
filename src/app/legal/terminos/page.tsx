import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Uso",
  description:
    "Términos de uso del servicio Opttius - Sistema de gestión para ópticas",
};

export default function TerminosPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
        Términos de Uso
      </h1>
      <p className="text-epoch-primary/70 font-body text-sm mb-12">
        Última actualización:{" "}
        {new Date().toLocaleDateString("es-CL", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <div className="prose prose-epoch max-w-none space-y-10 font-body text-epoch-primary/90 leading-relaxed">
        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            1. Aceptación de los términos
          </h2>
          <p>
            Al utilizar Opttius, usted acepta los presentes términos de uso.
            Opttius es un sistema de gestión diseñado exclusivamente para
            ópticas y profesionales de la visión. El uso del servicio implica el
            cumplimiento de estas condiciones.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            2. Descripción del servicio
          </h2>
          <p>
            Opttius ofrece gestión integral para ópticas: historial de
            pacientes, recetas digitales, presupuestos, órdenes de laboratorio,
            agenda de citas, punto de venta y reportes. El servicio está pensado
            desde cero para el flujo operativo de una óptica.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            3. Uso responsable
          </h2>
          <p>
            Usted se compromete a utilizar el servicio de forma lícita y a
            mantener la confidencialidad de los datos de sus pacientes. No está
            permitido el uso del sistema para fines distintos a la gestión
            óptica profesional.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            4. Suscripción y facturación
          </h2>
          <p>
            Los planes de suscripción se facturan según la modalidad contratada.
            La prueba gratuita no requiere tarjeta de crédito. Puede cancelar su
            suscripción en cualquier momento desde el panel de administración.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            5. Contacto
          </h2>
          <p>
            Para consultas sobre estos términos, utilice los canales de contacto
            indicados en la página principal de Opttius.
          </p>
        </section>
      </div>
    </article>
  );
}
