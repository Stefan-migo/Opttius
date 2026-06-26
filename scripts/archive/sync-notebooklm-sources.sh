#!/bin/bash
# Sincroniza documentación clave con NotebookLM
# Cerebro (50/50) está lleno → añade a Extendido. Si Extendido falla → Anexo
# Ejecutar tras cambios en docs de Sistema o Frontend
# Requiere: nlm login (sesión activa)

set -e
NB_CEREBRO="e071bebc-ce79-4b32-a040-61a6a9c331a3"
NB_EXT="17302d9d-7d70-4c8d-a774-49fbfca3c09d"
NB_ANEXO="19de09c1-37ae-4832-a17b-dd326c613ce3"
NB_ANEXO2="2084f3bf-70df-4dd4-a0b3-3cfe0d6c9cff"
NB_ANEXO3="d2a862dc-a6de-46f2-bacc-c483d1f31b32"
NB_ANEXO4="2c8b8292-bc96-4697-84a3-801306784619"
NB_ANEXO5="f7d4d9c4-de38-4020-a069-e485aa64d792"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Sincronizando fuentes con NotebookLM..."
echo "  Extendido → Anexo → Anexo 2 → Anexo 3 → Anexo 4 → Anexo 5"
echo "  Ejecuta: nlm login --check"
echo ""

export PYTHONIOENCODING=utf-8

add_source() {
  local file="$1"
  local title="$2"
  if [ ! -f "$ROOT/$file" ]; then return; fi
  echo -n "  + $title ... "
  if nlm source add "$NB_EXT" --file "$ROOT/$file" --title "$title" 2>/dev/null; then
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
}

add_source "docs/SYSTEM_CONFIGURATION.md" "SYSTEM_CONFIGURATION"
add_source "docs/SYSTEM_CONFIGURATION_CHANGELOG_2026-02.md" "SYSTEM_CONFIGURATION_CHANGELOG"
add_source "docs/IDENTITY.md" "IDENTITY"
add_source "docs/FRONTEND_IDENTITY.md" "Frontend Identity Documentation - Opttius"
add_source "docs/SAAS_MANAGEMENT_SYSTEM.md" "SAAS_MANAGEMENT_SYSTEM"
add_source "docs/SAAS_MANAGEMENT_IMPROVEMENTS_2026-02.md" "SAAS_MANAGEMENT_IMPROVEMENTS_2026-02"
add_source "docs/USER_PROFILE_SYSTEM.md" "USER_PROFILE_SYSTEM"
add_source "docs/USER_PROFILE_IMPROVEMENTS_2026-02.md" "USER_PROFILE_IMPROVEMENTS_2026-02"
add_source "docs/PAYMENT_WORKFLOW_SYSTEM.md" "PAYMENT_WORKFLOW_SYSTEM"
add_source "docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md" "PAYMENT_WORKFLOW_TEST_CHECKLIST"
add_source "docs/WHATSAPP_AI_AGENT.md" "Módulo WhatsApp + Agente IA"
add_source "docs/WHATSAPP_AGENT_TRAINING.md" "Entrenamiento Agente WhatsApp"
add_source "docs/ai/AI_MODULE_IMPROVEMENTS_2026-03.md" "AI_MODULE_IMPROVEMENTS_2026-03"
add_source "docs/marketing/SEO_AIO_DISCOVERY_STRATEGY.md" "Estrategia SEO AIO Descubrimiento"
add_source "docs/marketing/SEO_AIO_TECHNICAL_REFERENCE.md" "Referencia Técnica SEO AIO"
add_source "docs/marketing/SEO_AIO_CURRENT_STATE_AND_IMPROVEMENTS.md" "Estado SEO AIO y Mejoras"
add_source "docs/marketing/MARKETING_IDENTITY_STRATEGY.md" "MARKETING_IDENTITY_STRATEGY"
add_source "docs/AGREEMENTS_SYSTEM.md" "AGREEMENTS_SYSTEM - Gestión de Convenios"
add_source ".cursor/skills/agreements-optical-supabase/SKILL.md" "Skill agreements-optical-supabase"
add_source "docs/FIELD_OPERATIONS_SYSTEM.md" "FIELD_OPERATIONS_SYSTEM - Operativos en Terreno"
add_source ".cursor/skills/field-operations-optical-supabase/SKILL.md" "Skill field-operations-optical-supabase"
add_source "docs/LIBRO_RECETAS_DIGITAL.md" "LIBRO_RECETAS_DIGITAL - Libro Digital de Recetas"
add_source ".cursor/skills/libro-recetas-digital-optical/SKILL.md" "Skill libro-recetas-digital-optical"

echo ""
echo "Listo. Ver docs/NOTEBOOKLM_SYNC.md y docs/NOTEBOOKLM_CUADERNOS_GUIA.md"
