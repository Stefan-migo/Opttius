/**
 * Utilidades de fecha con zona horaria para Opttius (Chile: America/Santiago)
 *
 * El sistema almacena timestamps en UTC. Para filtros y visualización,
 * usamos la fecha local de Chile para evitar desfases (ej: venta a las 22:00
 * del día 24 no debe mostrarse como día 25).
 */

const DEFAULT_TIMEZONE = "America/Santiago";

/**
 * Obtiene el offset en minutos (UTC - local) para una fecha en una zona horaria.
 * GMT-3 => offset = -180 (Santiago 3h detrás de UTC)
 */
function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value;
  if (!tzPart || !tzPart.startsWith("GMT")) return 0;
  const match = tzPart.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  return sign * (hours * 60 + minutes);
}

/**
 * Convierte una fecha local (YYYY-MM-DD) en una zona horaria a los límites UTC.
 * Útil para filtrar registros por "día" en la zona del negocio.
 *
 * @param dateStr - Fecha en formato YYYY-MM-DD (día en zona local)
 * @param timeZone - Zona horaria IANA (default: America/Santiago)
 * @returns Objeto con start y end en ISO string UTC
 */
export function getLocalDateBoundsUTC(
  dateStr: string,
  timeZone: string = DEFAULT_TIMEZONE,
): { start: string; end: string } {
  const refDate = new Date(`${dateStr}T12:00:00.000Z`);
  const offsetMinutes = getTimezoneOffsetMinutes(refDate, timeZone);
  const offsetMs = offsetMinutes * 60 * 1000;

  // Inicio: dateStr 00:00:00 en zona local.
  // UTC = local - offsetMinutes (ej: 00:00 Santiago = 03:00 UTC cuando offset=-180)
  const startUTC = new Date(
    new Date(`${dateStr}T00:00:00.000Z`).getTime() - offsetMs,
  );
  const endUTC = new Date(
    new Date(`${dateStr}T23:59:59.999Z`).getTime() - offsetMs,
  );

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
  };
}

/**
 * Obtiene la fecha actual (YYYY-MM-DD) en la zona horaria del negocio.
 */
export function getTodayInTimezone(
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Formatea un timestamp UTC a fecha/hora en la zona del negocio.
 * Para uso en display consistente.
 */
export function formatInTimezone(
  date: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleString("es-CL", { ...options, timeZone });
}
