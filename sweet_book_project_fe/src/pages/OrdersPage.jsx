import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyOrders, useCancelOrder } from '../features/orders/hooks/useOrders';
import { useMyBooks, useBook, useBookPages } from '../features/books/hooks/useBooks';
import { BookPreviewModal } from '../features/books/components/BookPreviewModal';

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
  CANCELLED: '주문 취소',
  CANCELLED_REFUND: '환불 완료',
  ERROR: '오류',
};

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600',
  PAID: 'bg-blue-50 text-blue-700',
  PDF_READY: 'bg-blue-50 text-blue-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  IN_PRODUCTION: 'bg-indigo-50 text-indigo-700',
  PRODUCTION_COMPLETE: 'bg-indigo-50 text-indigo-700',
  SHIPPED: 'bg-amber-50 text-amber-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
  CANCELLED_REFUND: 'bg-red-50 text-red-600',
  ERROR: 'bg-red-50 text-red-600',
};

const SPEC_LABEL = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

function StatusTimeline({ status }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.statuses.includes(status));
  const isCancelled = ['CANCELLED', 'CANCELLED_REFUND', 'ERROR'].includes(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-red-50/60 rounded-lg border border-red-100">
        <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <span className="text-xs font-medium text-red-600">{STATUS_LABELS[status]}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {STATUS_STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                isDone ? 'bg-green-500' : isActive ? 'bg-brand' : 'bg-warm-border'
              }`}>
                {isDone ? (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : null}
              </div>
              <span className={`text-[10px] whitespace-nowrap ${
                isActive ? 'text-brand font-semibold' : isDone ? 'text-ink' : 'text-ink-muted'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${idx < currentIdx ? 'bg-green-500' : 'bg-warm-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BookCoverThumb({ book }) {
  // Simple gradient fallback with title initial (cover renders need heavy template deps)
  const title = book?.title ?? '포토북';
  const initial = title[0];
  return (
    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-brand/20 to-brand/5 border border-warm-border">
      <span className="font-display text-2xl text-brand/80 font-bold">{initial}</span>
    </div>
  );
}

function OrderCard({ order }) {
  const navigate = useNavigate();
  const cancelOrder = useCancelOrder();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const canCancel = order.status === 'PAID' || order.status === 'PDF_READY';
  const book = order.orderGroup?.book;
  const bookTitle = book?.title ?? '포토북';
  const specLabel = SPEC_LABEL[book?.bookSpecUid] || book?.bookSpecUid;
  const statusCls = STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600';
  const orderDate = order.orderedAt ?? order.createdAt;

  const handleCancel = () => {
    if (!cancelReason.trim()) return;
    cancelOrder.mutate(
      { orderId: order.id, cancelReason: cancelReason.trim() },
      { onSuccess: () => setShowCancel(false) },
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-warm-border overflow-hidden">
      {/* Main row */}
      <div className="p-4 lg:p-5 flex gap-4">
        <BookCoverThumb book={book} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-[15px] font-bold text-ink truncate">{bookTitle}</h3>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${statusCls}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          <p className="text-[12px] text-ink-muted">
            {specLabel && `${specLabel} · `}{book?.pageCount}페이지 · {order.quantity}권
          </p>

          <p className="text-[11px] text-ink-muted mt-0.5">
            주문일 {new Date(orderDate).toLocaleDateString('ko-KR')}
            {order.totalPrice && ` · ${Number(order.totalPrice).toLocaleString()}원`}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button type="button" onClick={() => navigate(`/orders/${order.id}/complete`)}
              className="h-8 px-3.5 text-[12px] font-medium text-ink border border-warm-border rounded-full bg-white hover:bg-warm-bg transition-colors">
              상세 보기
            </button>
            {canCancel && !showCancel && (
              <button type="button" onClick={() => setShowCancel(true)}
                className="h-8 px-3.5 text-[12px] font-medium text-red-500 hover:text-red-600 transition-colors">
                주문 취소
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline (always visible) */}
      <div className="px-4 lg:px-5 pb-4 pt-0">
        <div className="border-t border-warm-border pt-4">
          <StatusTimeline status={order.status} />
        </div>
      </div>

      {/* Shipping + tracking + cancel */}
      <div className="bg-warm-bg/40 border-t border-warm-border px-4 lg:px-5 py-3 space-y-2">
        {order.trackingNumber && (
          <div className="flex items-start gap-2 text-[12px]">
            <span className="text-ink-muted w-16 flex-shrink-0">운송장</span>
            <span className="text-ink font-mono font-semibold">
              {order.carrierCode && `${order.carrierCode} · `}{order.trackingNumber}
            </span>
          </div>
        )}
        <div className="flex items-start gap-2 text-[12px]">
          <span className="text-ink-muted w-16 flex-shrink-0">배송지</span>
          <span className="text-ink flex-1 truncate">
            {order.recipientName} · [{order.recipientZipCode}] {order.recipientAddress} {order.recipientAddressDetail || ''}
          </span>
        </div>
        {order.sweetbookOrderUid && (
          <div className="flex items-start gap-2 text-[11px]">
            <span className="text-ink-muted w-16 flex-shrink-0">주문번호</span>
            <span className="text-ink-sub font-mono">{order.sweetbookOrderUid}</span>
          </div>
        )}
      </div>

      {/* Cancel form */}
      {showCancel && (
        <div className="border-t border-warm-border px-4 lg:px-5 py-4 bg-red-50/30 space-y-2">
          <p className="text-[12px] font-semibold text-red-700">주문을 취소합니다</p>
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="취소 사유를 입력하세요"
            className="w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCancel(false)}
              className="flex-1 h-9 text-xs text-ink-sub border border-warm-border rounded-full bg-white hover:bg-warm-bg transition-colors">
              되돌아가기
            </button>
            <button type="button" onClick={handleCancel}
              disabled={!cancelReason.trim() || cancelOrder.isPending}
              className="flex-1 h-9 text-xs font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50">
              {cancelOrder.isPending ? '처리 중…' : '취소 확정'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartBookCard({ book }) {
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: previewBook } = useBook(previewOpen ? book.id : null);
  const { data: previewPages } = useBookPages(previewOpen ? book.id : null);
  const statusLabel =
    book.status === 'READY' ? '결제 대기' :
    book.status === 'DRAFT' ? '편집 중' :
    book.status === 'PROCESSING' ? 'PDF 변환 중' :
    book.status === 'ORDERED' ? '주문 완료' :
    book.status;
  const statusCls =
    book.status === 'READY' ? 'bg-brand/10 text-brand' :
    book.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
    book.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700' :
    book.status === 'ORDERED' ? 'bg-green-50 text-green-700' :
    'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white rounded-2xl border border-warm-border p-4 lg:p-5 flex gap-4">
      <BookCoverThumb book={book} />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-[15px] font-bold text-ink truncate">{book.title}</h3>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${statusCls}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-[12px] text-ink-muted">
          {SPEC_LABEL[book.bookSpecUid] || book.bookSpecUid} · {book.pageCount}페이지
        </p>
        <div className="flex-1" />
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {book.status === 'DRAFT' && (
            <button type="button" onClick={() => navigate(`/books/${book.id}/editor`)}
              className="h-9 px-4 text-[13px] font-semibold bg-white border border-warm-border text-ink rounded-full hover:bg-warm-bg transition-colors">
              이어서 편집하기
            </button>
          )}
          {(book.status === 'READY' || book.status === 'ORDERED') && (
            <>
              <button type="button" onClick={() => setPreviewOpen(true)}
                className="h-9 px-4 text-[13px] font-medium bg-white border border-warm-border text-ink rounded-full hover:bg-warm-bg transition-colors">
                미리보기
              </button>
              <button type="button" onClick={() => navigate(`/books/${book.id}/order`)}
                className="h-9 px-4 text-[13px] font-bold bg-brand text-white rounded-full hover:bg-brand-hover transition-colors shadow-sm">
                {book.status === 'ORDERED' ? '주문 현황 보기' : '주문하기'}
              </button>
            </>
          )}
          {book.status === 'PROCESSING' && (
            <div className="flex items-center gap-2 h-9 px-4 bg-warm-bg rounded-full border border-warm-border">
              <div className="animate-spin w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full" />
              <span className="text-[12px] text-brand font-medium">변환 진행중</span>
            </div>
          )}
        </div>
      </div>
      {previewOpen && previewBook && (
        <BookPreviewModal
          book={previewBook}
          pages={previewPages}
          coverTemplateUid={previewBook.coverTemplateUid}
          coverParams={previewBook.coverParams}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ icon, title, hint, cta }) {
  return (
    <div className="bg-white rounded-2xl border border-warm-border p-10 text-center">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-warm-bg flex items-center justify-center text-ink-muted/50">
        {icon}
      </div>
      <p className="text-sm font-medium text-ink mb-1">{title}</p>
      {hint && <p className="text-xs text-ink-muted mb-4">{hint}</p>}
      {cta}
    </div>
  );
}

export function OrdersPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cart');
  const { data: orders, isLoading: ordersLoading } = useMyOrders();
  const { data: myBooks, isLoading: booksLoading } = useMyBooks();

  if (ordersLoading || booksLoading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center pb-20 lg:pb-0">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  const orderList = orders ?? [];
  const activeOrders = orderList.filter((o) => !['DELIVERED', 'CANCELLED', 'CANCELLED_REFUND'].includes(o.status));
  const completedOrders = orderList.filter((o) => o.status === 'DELIVERED');
  const cancelledOrders = orderList.filter((o) => ['CANCELLED', 'CANCELLED_REFUND'].includes(o.status));

  const bookList = myBooks ?? [];
  const pendingBooks = bookList.filter((b) =>
    b.status === 'READY' || b.status === 'ORDERED' || b.status === 'DRAFT' || b.status === 'PROCESSING'
  );

  return (
    <div className="min-h-screen bg-warm-bg pb-20 lg:pb-0">
      <div className="max-w-3xl mx-auto px-4 lg:px-10 py-6 lg:py-8">
        <h1 className="text-[22px] font-bold text-ink mb-1">내 활동</h1>
        <p className="text-sm text-ink-sub mb-6">작업 중인 포토북과 주문 내역을 확인하세요</p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white rounded-full border border-warm-border mb-6 w-fit">
          <button
            onClick={() => setActiveTab('cart')}
            className={`h-9 px-5 rounded-full text-[13px] font-semibold transition-colors ${
              activeTab === 'cart' ? 'bg-ink text-white' : 'text-ink-sub hover:text-ink'
            }`}
          >
            포토북 {pendingBooks.length > 0 && `(${pendingBooks.length})`}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`h-9 px-5 rounded-full text-[13px] font-semibold transition-colors ${
              activeTab === 'orders' ? 'bg-ink text-white' : 'text-ink-sub hover:text-ink'
            }`}
          >
            주문 내역 {orderList.length > 0 && `(${orderList.length})`}
          </button>
        </div>

        {activeTab === 'cart' ? (
          pendingBooks.length === 0 ? (
            <EmptyState
              icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>}
              title="작업 중인 포토북이 없습니다"
              hint="모임에서 포토북을 만들어보세요"
              cta={
                <button type="button" onClick={() => navigate('/groups')}
                  className="h-9 px-5 text-sm font-medium text-brand border border-brand rounded-full hover:bg-brand/5">
                  내 모임으로 이동
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {pendingBooks.map((book) => <CartBookCard key={book.id} book={book} />)}
            </div>
          )
        ) : (
          orderList.length === 0 ? (
            <EmptyState
              icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>}
              title="아직 주문 내역이 없어요"
              hint="포토북을 완성하면 여기서 주문할 수 있어요"
            />
          ) : (
            <div className="space-y-6">
              {activeOrders.length > 0 && (
                <section>
                  <h2 className="text-[12px] font-bold text-ink-sub uppercase tracking-wider mb-3">진행 중 · {activeOrders.length}</h2>
                  <div className="space-y-3">
                    {activeOrders.map((order) => <OrderCard key={order.id} order={order} />)}
                  </div>
                </section>
              )}
              {completedOrders.length > 0 && (
                <section>
                  <h2 className="text-[12px] font-bold text-ink-sub uppercase tracking-wider mb-3">배송 완료 · {completedOrders.length}</h2>
                  <div className="space-y-3">
                    {completedOrders.map((order) => <OrderCard key={order.id} order={order} />)}
                  </div>
                </section>
              )}
              {cancelledOrders.length > 0 && (
                <section>
                  <h2 className="text-[12px] font-bold text-ink-sub uppercase tracking-wider mb-3">취소 · {cancelledOrders.length}</h2>
                  <div className="space-y-3">
                    {cancelledOrders.map((order) => <OrderCard key={order.id} order={order} />)}
                  </div>
                </section>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
