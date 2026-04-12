#!/usr/bin/env bash
# Sweetbook 웹훅 시뮬레이터
# 사용: bash scripts/test-sweetbook-webhook.sh <orderUid>
# 환경변수: NGROK_URL, SWEETBOOK_WEBHOOK_SECRET (.env에서 자동 로드)

set -e

ORDER_UID="${1:-}"
if [ -z "$ORDER_UID" ]; then
  echo "❌ usage: bash scripts/test-sweetbook-webhook.sh <orderUid>"
  echo "   e.g. bash scripts/test-sweetbook-webhook.sh or_3eO5wOxoZMbT"
  exit 1
fi

# .env 로드 (SWEETBOOK_WEBHOOK_SECRET + NGROK_URL)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

NGROK_URL="${NGROK_URL:-http://localhost:3000}"
SECRET="${SWEETBOOK_WEBHOOK_SECRET:-}"

if [ -z "$SECRET" ]; then
  echo "❌ SWEETBOOK_WEBHOOK_SECRET 이 .env 에 설정되지 않았습니다"
  exit 1
fi

TARGET_URL="${NGROK_URL%/}/webhooks/sweetbook"
echo "▶ Target: $TARGET_URL"
echo "▶ Order UID: $ORDER_UID"
echo "▶ Secret: ${SECRET:0:8}...${SECRET: -4}"
echo

# 이벤트 하나 발송 함수
send_event() {
  local EVENT_TYPE="$1"
  local EXTRA_DATA="${2:-}"
  local TIMESTAMP
  TIMESTAMP=$(date +%s)
  local DELIVERY_ID="test-${TIMESTAMP}-${RANDOM}"
  local EVENT_UID="evt_$(uuidgen 2>/dev/null || echo "$RANDOM$RANDOM")"

  # data JSON 조립 (order_uid + optional extras) — Sweetbook snake_case 공식 포맷
  local DATA
  if [ -n "$EXTRA_DATA" ]; then
    DATA="{\"order_uid\":\"${ORDER_UID}\",${EXTRA_DATA}}"
  else
    DATA="{\"order_uid\":\"${ORDER_UID}\"}"
  fi

  local BODY
  BODY=$(printf '{"event_uid":"%s","event_type":"%s","created_at":"%sZ","isTest":true,"data":%s}' \
    "$EVENT_UID" "$EVENT_TYPE" "$(date -u +%Y-%m-%dT%H:%M:%S)" "$DATA")

  # HMAC-SHA256 계산: {timestamp}.{body}
  local SIGNATURE
  SIGNATURE=$(printf '%s.%s' "$TIMESTAMP" "$BODY" \
    | openssl dgst -sha256 -hmac "$SECRET" \
    | awk '{print $NF}')

  echo "▶ $EVENT_TYPE"
  echo "  delivery=$DELIVERY_ID"

  local RESPONSE
  RESPONSE=$(curl -s -w '\n__HTTP_STATUS__%{http_code}' -X POST "$TARGET_URL" \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Event: $EVENT_TYPE" \
    -H "X-Webhook-Delivery: $DELIVERY_ID" \
    -H "X-Webhook-Timestamp: $TIMESTAMP" \
    -H "X-Webhook-Signature: sha256=$SIGNATURE" \
    -d "$BODY")

  local STATUS
  STATUS=$(echo "$RESPONSE" | grep '^__HTTP_STATUS__' | sed 's/^__HTTP_STATUS__//')
  local BODY_OUT
  BODY_OUT=$(echo "$RESPONSE" | grep -v '^__HTTP_STATUS__')

  if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
    echo "  ✅ $STATUS — $BODY_OUT"
  else
    echo "  ❌ $STATUS — $BODY_OUT"
  fi
  echo
}

# 순차 발송 (사이에 3초 sleep) — Sweetbook 공식 snake_case 필드명
send_event "production.confirmed" "\"order_status\":30,\"print_day\":\"2026-04-20\",\"confirmed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
sleep 3

send_event "production.started" "\"order_status\":40,\"changed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
sleep 3

send_event "production.completed" "\"order_status\":50,\"completed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
sleep 3

send_event "shipping.departed" "\"item_uid\":\"itm_test_1\",\"tracking_number\":\"1234567890\",\"tracking_carrier\":\"CJ\",\"shipped_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
sleep 3

send_event "shipping.delivered" "\"order_status\":70,\"changed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""

echo "✅ 5단계 이벤트 전송 완료"
echo "   브라우저에서 OrderCompletePage 새로고침 → DELIVERED 상태 확인"
