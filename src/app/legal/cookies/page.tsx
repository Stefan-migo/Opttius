import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Política de cookies de Opttius - Sistema de gestión para ópticas",
};

export default function CookiesPage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
        Política de Cookies
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
            1. ¿Qué son las cookies?
          </h2>
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en su
            dispositivo cuando visita nuestro sitio. Opttius utiliza cookies
            estrictamente necesarias para el funcionamiento del servicio y para
            mejorar su experiencia de uso.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            2. Cookies que utilizamos
          </h2>
          <p>
            Utilizamos cookies de sesión para mantener su sesión activa y
            cookies de preferencias para recordar su configuración (por ejemplo,
            tema claro u oscuro). No utilizamos cookies de terceros con fines
            publicitarios.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            3. Gestión de cookies
          </h2>
          <p>
            Puede configurar su navegador para rechazar cookies no esenciales.
            Tenga en cuenta que desactivar ciertas cookies puede afectar el
            funcionamiento del sistema, especialmente la autenticación y las
            preferencias de usuario.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-display font-bold text-epoch-primary uppercase tracking-wider mb-4">
            4. Contacto
          </h2>
          <p>
            Para consultas sobre el uso de cookies en Opttius, puede
            contactarnos a través de los canales indicados en la página de
            contacto.
          </p>
        </section>
      </div>
    </article>
  );
}
