#!/bin/bash
# Sincroniza documentación adicional al cuaderno Anexo (overflow)
# Usar cuando Extendido esté lleno o para docs nuevas
# Requiere: nlm login (sesión activa)

set -e
NB_ANEXO="19de09c1-37ae-4832-a17b-dd326c613ce3"
NB_ANEXO2="2084f3bf-70df-4dd4-a0b3-3cfe0d6c9cff"
NB_ANEXO3="d2a862dc-a6de-46f2-bacc-c483d1f31b32"
NB_ANEXO4="2c8b8292-bc96-4697-84a3-801306784619"
NB_ANEXO5="f7d4d9c4-de38-4020-a069-e485aa64d792"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Sincronizando fuentes (Anexo → Anexo 2 → Anexo 3 → Anexo 4 → Anexo 5)..."
export PYTHONIOENCODING=utf-8

add_source() {
  local file="$1"
  local title="$2"
  if [ -f "$ROOT/$file" ]; then
    echo -n "  + $title ... "
    if nlm source add "$NB_ANEXO" --file "$ROOT/$file" --title "$title" 2>/dev/null; then
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
      echo "omitido"
    fi
    sleep 2
  fi
}

# Docs que pueden no caber en Extendido o son complementarias
add_source "docs/ai/README.md" "AI_Module_Docs_Index"
add_source "docs/ai/AGENT_TOOLS_REFERENCE.md" "AGENT_TOOLS_REFERENCE"
add_source "docs/ai/AGENT_TOOLS_TEST_CHECKLIST.md" "AGENT_TOOLS_TEST_CHECKLIST"
add_source "docs/ai/AGENT_TRAINING_ROADMAP.md" "AGENT_TRAINING_ROADMAP"
add_source "docs/AI_SYSTEM.md" "AI_SYSTEM"
add_source "docs/AI_MODULE_UPDATE_2026-02.md" "AI_MODULE_UPDATE_2026-02"

echo "Listo."
