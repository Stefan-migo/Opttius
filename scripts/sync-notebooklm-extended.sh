#!/bin/bash
# Sincroniza documentación extendida con el segundo cuaderno de NotebookLM
# Ejecutar tras: nlm login (sesión activa)
# Uso: bash scripts/sync-notebooklm-extended.sh

set -e
NB_EXT_ID="17302d9d-7d70-4c8d-a774-49fbfca3c09d"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Sincronizando fuentes extendidas con NotebookLM (notebook $NB_EXT_ID)..."
echo "Asegúrate de haber ejecutado: nlm login --check"
echo ""

export PYTHONIOENCODING=utf-8

add_source() {
  local file="$1"
  local title="$2"
  if [ -f "$ROOT/$file" ]; then
    echo "  + $title"
    nlm source add "$NB_EXT_ID" --file "$ROOT/$file" --title "$title" 2>/dev/null || echo "    (omitido o error)"
    sleep 2
  fi
}

# Archive - documentación histórica
add_source "docs/archive/AI_DOCS_ARCHIVE_INDEX.md" "AI_DOCS_ARCHIVE_INDEX"
add_source "docs/archive/CTO_BRIEFING_COMPLETE.md" "CTO_BRIEFING_COMPLETE"
add_source "docs/archive/CTO_ONBOARDING_WEEK1_SUMMARY.md" "CTO_ONBOARDING_WEEK1_SUMMARY"
add_source "docs/archive/ESTADO_SISTEMA_POST_SALVATAJE.md" "ESTADO_SISTEMA_POST_SALVATAJE"
add_source "docs/archive/PROCESO_SALVATAJE_CODIGO.md" "PROCESO_SALVATAJE_CODIGO"
add_source "docs/archive/RESUMEN_EJECUTIVO_CORRECCIONES.md" "RESUMEN_EJECUTIVO_CORRECCIONES"
add_source "docs/archive/RESUMEN_SALVATAJE_FINAL.md" "RESUMEN_SALVATAJE_FINAL"

# Estado de implementación
add_source "docs/setup/SETUP_IMPLEMENTATION_STATUS.md" "SETUP_IMPLEMENTATION_STATUS"
add_source "docs/api/API_IMPLEMENTATION_STATUS.md" "API_IMPLEMENTATION_STATUS"
add_source "docs/ai/AI_IMPLEMENTATION_STATUS.md" "AI_IMPLEMENTATION_STATUS"
add_source "docs/payments/PAYMENTS_IMPLEMENTATION_STATUS.md" "PAYMENTS_IMPLEMENTATION_STATUS"
add_source "docs/integrations/INTEGRATIONS_IMPLEMENTATION_STATUS.md" "INTEGRATIONS_IMPLEMENTATION_STATUS"
add_source "docs/forms/FORMS_IMPLEMENTATION_STATUS.md" "FORMS_IMPLEMENTATION_STATUS"
add_source "docs/email/EMAIL_IMPLEMENTATION_STATUS.md" "EMAIL_IMPLEMENTATION_STATUS"
add_source "docs/analysis/ANALYSIS_IMPLEMENTATION_STATUS.md" "ANALYSIS_IMPLEMENTATION_STATUS"

# Análisis y evaluaciones
add_source "docs/DATABASE_EVALUATION_AND_RECOMMENDATIONS.md" "DATABASE_EVALUATION_AND_RECOMMENDATIONS"
add_source "docs/INVENTORY_ANALYSIS_AND_IMPROVEMENTS.md" "INVENTORY_ANALYSIS_AND_IMPROVEMENTS"
add_source "docs/SEED_CONSTRAINTS_REFERENCE.md" "SEED_CONSTRAINTS_REFERENCE"
add_source "docs/BRAIN_EVALUATION.md" "BRAIN_EVALUATION"

# Guías técnicas y planes
add_source "docs/SUPABASE_FIX_INSTRUCTIONS.md" "SUPABASE_FIX_INSTRUCTIONS"
add_source "docs/COPY_IMPROVEMENT_PLAN.md" "COPY_IMPROVEMENT_PLAN"
add_source "docs/CHANGELOG_TYPOGRAPHY.md" "CHANGELOG_TYPOGRAPHY"
add_source "docs/IDENTITY_AUDIT.md" "IDENTITY_AUDIT"

# Guías de NotebookLM
add_source "docs/NOTEBOOKLM_CUADERNOS_GUIA.md" "NOTEBOOKLM_CUADERNOS_GUIA"
add_source "docs/NOTEBOOKLM_SYNC.md" "NOTEBOOKLM_SYNC"

# Docs raíz
add_source "docs/README.md" "docs_README"
add_source "docs/PROJECT_SUMMARY.md" "PROJECT_SUMMARY"

echo ""
echo "Listo. Ver docs/NOTEBOOKLM_CUADERNOS_GUIA.md para cuándo usar cada cuaderno."
