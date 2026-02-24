import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad y Soberanía de Datos",
  description:
    "Política de privacidad de Opttius - Sistema de gestión para ópticas",
};

export default function PrivacidadPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
        Privacidad y Soberanía de Datos
      </h1>
      <p className="text-epoch-primary/70 font-body text-sm mb-12">
        Última actualización: 22 de febrero de 2026
      </p>

      <div className="prose prose-epoch max-w-none space-y-10 font-body text-epoch-primary/90 leading-relaxed">
        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            1. El Estándar Clínico (Responsable del tratamiento)
          </h2>
          <p>
            Opttius no es un software genérico; es un ecosistema operativo
            diseñado por un tecnólogo médico. Entendemos que la información de
            su óptica no son simples &quot;datos&quot;, sino historiales
            clínicos y financieros sensibles. Tratamos su información con el
            mismo nivel de confidencialidad y rigor que exige la práctica
            clínica profesional, cumpliendo estrictamente con la normativa
            vigente de protección de datos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            2. Datos Estrictamente Necesarios (Lo que recopilamos)
          </h2>
          <p>
            Nuestra arquitectura tecnológica está diseñada para recopilar
            únicamente lo indispensable para el funcionamiento de su ecosistema:
            información de contacto, datos de facturación, y el núcleo operativo
            de su clínica (recetas, prescripciones, OD/OS e historial de
            pacientes). Opttius no comercializa, transfiere ni monetiza su base
            de datos con terceros bajo ninguna circunstancia.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            3. Inteligencia Operativa (Finalidad del tratamiento)
          </h2>
          <p>
            Cada dato ingresado tiene un único propósito: automatizar y
            controlar su óptica. Utilizamos la información exclusivamente para
            habilitar sus flujos de trabajo: trazabilidad de órdenes de
            laboratorio, historiales clínicos instantáneos, gestión de agenda y
            reportes de rentabilidad. Su información comercial y clínica está
            encriptada y permanece bajo su control absoluto.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            4. Control Absoluto (Sus derechos)
          </h2>
          <p>
            Usted es el único dueño de su información. A través de nuestra
            plataforma o contactando a nuestro equipo, puede ejercer en
            cualquier momento sus derechos de acceso, rectificación,
            portabilidad o supresión definitiva de su entorno (borrado seguro).
            Garantizamos una respuesta ágil y dentro de los plazos legales
            establecidos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            5. Canal Directo (Contacto y Soporte)
          </h2>
          <p>
            Para auditorías, consultas sobre encriptación o dudas sobre nuestra
            política de privacidad, nuestro equipo técnico y legal está a su
            disposición. Puede comunicarse directamente a través de los canales
            oficiales indicados en la sección de contacto de Opttius.
          </p>
        </section>
      </div>
    </article>
  );
}
