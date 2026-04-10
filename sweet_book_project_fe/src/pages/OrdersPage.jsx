import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyOrders, useCancelOrder } from '../features/orders/hooks/useOrders';

const STATUS_STEPS = [
  { key: 'order', label: '주문', statuses: ['PAID', 'PDF_READY'] },
  { key: 'confirmed', label: '제작확정', statuses: ['CONFIRMED'] },
  { key: 'production', label: '제작', statuses: ['IN_PRODUCTION', 'ITEM_COMPLETED', 'PRODUCTION_COMPLETE'] },
  { key: 'shipping', label: '배송', statuses: ['SHIPPED'] },
  { key: 'done', label: '완료', statuses: ['DELIVERED'] },
];

const STATUS_LABELS = {
  PENDING: '대기',
  SUBMITTING: '처리 중',
  PAID: '결제 완료',
  PDF_READY: 'PDF 준비',
  CONFIRMED: '제작 확정',
  IN_PRODUCTION: '제작 중',
  ITEM_COMPLETED: '아이템 완료',
  PRODUCTION_COMPLETE: '제작 완료',
  SHIPPED: '배송 중',
  DELIVERED: '배송 완료',
  CANCELLED: '취소',
  CANCELLED_REFUND: '환불 완료',
  ERROR: '오류',
};

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600',
  PAID: 'bg-green-50 text-green-700',
  PDF_READY: 'bg-green-50 text-green-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  IN_PRODUCTION: 'bg-blue-50 text-blue-700',
  PRODUCTION_COMPLETE: 'bg-blue-50 text-blue-700',
  SHIPPED: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
  CANCELLED_REFUND: 'bg-red-50 text-red-600',
  ERROR: 'bg-red-50 text-red-600',
};

function StatusTimeline({ status }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.statuses.includes(status));
  const isCancelled = ['CANCELLED', 'CANCELLED_REFUND', 'ERROR'].includes(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <span className="text-sm font-medium text-red-600">{STATUS_LABELS[status]}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full py-2">
      {STATUS_STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex items-center w-full">
              {idx > 0 && (
                <div className={`flex-1 h-0.5 ${idx <= currentIdx ? 'bg-brand' : 'bg-warm-border'}`} />
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-green-500' : isActive ? 'bg-brand' : 'bg-warm-border'
              }`}>
                {isDone ? (
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : isActive ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                ) : null}
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${idx < currentIdx ? 'bg-brand' : 'bg-warm-border'}`} />
              )}
            </div>
            <span className={`text-[10px] ${isActive ? 'text-brand font-semibold' : isDone ? 'text-ink' : 'text-ink-muted'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const cancelOrder = useCancelOrder();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const canCancel = order.status === 'PAID' || order.status === 'PDF_READY';
  const bookTitle = order.orderGroup?.book?.title ?? '포토북';

  const handleCancel = () => {
    if (!cancelReason.trim()) return;
    cancelOrder.mutate(
      { orderId: order.id, cancelReason: cancelReason.trim() },
      { onSuccess: () => setShowCancel(false) },
    );
  };

  return (
    <div className="bg-white rounded-xl border border-warm-border overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-ink">{bookTitle}</h3>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {order.recipientName} · {order.quantity}권 ·{' '}
            {order.orderedAt
              ? new Date(order.orderedAt).toLocaleDateString('ko-KR')
              : new Date(order.createdAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          <svg className={`w-4 h-4 text-ink-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-warm-border pt-4">
          {/* Status timeline */}
          <StatusTimeline status={order.status} />

          {/* Shipping info */}
          <div className="bg-warm-bg rounded-lg p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-ink-sub">배송 정보</p>
            <p className="text-sm text-ink">{order.recipientName} · {order.recipientPhone}</p>
            <p className="text-sm text-ink">
              [{order.recipientZipCode}] {order.recipientAddress}
              {order.recipientAddressDetail && ` ${order.recipientAddressDetail}`}
            </p>
            {order.memo && (
              <p className="text-xs text-ink-muted">메모: {order.memo}</p>
            )}
          </div>

          {/* Price info */}
          {order.totalPrice && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-sub">결제 금액</span>
              <span className="font-bold text-ink">{Number(order.totalPrice).toLocaleString()}원</span>
            </div>
          )}

          {/* Sweetbook order ID */}
          {order.sweetbookOrderUid && (
            <p className="text-[10px] text-ink-muted">
              주문번호: {order.sweetbookOrderUid}
            </p>
          )}

          {/* Cancel */}
          {canCancel && !showCancel && (
            <button type="button" onClick={() => setShowCancel(true)}
              className="text-xs text-red-500 hover:text-red-600 transition-colors">
              주문 취소
            </button>
          )}
          {showCancel && (
            <div className="space-y-2 pt-2 border-t border-warm-border">
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="취소 사유를 입력하세요"
                className="w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCancel(false)}
                  className="flex-1 h-9 text-xs text-ink-sub border border-warm-border rounded-full hover:bg-warm-bg transition-colors">
                  취소
                </button>
                <button type="button" onClick={handleCancel}
                  disabled={!cancelReason.trim() || cancelOrder.isPending}
                  className="flex-1 h-9 text-xs font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50">
                  {cancelOrder.isPending ? '처리 중...' : '주문 취소 확정'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OrdersPage() {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useMyOrders();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center pb-20 lg:pb-0">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  const orderList = orders ?? [];
  const activeOrders = orderList.filter(
    (o) => !['DELIVERED', 'CANCELLED', 'CANCELLED_REFUND'].includes(o.status),
  );
  const completedOrders = orderList.filter(
    (o) => ['DELIVERED', 'CANCELLED', 'CANCELLED_REFUND'].includes(o.status),
  );

  return (
    <div className="min-h-screen bg-warm-bg pb-20 lg:pb-0">
      <div className="max-w-3xl mx-auto px-4 lg:px-10 py-6 lg:py-8">
        <h1 className="text-xl font-bold text-ink mb-5">주문 내역</h1>

        {orderList.length === 0 ? (
          <div className="bg-white rounded-xl border border-warm-border p-10 text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-ink-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm text-ink-sub">아직 주문 내역이 없습니다</p>
            <button type="button" onClick={() => navigate('/groups')}
              className="mt-4 h-9 px-5 text-sm font-medium text-brand border border-brand rounded-full hover:bg-brand/5 transition-colors">
              모임 둘러보기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-[13px] font-semibold text-ink-sub mb-3">진행 중</h2>
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {completedOrders.length > 0 && (
              <div>
                <h2 className="text-[13px] font-semibold text-ink-sub mb-3">완료</h2>
                <div className="space-y-3">
                  {completedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
