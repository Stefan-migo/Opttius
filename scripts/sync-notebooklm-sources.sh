#!/bin/bash
# Sincroniza documentación clave con NotebookLM
# Ejecutar tras cambios en docs de Sistema o Frontend
# Requiere: nlm login (sesión activa)

set -e
NB_ID="e071bebc-ce79-4b32-a040-61a6a9c331a3"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Sincronizando fuentes con NotebookLM (notebook $NB_ID)..."

export PYTHONIOENCODING=utf-8

if [ -f "$ROOT/docs/SYSTEM_CONFIGURATION.md" ]; then
  echo "  - SYSTEM_CONFIGURATION.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/SYSTEM_CONFIGURATION.md" --title "SYSTEM_CONFIGURATION" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/SYSTEM_CONFIGURATION_CHANGELOG_2026-02.md" ]; then
  echo "  - SYSTEM_CONFIGURATION_CHANGELOG_2026-02.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/SYSTEM_CONFIGURATION_CHANGELOG_2026-02.md" --title "SYSTEM_CONFIGURATION_CHANGELOG" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/IDENTITY.md" ]; then
  echo "  - IDENTITY.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/IDENTITY.md" --title "IDENTITY" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/FRONTEND_IDENTITY.md" ]; then
  echo "  - FRONTEND_IDENTITY.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/FRONTEND_IDENTITY.md" --title "Frontend Identity Documentation - Opttius" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/SAAS_MANAGEMENT_SYSTEM.md" ]; then
  echo "  - SAAS_MANAGEMENT_SYSTEM.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/SAAS_MANAGEMENT_SYSTEM.md" --title "SAAS_MANAGEMENT_SYSTEM" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/SAAS_MANAGEMENT_IMPROVEMENTS_2026-02.md" ]; then
  echo "  - SAAS_MANAGEMENT_IMPROVEMENTS_2026-02.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/SAAS_MANAGEMENT_IMPROVEMENTS_2026-02.md" --title "SAAS_MANAGEMENT_IMPROVEMENTS_2026-02" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/USER_PROFILE_SYSTEM.md" ]; then
  echo "  - USER_PROFILE_SYSTEM.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/USER_PROFILE_SYSTEM.md" --title "USER_PROFILE_SYSTEM" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/USER_PROFILE_IMPROVEMENTS_2026-02.md" ]; then
  echo "  - USER_PROFILE_IMPROVEMENTS_2026-02.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/USER_PROFILE_IMPROVEMENTS_2026-02.md" --title "USER_PROFILE_IMPROVEMENTS_2026-02" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/PAYMENT_WORKFLOW_SYSTEM.md" ]; then
  echo "  - PAYMENT_WORKFLOW_SYSTEM.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/PAYMENT_WORKFLOW_SYSTEM.md" --title "PAYMENT_WORKFLOW_SYSTEM" 2>/dev/null || true
fi

if [ -f "$ROOT/docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md" ]; then
  echo "  - PAYMENT_WORKFLOW_TEST_CHECKLIST.md"
  nlm source add "$NB_ID" --file "$ROOT/docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md" --title "PAYMENT_WORKFLOW_TEST_CHECKLIST" 2>/dev/null || true
fi

echo "Listo. Nota: nlm source add puede crear fuentes duplicadas si el título ya existe."
echo "Ver docs/NOTEBOOKLM_SYNC.md para más detalles."
