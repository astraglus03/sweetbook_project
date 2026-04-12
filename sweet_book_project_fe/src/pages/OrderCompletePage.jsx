import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMyOrders } from '../features/orders/hooks/useOrders';
import { useBook, useBookPages } from '../features/books/hooks/useBooks';
import { BookPreviewModal } from '../features/books/components/BookPreviewModal';

const STATUS_LABELS = {
  PAID: '결제 완료',
  PDF_READY: 'PDF 준비',
  CONFIRMED: '제작 확정',
  IN_PRODUCTION: '제작 중',
  PRODUCTION_COMPLETE: '제작 완료',
  SHIPPED: '배송 중',
  DELIVERED: '배송 완료',
  CANCELLED: '주문 취소',
  CANCELLED_REFUND: '환불 완료',
  ERROR: '오류',
};

const SPEC_LABEL = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

const TIMELINE = [
  { key: 'PAID', label: '주문 확정', statuses: ['PAID', 'PDF_READY'] },
  { key: 'CONFIRMED', label: '제작 준비', statuses: ['CONFIRMED'] },
  { key: 'PRODUCTION', label: '제작 중', statuses: ['IN_PRODUCTION', 'ITEM_COMPLETED', 'PRODUCTION_COMPLETE'] },
  { key: 'SHIPPING', label: '배송 중', statuses: ['SHIPPED'] },
  { key: 'DELIVERED', label: '배송 완료', statuses: ['DELIVERED'] },
];

export default function OrderCompletePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const numOrderId = Number(orderId);
  const [showPreview, setShowPreview] = useState(false);

  const { data: orders, isLoading } = useMyOrders();
  const order = orders?.find((o) => o.id === numOrderId);

  const bookId = order?.orderGroup?.bookId ?? order?.orderGroup?.book?.id;
  const { data: book } = useBook(bookId);
  const { data: pages } = useBookPages(bookId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-warm-bg flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-ink-sub">주문을 찾을 수 없습니다</p>
        <button type="button" onClick={() => navigate('/orders')}
          className="h-10 px-5 rounded-full border border-warm-border text-sm font-medium text-ink hover:bg-warm-bg">
          주문 목록으로
        </button>
      </div>
    );
  }

  const bookData = book ?? order.orderGroup?.book ?? {};
  const specLabel = SPEC_LABEL[bookData.bookSpecUid] || bookData.bookSpecUid;
  const orderDate = order.orderedAt ?? order.createdAt;
  const currentIdx = TIMELINE.findIndex((t) => t.statuses.includes(order.status));
  const isCancelled = ['CANCELLED', 'CANCELLED_REFUND', 'ERROR'].includes(order.status);
  const justOrdered = ['PAID', 'PDF_READY', 'CONFIRMED'].includes(order.status);

  return (
    <div className="min-h-screen bg-warm-bg pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-warm-border px-4 lg:px-10 py-5">
        <button type="button" onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-ink-sub hover:text-ink transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          주문 목록
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 lg:px-10 py-8 space-y-5">
        {/* Success banner */}
        {justOrdered && !isCancelled && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ink mb-2">주문이 완료되었습니다</h1>
            <p className="text-sm text-ink-sub">포토북 제작이 곧 시작돼요. 진행 상황을 알려드릴게요.</p>
          </div>
        )}
        {isCancelled && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ink mb-2">{STATUS_LABELS[order.status]}</h1>
          </div>
        )}
        {!justOrdered && !isCancelled && (
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-ink mb-2">주문 현황</h1>
            <p className="text-sm text-ink-sub">현재 상태: <span className="font-semibold text-brand">{STATUS_LABELS[order.status]}</span></p>
          </div>
        )}

        {/* 포토북 미리보기 카드 */}
        <div className="bg-white rounded-2xl border border-warm-border p-5 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-lg bg-gradient-to-br from-brand/20 to-brand/5 border border-warm-border flex items-center justify-center flex-shrink-0">
              <span className="font-display text-3xl text-brand/80 font-bold">{bookData.title?.[0] ?? '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink mb-1 truncate">{bookData.title ?? '포토북'}</h2>
              <p className="text-xs text-ink-sub mb-3">
                {specLabel && `${specLabel} · `}{bookData.pageCount}페이지 · {order.quantity}권
              </p>
              <button type="button" onClick={() => setShowPreview(true)}
                disabled={!book || !pages}
                className="h-9 px-4 rounded-full bg-ink text-white text-xs font-semibold hover:bg-black transition-colors disabled:opacity-50">
                포토북 미리보기
              </button>
            </div>
          </div>
        </div>

        {/* 진행 상태 타임라인 */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-warm-border p-5 lg:p-6">
            <h3 className="text-base font-bold text-ink mb-5">진행 상황</h3>
            <ol className="space-y-4">
              {TIMELINE.map((step, idx) => {
                const isDone = idx < currentIdx;
                const isActive = idx === currentIdx;
                const isPending = idx > currentIdx;
                return (
                  <li key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isDone ? 'bg-green-500' : isActive ? 'bg-brand' : 'bg-warm-border'
                      }`}>
                        {isDone ? (
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : isActive ? (
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        ) : null}
                      </div>
                      {idx < TIMELINE.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[16px] mt-1 ${idx < currentIdx ? 'bg-green-500' : 'bg-warm-border'}`} />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <p className={`text-sm font-semibold ${isActive ? 'text-brand' : isDone ? 'text-ink' : 'text-ink-muted'}`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <p className="text-[11px] text-ink-muted mt-0.5">현재 진행 중</p>
                      )}
                      {isPending && (
                        <p className="text-[11px] text-ink-muted mt-0.5">대기 중</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* 운송장 (배송 시작 후) */}
        {order.trackingNumber && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 lg:p-6">
            <h3 className="text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              배송 중
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-amber-800">운송장 번호</dt>
                <dd className="text-amber-900 font-mono font-bold">{order.trackingNumber}</dd>
              </div>
              {order.carrierCode && (
                <div className="flex justify-between gap-4">
                  <dt className="text-amber-800">배송사</dt>
                  <dd className="text-amber-900">{order.carrierCode}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* 주문 정보 */}
        <div className="bg-white rounded-2xl border border-warm-border p-5 lg:p-6">
          <h3 className="text-base font-bold text-ink mb-4">주문 정보</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-sub flex-shrink-0">주문일</dt>
              <dd className="text-ink text-right">{new Date(orderDate).toLocaleString('ko-KR')}</dd>
            </div>
            {order.sweetbookOrderUid && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-sub flex-shrink-0">주문 번호</dt>
                <dd className="text-ink text-right font-mono text-xs">{order.sweetbookOrderUid}</dd>
              </div>
            )}
            {order.expectedPrintDate && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-sub flex-shrink-0">제작 예정일</dt>
                <dd className="text-ink text-right">{new Date(order.expectedPrintDate).toLocaleDateString('ko-KR')}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-sub flex-shrink-0">수량</dt>
              <dd className="text-ink text-right">{order.quantity}권</dd>
            </div>
            {order.totalPrice && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-sub flex-shrink-0">결제 금액</dt>
                <dd className="text-ink text-right font-bold">{Number(order.totalPrice).toLocaleString()}원</dd>
              </div>
            )}
          </dl>
        </div>

        {/* 배송 정보 */}
        <div className="bg-white rounded-2xl border border-warm-border p-5 lg:p-6">
          <h3 className="text-base font-bold text-ink mb-4">배송 정보</h3>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-ink">{order.recipientName}</p>
            <p className="text-ink-sub">{order.recipientPhone}</p>
            <p className="text-ink-sub">
              [{order.recipientZipCode}] {order.recipientAddress}
              {order.recipientAddressDetail && ` ${order.recipientAddressDetail}`}
            </p>
            {order.memo && (
              <p className="text-xs text-ink-muted pt-1">메모: {order.memo}</p>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => navigate('/orders')}
            className="flex-1 h-12 rounded-full border border-warm-border text-sm font-medium text-ink bg-white hover:bg-warm-bg transition-colors">
            주문 목록으로
          </button>
          <button type="button" onClick={() => navigate('/groups')}
            className="flex-1 h-12 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors">
            내 모임으로
          </button>
        </div>
      </div>

      {showPreview && book && (
        <BookPreviewModal
          book={book}
          pages={pages}
          coverTemplateUid={book.coverTemplateUid}
          coverParams={book.coverParams}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
