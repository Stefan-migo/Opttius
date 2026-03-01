#!/bin/bash
# Sincroniza documentación extendida con el segundo cuaderno de NotebookLM
# Ejecutar tras: nlm login (sesión activa)
# Uso: bash scripts/sync-notebooklm-extended.sh

set -e
NB_EXT_ID="17302d9d-7d70-4c8d-a774-49fbfca3c09d"
NB_ANEXO="19de09c1-37ae-4832-a17b-dd326c613ce3"
NB_ANEXO2="2084f3bf-70df-4dd4-a0b3-3cfe0d6c9cff"
NB_ANEXO3="d2a862dc-a6de-46f2-bacc-c483d1f31b32"
NB_ANEXO4="2c8b8292-bc96-4697-84a3-801306784619"
NB_ANEXO5="f7d4d9c4-de38-4020-a069-e485aa64d792"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Sincronizando fuentes extendidas (Extendido → Anexo → Anexo 2 → Anexo 3 → Anexo 4 → Anexo 5)..."
echo "Asegúrate de haber ejecutado: nlm login --check"
echo ""

export PYTHONIOENCODING=utf-8

add_source() {
  local file="$1"
  local title="$2"
  if [ -f "$ROOT/$file" ]; then
    echo -n "  + $title ... "
    if nlm source add "$NB_EXT_ID" --file "$ROOT/$file" --title "$title" 2>/dev/null; then
      echo "OK (Extendido)"
    elif nlm source add "$NB_ANEXO" --file "$ROOT/$file" --title "$title" 2>/dev/null; then
      echo "OK (Anexo)"
    elif nlm source add "$NB_ANEXO2" --file "$ROOT/$file" --title "$title" 2>/dev/null; then
      echo "OK (Anexo 2)"
    elif nlm source add "$NB_ANEXO3" --file "$ROOT/$file" --title "$title" 2>/dev/null; then
      echo "OK (Anexo 3)"
    elif nlm source add "$NB_ANEXO4" --file "$ROOT/$file" --title "$title" 2>/dev/null; then
      echo "OK (Anexo 4)"
    elif nlm source add "$NB_ANEXO5" --file "$ROOT/$file" --title "$title" 2>/dev/null; then
      echo "OK (Anexo 5)"
    else
      echo "omitido (ya existe o límite)"
    fi
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
add_source "docs/email/EMAIL_SYSTEM_UPDATE_2026-02.md" "EMAIL_SYSTEM_UPDATE_2026-02"
add_source ".cursor/skills/emails-optical-supabase/SKILL.md" "Skill_Emails_Optical_Supabase"
add_source "docs/analysis/ANALYSIS_IMPLEMENTATION_STATUS.md" "ANALYSIS_IMPLEMENTATION_STATUS"

# Análisis y evaluaciones
add_source "docs/DATABASE_EVALUATION_AND_RECOMMENDATIONS.md" "DATABASE_EVALUATION_AND_RECOMMENDATIONS"
add_source "docs/INVENTORY_ANALYSIS_AND_IMPROVEMENTS.md" "INVENTORY_ANALYSIS_AND_IMPROVEMENTS"
add_source "docs/SEED_CONSTRAINTS_REFERENCE.md" "SEED_CONSTRAINTS_REFERENCE"
add_source "docs/BRAIN_EVALUATION.md" "BRAIN_EVALUATION"

# Dashboard - documentación y skill
add_source "docs/dashboard/DASHBOARD_SYSTEM.md" "DASHBOARD_SYSTEM"
add_source ".cursor/skills/dashboard-optical-supabase/SKILL.md" "Skill_Dashboard_Optical_Supabase"

# Frontend responsivo (actualizado 2026-02)
add_source "docs/FRONTEND_RESPONSIVITY.md" "FRONTEND_RESPONSIVITY"
add_source "docs/FRONTEND_RESPONSIVE_UPDATE_2026-02.md" "FRONTEND_RESPONSIVE_UPDATE_2026-02"
add_source ".cursor/skills/responsive-frontend-optical/SKILL.md" "Skill_Responsive_Frontend_Optical"

# Guía de usuario
add_source "docs/user-guide/README.md" "User_Guide_README"
add_source "docs/user-guide/dashboard.md" "User_Guide_Dashboard"

# Guías técnicas y planes
add_source "docs/VERCEL_DEPLOYMENT_2026-02.md" "VERCEL_DEPLOYMENT_2026-02"
add_source "docs/SUPABASE_FIX_INSTRUCTIONS.md" "SUPABASE_FIX_INSTRUCTIONS"
add_source "docs/COPY_IMPROVEMENT_PLAN.md" "COPY_IMPROVEMENT_PLAN"
add_source "docs/CHANGELOG_TYPOGRAPHY.md" "CHANGELOG_TYPOGRAPHY"
add_source "docs/IDENTITY_AUDIT.md" "IDENTITY_AUDIT"
add_source "docs/marketing/MARKETING_IDENTITY_STRATEGY.md" "MARKETING_IDENTITY_STRATEGY"

# WhatsApp + Agente IA (docs principales en sync-sources; aquí solo complementos)
add_source "docs/WHATSAPP_IMPLEMENTATION_PROMPT.md" "Prompt Implementación WhatsApp"
add_source ".cursor/skills/whatsapp-ai-agent-optical/SKILL.md" "Skill WhatsApp AI Agent Óptico"
add_source ".cursor/skills/whatsapp-agent-training-optical/SKILL.md" "Skill Entrenamiento Agente WhatsApp"

# Testing - guía y skill
add_source "docs/TESTING_GUIDE.md" "Guía de Testing Opttius"
add_source "docs/PLAN_TESTING_IMPLEMENTATION.md" "Plan Implementación Testing"
add_source "docs/MANUAL_TESTING_GUIDE_COMPLETE.md" "Guía de Testing Manual Completa"
add_source "docs/VIDEOTUTORIALES_MAP.md" "Mapa de Videotutoriales"
add_source ".cursor/skills/testing-optical-supabase/SKILL.md" "Skill Testing Optical Supabase"

# Índice consolidado de skills (23 guías de dominio)
add_source "docs/OPTTIUS_SKILLS_INDEX.md" "OPTTIUS_SKILLS_INDEX"

# Guías de NotebookLM
add_source "docs/NOTEBOOKLM_CUADERNOS_GUIA.md" "NOTEBOOKLM_CUADERNOS_GUIA"
add_source "docs/NOTEBOOKLM_SYNC.md" "NOTEBOOKLM_SYNC"

# Docs raíz
add_source "docs/README.md" "docs_README"
add_source "docs/PROJECT_SUMMARY.md" "PROJECT_SUMMARY"

echo ""
echo "Listo. Ver docs/NOTEBOOKLM_CUADERNOS_GUIA.md para cuándo usar cada cuaderno."
