import { MaturityLevel } from "../memory/organizational";
import { getSectionPrompt } from "./prompts";
import { InsightSection } from "./schemas";

export class OrganizationalMaturitySystem {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Generates a maturity-adapted prompt for a specific section
   */
  async getAdaptivePrompts(
    section: InsightSection,
    maturity: MaturityLevel,
    data: unknown,
    organizationName: string,
    additionalContext?: Record<string, unknown>,
  ): Promise<string> {
    // Get the base prompt from the existing system
    // We pass maturity info in additionalContext so the base prompt can use it if it wants
    const contextWithMaturity = {
      ...additionalContext,
      organizationAge: maturity.daysSinceCreation,
      totalOrders: maturity.totalOrders,
      maturityLevel: maturity.level,
    };

    const basePrompt = getSectionPrompt(
      section,
      data,
      organizationName,
      contextWithMaturity,
    );
    const maturityAdjustments = this.getMaturityAdjustments(maturity.level);

    return `${basePrompt}\n\n${maturityAdjustments}`;
  }

  private getMaturityAdjustments(level: MaturityLevel["level"]): string {
    const adjustments = {
      new: `
      INSTRUCCIONES DE MADUREZ (NIVEL: NUEVO):
      Esta óptica es nueva en el sistema.
      - Tu tono debe ser de bienvenida, paciente y educativo.
      - Prioriza insights que ayuden a la configuración inicial y primeros pasos.
      - Evita jerga compleja o análisis avanzados que requieran datos históricos que no existen.
      - Enfócate en: "¿Cómo empezar?" y "Configuración básica".
      `,

      starting: `
      INSTRUCCIONES DE MADUREZ (NIVEL: INICIO):
      Esta óptica está en sus etapas iniciales.
      - Tu tono debe ser de guía y apoyo operativo.
      - Prioriza insights sobre el flujo de trabajo diario y registro de datos.
      - Ayuda a establecer buenos hábitos operativos.
      - Enfócate en: "Registrar ventas correctamente", "Crear base de clientes".
      `,

      growing: `
      INSTRUCCIONES DE MADUREZ (NIVEL: CRECIMIENTO):
      Esta óptica está creciendo.
      - Tu tono debe ser de consultor de negocios.
      - Prioriza insights sobre optimización, retención de clientes y eficiencia.
      - Usa los datos acumulados para mostrar tendencias tempranas.
      - Enfócate en: "Mejorar márgenes", "Retención de clientes", "Optimizar inventario".
      `,

      established: `
      INSTRUCCIONES DE MADUREZ (NIVEL: ESTABLECIDO):
      Esta óptica está consolidada.
      - Tu tono debe ser de analista experto y estratégico.
      - Prioriza insights profundos, detección de anomalías sutiles y oportunidades estratégicas.
      - Sé exigente con las métricas y busca la excelencia operativa.
      - Enfócate en: "Estrategia a largo plazo", "Maximización de rentabilidad", "Análisis de mercado".
      `,
    };

    return adjustments[level] || adjustments["growing"];
  }
}
