import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seguridad",
  description: "Información sobre seguridad y protección de datos en Opttius",
};

export default function SeguridadPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
        Seguridad
      </h1>
      <p className="text-epoch-primary/70 font-body text-sm mb-12">
        Compromiso con la protección de sus datos y los de sus pacientes.
      </p>

      <div className="prose prose-epoch max-w-none space-y-10 font-body text-epoch-primary/90 leading-relaxed">
        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            1. Infraestructura
          </h2>
          <p>
            Opttius utiliza infraestructura en la nube con estándares de
            seguridad de nivel empresarial. Los datos se almacenan en centros de
            datos certificados, con cifrado en tránsito (TLS) y en reposo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            2. Autenticación y acceso
          </h2>
          <p>
            El acceso al sistema está protegido por autenticación segura. Las
            contraseñas se almacenan con hash y nunca se transmiten en texto
            plano. Recomendamos activar la verificación en dos pasos cuando esté
            disponible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            3. Datos clínicos
          </h2>
          <p>
            Los datos de pacientes, recetas y prescripciones se tratan con la
            máxima confidencialidad. El acceso está restringido por organización
            y rol. Cumplimos con las normativas aplicables en materia de
            protección de datos de salud.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            4. Copias de seguridad
          </h2>
          <p>
            Realizamos copias de seguridad periódicas para garantizar la
            disponibilidad y recuperación de sus datos en caso de incidencias.
            Los backups están cifrados y almacenados de forma segura.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            5. Contacto
          </h2>
          <p>
            Para reportar vulnerabilidades o consultas sobre seguridad, contacte
            a través de los canales oficiales de Opttius.
          </p>
        </section>
      </div>
    </article>
  );
}
