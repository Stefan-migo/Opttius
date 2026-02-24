import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arquitectura de Seguridad Clínica",
  description:
    "Información sobre seguridad y protección de datos en Opttius",
};

export default function SeguridadPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
        Arquitectura de Seguridad Clínica
      </h1>
      <p className="text-epoch-primary/70 font-body text-lg mb-12">
        Protección de grado militar para la información sensible de sus
        pacientes.
      </p>
      <p className="text-epoch-primary/60 font-body text-sm mb-12">
        Última actualización: 22 de febrero de 2026
      </p>

      <div className="prose prose-epoch max-w-none space-y-10 font-body text-epoch-primary/90 leading-relaxed">
        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            1. Infraestructura Blindada (La Nube)
          </h2>
          <p>
            El ecosistema Opttius opera sobre servidores de última generación
            con certificaciones ISO 27001 y SOC 2 Tipo II. Cada byte de
            información viaja a través de túneles encriptados (TLS 1.3) y reposa
            bajo llaves de cifrado AES-256, el estándar utilizado por bancos y
            organismos de salud internacionales. Su clínica nunca duerme,
            nuestra seguridad tampoco.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            2. Autenticación Robusta (Acceso y Control)
          </h2>
          <p>
            El perímetro de su óptica está protegido por protocolos de
            autenticación modernos (OAuth 2.0 / JWT). Las credenciales de acceso
            se someten a hash criptográfico irreversible (Argon2id) y jamás son
            legibles por humanos, ni siquiera por nuestro propio equipo. La
            integridad de su sesión es nuestra prioridad cero.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            3. Aislamiento de Datos Clínicos (Privacidad por Diseño)
          </h2>
          <p>
            En Opttius, la confidencialidad no es una opción, es la
            arquitectura base. Implementamos Row-Level Security (RLS) estricto:
            cada receta, paciente y transacción financiera está aislada
            criptográficamente a nivel de base de datos. Nadie fuera de su
            organización autorizada puede siquiera &quot;ver&quot; que esos datos
            existen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            4. Resiliencia y Recuperación (Backups)
          </h2>
          <p>
            Ante cualquier eventualidad, su información está replicada y segura.
            Ejecutamos copias de seguridad automáticas y encriptadas en múltiples
            zonas geográficas (redundancia). Garantizamos la disponibilidad
            continua de su historial clínico y la capacidad de restauración
            inmediata (Point-in-Time Recovery) ante incidentes críticos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            5. Canal de Respuesta a Incidentes (Contacto)
          </h2>
          <p>
            Mantenemos un programa activo de recompensa por vulnerabilidades y
            auditoría constante. Si detecta una anomalía o requiere detalles
            técnicos sobre nuestra postura de seguridad, nuestro equipo de
            ingeniería de seguridad está disponible a través de los canales
            oficiales de soporte prioritario.
          </p>
        </section>
      </div>
    </article>
  );
}
