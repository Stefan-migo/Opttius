import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de privacidad de Opttius - Sistema de gestión para ópticas",
};

export default function PrivacidadPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
        Política de Privacidad
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
            1. Responsable del tratamiento
          </h2>
          <p>
            Opttius es un sistema de gestión para ópticas creado por un
            tecnólogo médico. Los datos personales que recopilamos son tratados
            con la máxima confidencialidad y seguridad, en cumplimiento de la
            normativa aplicable en materia de protección de datos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            2. Datos que recopilamos
          </h2>
          <p>
            Recopilamos únicamente los datos necesarios para prestar el
            servicio: información de contacto, datos de pacientes (recetas,
            prescripciones, historial clínico óptico), y datos de facturación.
            No vendemos ni compartimos sus datos con terceros con fines
            comerciales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            3. Finalidad del tratamiento
          </h2>
          <p>
            Los datos se utilizan exclusivamente para la gestión de su óptica:
            historial de pacientes, presupuestos, órdenes de laboratorio, agenda
            de citas y reportes. Garantizamos que su información clínica y
            comercial permanece bajo su control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            4. Sus derechos
          </h2>
          <p>
            Puede ejercer sus derechos de acceso, rectificación, supresión,
            limitación del tratamiento y portabilidad contactando a través del
            correo indicado en la sección de contacto. Responderemos en el plazo
            legal establecido.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            5. Contacto
          </h2>
          <p>
            Para cualquier consulta sobre esta política de privacidad, puede
            contactarnos a través de los canales indicados en la página de
            contacto de Opttius.
          </p>
        </section>
      </div>
    </article>
  );
}
