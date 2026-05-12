#!/usr/bin/env bash
# Healthcheck: detecta símbolos ausentes / imports quebrados antes do deploy.
# Uso: bash scripts/healthcheck.sh
set -u

echo "▶ Rodando typecheck (tsc --noEmit)..."
TSC_OUT=$(bunx tsc --noEmit 2>&1)
TSC_CODE=$?

if [ $TSC_CODE -ne 0 ]; then
  echo "$TSC_OUT"
  echo ""
  CRITICAL=$(echo "$TSC_OUT" | grep -E "TS2304|TS2307|TS2552|TS2305" || true)
  if [ -n "$CRITICAL" ]; then
    echo "✖ Símbolos ausentes / imports quebrados detectados:"
    echo "$CRITICAL"
    exit 1
  fi
  echo "✖ Erros de typecheck encontrados."
  exit $TSC_CODE
fi

echo "✓ Typecheck OK — nenhum símbolo ausente."
