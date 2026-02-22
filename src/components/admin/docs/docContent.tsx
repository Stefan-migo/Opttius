import React from "react";

export const DOC_CONTENT: Record<
  string,
  { title: string; subtitle: string; body: React.ReactNode }
> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Visión general y panel de control",
    body: (
      <>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            ¿Qué es el Dashboard?
          </h3>
          <p>
            El Dashboard es tu pantalla principal al ingresar al sistema. Te
            muestra de un vistazo lo más importante: ingresos del mes, citas de
            hoy, estado del inventario, clientes y trabajos pendientes en el
            taller.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Tarjetas principales (KPIs)
          </h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Rendimiento Mensual:</strong> Ingresos del mes actual
              comparados con el mes anterior. El porcentaje indica si subieron o
              bajaron.
            </li>
            <li>
              <strong>Agenda del Día:</strong> Cuántas citas tienes hoy y
              cuántas están confirmadas.
            </li>
            <li>
              <strong>Inventario Activo:</strong> Total de productos y alertas
              de stock bajo.
            </li>
            <li>
              <strong>Cartera de Clientes:</strong> Total de clientes y cuántos
              se registraron en el último ciclo.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Comandos rápidos
          </h3>
          <p>
            En la tarjeta &quot;Comandos&quot; puedes buscar clientes o
            productos rápidamente, crear una nueva cita, ir al catálogo o a la
            lista de clientes. Usa la búsqueda para localizar a alguien sin
            salir del Dashboard.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Alertas de inventario
          </h3>
          <p>
            Si hay productos con stock bajo, verás un banner rojo con el
            listado. Haz clic en &quot;Gestionar archivo&quot; para ir directo a
            los productos que necesitan reposición.
          </p>
        </section>
      </>
    ),
  },
  pos: {
    title: "Punto de Venta",
    subtitle: "Ventas y caja",
    body: (
      <>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            ¿Qué es el POS?
          </h3>
          <p>
            El Punto de Venta (POS) es donde registras las ventas de tu óptica:
            marcos, lentes, accesorios y servicios. Permite cobrar en efectivo,
            tarjeta u otros métodos de pago.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Flujo básico de venta
          </h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Selecciona o busca el cliente (opcional).</li>
            <li>
              Agrega productos al carrito buscando por nombre, SKU o código.
            </li>
            <li>Revisa el total y aplica descuentos si corresponde.</li>
            <li>Procesa el pago con el método elegido.</li>
            <li>El sistema genera el comprobante y actualiza el stock.</li>
          </ol>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Desde presupuesto o trabajo
          </h3>
          <p>
            Si ya tienes un presupuesto aceptado o un trabajo de laboratorio
            listo, puedes convertirlo en venta desde el POS sin volver a cargar
            los ítems manualmente.
          </p>
        </section>
      </>
    ),
  },
  trabajos: {
    title: "Trabajos de Laboratorio",
    subtitle: "Órdenes de trabajo y taller",
    body: (
      <>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            ¿Qué son los trabajos de laboratorio?
          </h3>
          <p>
            Son las órdenes que envías al taller para montar lentes en marcos,
            fabricar lentes de contacto o realizar otros trabajos técnicos. Cada
            trabajo pasa por varios estados hasta la entrega al cliente.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Estados del trabajo
          </h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Presupuesto / Ordenado:</strong> Recién creado, aún no
              enviado al lab.
            </li>
            <li>
              <strong>Enviado al lab / En progreso:</strong> El taller está
              trabajando en él.
            </li>
            <li>
              <strong>Listo en lab / Recibido / Montado:</strong> El trabajo
              está en tu sucursal o en proceso de control.
            </li>
            <li>
              <strong>Entregado:</strong> Ya se entregó al cliente.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Crear un trabajo
          </h3>
          <p>
            Puedes crear un trabajo desde un presupuesto aceptado o desde cero.
            Necesitas el cliente, la receta (si aplica), el marco y las
            especificaciones del lente. El sistema calcula el precio según tu
            matriz de lentes.
          </p>
        </section>
      </>
    ),
  },
  presupuestos: {
    title: "Presupuestos",
    subtitle: "Cotizaciones para clientes",
    body: (
      <>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            ¿Qué son los presupuestos?
          </h3>
          <p>
            Los presupuestos son cotizaciones que envías al cliente con el
            detalle de marcos, lentes, tratamientos y precios. El cliente puede
            aceptar, rechazar o pedir cambios. Cuando acepta, puedes convertirlo
            en trabajo de laboratorio o en venta directa.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Flujo del presupuesto
          </h3>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Crea el presupuesto con el cliente y los ítems.</li>
            <li>Envíalo por email o compártelo (si está habilitado).</li>
            <li>El cliente acepta o rechaza.</li>
            <li>
              Si acepta, conviértelo en trabajo de laboratorio o en venta POS.
            </li>
          </ol>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Matriz de lentes
          </h3>
          <p>
            El precio de los lentes se calcula automáticamente según la matriz
            configurada para cada familia de lentes (material, índice,
            tratamientos). Revisa la sección de productos para ajustar precios y
            umbrales.
          </p>
        </section>
      </>
    ),
  },
  citas: {
    title: "Citas y Agenda",
    subtitle: "Agendamiento de consultas",
    body: (
      <>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            ¿Qué es la agenda?
          </h3>
          <p>
            La agenda te permite programar citas para tus clientes: consultas,
            medición de vista, entrega de trabajos, etc. Puedes ver el
            calendario por día o semana y filtrar por sucursal si tienes varias.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Crear una cita
          </h3>
          <p>
            Selecciona el cliente, la fecha, la hora, el tipo de cita y la
            duración. El sistema te avisará si hay solapamientos. Puedes crear
            citas desde el Dashboard (botón &quot;Nueva Cita Médica&quot;) o
            desde la sección de Citas.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Estados de la cita
          </h3>
          <p>
            Las citas pueden estar programadas, confirmadas, completadas,
            canceladas o marcadas como no asistencia (no-show). Marca el estado
            correcto para tener estadísticas precisas.
          </p>
        </section>
      </>
    ),
  },
  productos: {
    title: "Productos e Inventario",
    subtitle: "Catálogo y stock",
    body: (
      <>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            ¿Qué incluye esta sección?
          </h3>
          <p>
            Aquí gestionas el catálogo de productos (marcos, lentes, accesorios,
            servicios) y el inventario por sucursal. El stock se controla por
            sucursal: cada local tiene su propia cantidad disponible.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Tipos de productos
          </h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Marcos:</strong> Productos físicos con stock.
            </li>
            <li>
              <strong>Lentes oftálmicos:</strong> Se gestionan por familias (ej.
              monofocales, bifocales). El stock puede estar en familias de
              lentes.
            </li>
            <li>
              <strong>Accesorios:</strong> Fundas, líquidos, etc. con stock.
            </li>
            <li>
              <strong>Servicios:</strong> Mano de obra, consultas. No consumen
              stock.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Alertas de stock bajo
          </h3>
          <p>
            Puedes definir un umbral de stock bajo por producto y sucursal.
            Cuando la cantidad disponible llega a ese nivel, el sistema muestra
            una alerta en el Dashboard y en la lista de productos. Usa el filtro
            &quot;bajo stock&quot; para ver solo esos productos.
          </p>
        </section>
      </>
    ),
  },
  clientes: {
    title: "Clientes",
    subtitle: "CRM y gestión de clientes",
    body: (
      <>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            ¿Qué incluye la sección de clientes?
          </h3>
          <p>
            Aquí tienes la ficha de cada cliente: datos de contacto, RUT,
            recetas, historial de compras, presupuestos, trabajos y citas. Es tu
            CRM para dar un servicio personalizado.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Datos importantes
          </h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Recetas:</strong> Guarda la graduación y fecha de la
              última receta para presupuestos y trabajos.
            </li>
            <li>
              <strong>Historial:</strong> Órdenes, trabajos y presupuestos
              asociados.
            </li>
            <li>
              <strong>Segmentación:</strong> El sistema puede clasificar
              clientes (nuevos, recurrentes, inactivos) para insights y
              campañas.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Crear un cliente
          </h3>
          <p>
            Puedes crear clientes manualmente o se crean automáticamente al
            registrar una venta o presupuesto. El RUT es opcional pero útil para
            facturación y validaciones.
          </p>
        </section>
      </>
    ),
  },
  analiticas: {
    title: "Analíticas",
    subtitle: "Reportes y métricas",
    body: (
      <>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            ¿Qué son las analíticas?
          </h3>
          <p>
            Las analíticas te muestran reportes detallados: ingresos por
            período, ventas POS vs trabajos de laboratorio, conversión de
            presupuestos, citas completadas, productos más vendidos, métodos de
            pago y más. Es una vista más profunda que el Dashboard.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Requisitos
          </h3>
          <p>
            Esta sección requiere el plan Pro o Premium. Si no la ves, es porque
            tu suscripción no incluye analíticas avanzadas. El Dashboard
            principal siempre está disponible con los KPIs básicos.
          </p>
        </section>
        <section>
          <h3 className="text-lg font-display font-bold text-admin-text-primary uppercase tracking-wide mb-2">
            Períodos y filtros
          </h3>
          <p>
            Puedes elegir períodos de 7, 30, 90 o 365 días. Si tienes varias
            sucursales, el selector de sucursal te permite ver métricas por
            local o la vista global de toda la organización.
          </p>
        </section>
      </>
    ),
  },
};
