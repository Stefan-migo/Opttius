import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Rastreo y Sesiones",
  description:
    "Política de cookies de Opttius - Sistema de gestión para ópticas",
};

export default function CookiesPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
        Política de Rastreo y Sesiones
      </h1>
      <p className="text-epoch-primary/70 font-body text-sm mb-12">
        Última actualización: 22 de febrero de 2026
      </p>

      <div className="prose prose-epoch max-w-none space-y-10 font-body text-epoch-primary/90 leading-relaxed">
        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            1. Tecnología Esencial (¿Qué son y por qué las usamos?)
          </h2>
          <p>
            Para garantizar la fluidez de su ecosistema operativo, Opttius
            utiliza microdatos temporales (cookies) en su dispositivo. Lejos de
            ser herramientas de invasión publicitaria, estos archivos son el
            engranaje invisible que permite la autenticación segura, la
            velocidad de carga y la personalización de su interfaz clínica.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            2. El Estándar de Cero Ruido (Cookies que utilizamos)
          </h2>
          <p>
            Nuestra arquitectura es estricta: solo desplegamos cookies
            operativas de primera parte. Utilizamos tokens de sesión encriptados
            para mantener su acceso seguro a los historiales de pacientes, y
            cookies de interfaz para recordar sus preferencias de trabajo (como
            el modo oscuro o la organización de su dashboard). Opttius no
            inyecta rastreadores de terceros ni comercializa su navegación con
            agencias de publicidad.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            3. Control de su Entorno (Gestión y configuración)
          </h2>
          <p>
            Usted tiene el control absoluto sobre su huella digital. A través de
            la configuración de su navegador, puede auditar o bloquear el
            almacenamiento no esencial. Sin embargo, le informamos que
            deshabilitar las cookies críticas de autenticación interrumpirá su
            acceso seguro al sistema y el flujo normal de su óptica.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            4. Transparencia Técnica (Auditoría y Soporte)
          </h2>
          <p>
            Si requiere información detallada sobre la duración de nuestras
            sesiones o el encriptado de nuestros tokens, nuestro equipo técnico
            está a su disposición. Puede canalizar cualquier consulta de
            privacidad a través de los medios oficiales de soporte indicados en
            la plataforma.
          </p>
        </section>
      </div>
    </article>
  );
}
