#!/usr/bin/env bash
# PTMMM: Run Daily KPI ETL
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-dev}"   # dev / stg / prod
DATA_DATE="${1:-}"                  # optional: YYYY-MM-DD
BATCH_ID="${2:-}"                   # optional: custom batch id

case "$ENVIRONMENT" in
  dev)
    TIDB_HOST="${TIDB_HOST:-127.0.0.1}"
    TIDB_PORT="${TIDB_PORT:-4000}"
    TIDB_USER="${TIDB_USER:-root}"
    TIDB_PASS="${TIDB_PASS:-}"
    TIDB_DB="${TIDB_DB:-ptmmm_dev}"
    ;;
  stg)
    TIDB_HOST="${TIDB_HOST:-stg-tidb-host}"
    TIDB_PORT="${TIDB_PORT:-4000}"
    TIDB_USER="${TIDB_USER:-ptmmm_etl}"
    TIDB_PASS="${TIDB_PASS:-change_me}"
    TIDB_DB="${TIDB_DB:-ptmmm_stg}"
    ;;
  prod)
    TIDB_HOST="${TIDB_HOST:-prod-tidb-host}"
    TIDB_PORT="${TIDB_PORT:-4000}"
    TIDB_USER="${TIDB_USER:-ptmmm_etl}"
    TIDB_PASS="${TIDB_PASS:-change_me}"
    TIDB_DB="${TIDB_DB:-ptmmm_prod}"
    ;;
  *)
    echo "[ERROR] ENVIRONMENT harus dev|stg|prod"
    exit 1
    ;;
esac

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$BASE_DIR/logs/etl"
mkdir -p "$LOG_DIR"

RUN_TS="$(date '+%Y-%m-%d_%H-%M-%S')"
LOG_FILE="$LOG_DIR/daily_kpi_etl_${ENVIRONMENT}_${RUN_TS}.log"

echo "[INFO] Starting Daily KPI ETL ($ENVIRONMENT) at $(date)" | tee -a "$LOG_FILE"

if [[ -z "$DATA_DATE" ]]; then
  if date -d "yesterday" '+%Y-%m-%d' >/dev/null 2>&1; then
    DATA_DATE="$(date -d "yesterday" '+%Y-%m-%d')"
  else
    DATA_DATE="$(date -v-1d '+%Y-%m-%d')"
  fi
fi

if [[ -z "$BATCH_ID" ]]; then
  BATCH_ID="BATCH_${DATA_DATE}_$(date '+%H%M%S')"
fi

echo "[INFO] DATA_DATE = $DATA_DATE" | tee -a "$LOG_FILE"
echo "[INFO] BATCH_ID  = $BATCH_ID"  | tee -a "$LOG_FILE"

MYSQL_CMD=(mysql -h"$TIDB_HOST" -P"$TIDB_PORT" -u"$TIDB_USER" --protocol=TCP "$TIDB_DB")
if [[ -n "${TIDB_PASS}" ]]; then
  MYSQL_CMD+=( -p"$TIDB_PASS" )
fi

SQL="CALL sp_run_daily_kpi_etl('${DATA_DATE}', '${BATCH_ID}');"

set +e
"${MYSQL_CMD[@]}" -e "$SQL" >> "$LOG_FILE" 2>&1
RET=$?
set -e

if [[ $RET -ne 0 ]]; then
  echo "[ERROR] Daily KPI ETL FAILED (exit code: $RET)" | tee -a "$LOG_FILE"
  exit $RET
fi

echo "[INFO] Daily KPI ETL DONE at $(date)" | tee -a "$LOG_FILE"
exit 0
