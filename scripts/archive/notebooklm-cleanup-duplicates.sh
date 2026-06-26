#!/bin/bash
# Elimina fuentes duplicadas del cuaderno Extendido de NotebookLM
# Ejecutar: nlm login --check && bash scripts/notebooklm-cleanup-duplicates.sh
# IMPORTANTE: Revisar la lista antes de ejecutar. Las eliminaciones son irreversibles.

set -e
NB_EXT_ID="17302d9d-7d70-4c8d-a774-49fbfca3c09d"
export PYTHONIOENCODING=utf-8

echo "Eliminando duplicados del cuaderno Extendido ($NB_EXT_ID)..."
echo "Cada delete requiere --confirm. Ejecuta manualmente los comandos que apliquen."
echo ""

# Duplicados a eliminar (mantener el primero de cada grupo)
# Formato: source-id a eliminar
DUPLICATES=(
  "cc4acf08-0e9c-471d-8c9f-6d4bda45bb1e"  # AI_DOCS_ARCHIVE_INDEX (dup 2)
  "e136539e-67e9-4d9f-926e-76d2bf94e417"  # AI_DOCS_ARCHIVE_INDEX (dup 3)
  "da492997-fdd2-4483-854a-9d2e89064331"  # AI_IMPLEMENTATION_STATUS (dup 2)
  "e2d9bcfd-32c3-4e99-89ee-8ccce9f46739"  # API_IMPLEMENTATION_STATUS (dup 2)
  "f1e29a4a-b53a-4099-af72-f67ad14369f3"  # CTO_BRIEFING_COMPLETE (dup 2)
  "fc52ffe6-055b-40f6-8d24-a9432f01c0d2"  # CTO_BRIEFING_COMPLETE (dup 3)
  "aa88d484-68b2-4d22-83e6-106e8c800fcb"  # CTO_ONBOARDING_WEEK1_SUMMARY (dup 2)
  "be4b3192-1798-4e32-8e8c-b74e338382ae"  # CTO_ONBOARDING_WEEK1_SUMMARY (dup 3)
  "f6b2c720-0b72-4010-8631-039dd52800d0"  # EMAIL_SYSTEM_UPDATE_2026-02 (dup 2)
  "57aa7bdb-c357-4407-ae6e-2c77f3e8efef"  # ESTADO_SISTEMA_POST_SALVATAJE (dup 2)
  "d5226d67-3887-4af0-8410-726de1b09490"  # ESTADO_SISTEMA_POST_SALVATAJE (dup 3)
  "a5a6c039-e611-4df9-9c76-a1476615601f"  # FORMS_IMPLEMENTATION_STATUS (dup 2)
  "bac2ba2d-a3ab-4321-b19a-1d82220980aa"  # INTEGRATIONS_IMPLEMENTATION_STATUS (dup 2)
  "3da6b320-7a42-4592-90b6-b1bd5ec3d858"  # PAYMENTS_IMPLEMENTATION_STATUS (dup 2)
  "76681cd6-2522-44b5-b687-48679d6256d9"  # PROCESO_SALVATAJE_CODIGO (dup 2)
  "a5f73214-7f92-4d80-8b66-2eb91b6f5ca2"  # PROCESO_SALVATAJE_CODIGO (dup 3)
  "71fb25bc-948d-4eba-8199-d644ecafb750"  # RESUMEN_EJECUTIVO_CORRECCIONES (dup 2)
  "ab44065e-1a52-4a3c-bf25-01f6b5538d64"  # RESUMEN_EJECUTIVO_CORRECCIONES (dup 3)
  "bc71d07a-5da0-4c1a-804e-d7070d49f94f"  # RESUMEN_SALVATAJE_FINAL (dup 2)
  "ce97484c-f11e-4690-80d4-6255efdf10fa"  # RESUMEN_SALVATAJE_FINAL (dup 3)
  "4a242c55-1701-4b2e-8a42-1f184a9201c3"  # SETUP_IMPLEMENTATION_STATUS (dup 2)
  "abd97547-3b93-4329-b2ac-b1e37459f73b"  # SKILL.md (dup 2)
)

for id in "${DUPLICATES[@]}"; do
  echo "nlm source delete $id --confirm"
  nlm source delete "$id" --confirm 2>/dev/null || echo "  (omitido o ya eliminado)"
  sleep 2
done

echo ""
echo "Listo. Ejecuta sync-notebooklm-extended.sh para añadir documentación actualizada."
