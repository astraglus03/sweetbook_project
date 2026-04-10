import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook } from '../features/books/hooks/useBooks';
import {
  useEstimate,
  useOrderGroupByBook,
  useCreateOrderGroup,
  useSubmitShipping,
  useConfirmAndPlace,
  useCredits,
} from '../features/orders/hooks/useOrders';

const STATUS_LABELS = {
  PENDING: '대기',
  SUBMITTING: '처리 중',
  PAID: '결제 완료',
  PDF_READY: 'PDF 준비',
  CONFIRMED: '제작 확정',
  IN_PRODUCTION: '제작 중',
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
  CONFIRMED: 'bg-blue-50 text-blue-700',
  IN_PRODUCTION: 'bg-blue-50 text-blue-700',
  SHIPPED: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
  CANCELLED_REFUND: 'bg-red-50 text-red-600',
  ERROR: 'bg-red-50 text-red-600',
};

function ShippingForm({ orderGroupId, onSuccess }) {
  const submit = useSubmitShipping(orderGroupId);
  const [form, setForm] = useState({
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    recipientZipCode: '',
    recipientAddressDetail: '',
    memo: '',
    quantity: 1,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) || 1 : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit.mutate(form, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-ink mb-1.5">
          수령인 이름
        </label>
        <input
          name="recipientName"
          value={form.recipientName}
          onChange={handleChange}
          required
          className="w-full h-12 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="홍길동"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink mb-1.5">
          연락처
        </label>
        <input
          name="recipientPhone"
          value={form.recipientPhone}
          onChange={handleChange}
          required
          className="w-full h-12 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="010-1234-5678"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink mb-1.5">
          우편번호
        </label>
        <input
          name="recipientZipCode"
          value={form.recipientZipCode}
          onChange={handleChange}
          required
          className="w-full h-12 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="06101"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink mb-1.5">
          배송 주소
        </label>
        <input
          name="recipientAddress"
          value={form.recipientAddress}
          onChange={handleChange}
          required
          className="w-full h-12 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="서울시 강남구 테헤란로 123"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink mb-1.5">
          상세 주소
        </label>
        <input
          name="recipientAddressDetail"
          value={form.recipientAddressDetail}
          onChange={handleChange}
          className="w-full h-12 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="4층 401호"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink mb-1.5">
          수량
        </label>
        <input
          name="quantity"
          type="number"
          min={1}
          max={100}
          value={form.quantity}
          onChange={handleChange}
          required
          className="w-full h-12 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-ink mb-1.5">
          배송 메모
        </label>
        <input
          name="memo"
          value={form.memo}
          onChange={handleChange}
          className="w-full h-12 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="부재시 경비실"
        />
      </div>
      <button
        type="submit"
        disabled={submit.isPending}
        className="w-full h-12 rounded-full bg-brand text-white text-[15px] font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
      >
        {submit.isPending ? '저장 중...' : '배송 정보 저장'}
      </button>
    </form>
  );
}

function OrderStatusSteps({ status }) {
  const steps = [
    { key: 'order', label: '주문', statuses: ['PAID', 'PDF_READY'] },
    { key: 'print', label: '인쇄', statuses: ['CONFIRMED', 'IN_PRODUCTION', 'PRODUCTION_COMPLETE'] },
    { key: 'ship', label: '배송', statuses: ['SHIPPED'] },
    { key: 'done', label: '완료', statuses: ['DELIVERED'] },
  ];

  const currentIdx = steps.findIndex((s) => s.statuses.includes(status));

  return (
    <div className="flex justify-between w-full">
      {steps.map((step, idx) => {
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        const dotColor = isDone
          ? 'bg-green-500'
          : isActive
            ? 'bg-blue-500'
            : 'bg-warm-border';
        const textColor = isActive
          ? 'text-blue-600 font-semibold'
          : isDone
            ? 'text-ink'
            : 'text-ink-muted';

        return (
          <div key={step.key} className="flex flex-col items-center gap-1">
            <div className={`w-5 h-5 rounded-full ${dotColor}`} />
            <span className={`text-[10px] ${textColor}`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const numBookId = Number(bookId);

  const { data: book, isLoading: bookLoading } = useBook(numBookId);
  const { data: estimate } = useEstimate(numBookId);
  const { data: credits } = useCredits();
  const {
    data: orderGroup,
    isLoading: ogLoading,
    isError: ogNotFound,
  } = useOrderGroupByBook(numBookId);

  const createOg = useCreateOrderGroup(numBookId, book?.groupId);
  const confirmAndPlace = useConfirmAndPlace(orderGroup?.id);

  const [showForm, setShowForm] = useState(false);

  if (bookLoading || ogLoading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <p className="text-sm text-ink-sub">포토북을 찾을 수 없습니다</p>
      </div>
    );
  }

  const isReady = book.status === 'READY' || book.status === 'ORDERED';
  const hasOrderGroup = orderGroup && !ogNotFound;
  const orders = hasOrderGroup ? orderGroup.orders ?? [] : [];
  const isOrdered = hasOrderGroup && orderGroup.status === 'ORDERED';

  const totalQuantity = orders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const unitPrice = estimate?.totalAmount ?? orderGroup?.estimatedPrice ?? 0;
  const totalPrice = totalQuantity * unitPrice;

  const handleCreateOrderGroup = () => {
    createOg.mutate(undefined, {
      onSuccess: () => setShowForm(true),
    });
  };

  const handleConfirm = () => {
    if (!window.confirm('전체 주문을 확정하시겠습니까? 충전금이 차감됩니다.')) return;
    confirmAndPlace.mutate();
  };

  return (
    <div className="min-h-screen bg-warm-bg pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-warm-border px-4 lg:px-10 py-6 lg:py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-ink-sub hover:text-ink transition-colors text-sm mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로
        </button>
        <h1 className="text-[22px] lg:text-[22px] font-bold text-ink">
          {isOrdered ? '주문 현황' : '주문 정보 수집'}
        </h1>
        <p className="text-sm text-ink-sub mt-1">
          {book.title} | {book.bookSpecUid === 'SQUAREBOOK_HC' ? '정사각 하드커버' : book.bookSpecUid === 'PHOTOBOOK_A4_SC' ? 'A4 소프트커버' : 'A5 소프트커버'} {book.pageCount}페이지
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-10 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Members / Status */}
        <div className="flex-1 space-y-4">
          {/* Order Status (for ordered books) */}
          {isOrdered && orders.length > 0 && (
            <div className="bg-white rounded-xl border border-warm-border p-5">
              <div className="mb-3">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[orders[0]?.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_LABELS[orders[0]?.status] ?? orders[0]?.status}
                </span>
              </div>
              <OrderStatusSteps status={orders[0]?.status ?? 'PAID'} />
            </div>
          )}

          {/* Not ready */}
          {!isReady && (
            <div className="bg-white rounded-xl border border-warm-border p-5 text-center">
              <p className="text-sm text-ink-sub">
                포토북 최종화(finalize) 후에 주문할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/books/${numBookId}/preview`)}
                className="mt-3 h-10 px-6 rounded-full border border-warm-border text-sm font-medium text-ink hover:bg-warm-bg transition-colors"
              >
                미리보기로 이동
              </button>
            </div>
          )}

          {/* No order group yet */}
          {isReady && !hasOrderGroup && (
            <div className="bg-white rounded-xl border border-warm-border p-5 text-center">
              <p className="text-sm text-ink-sub mb-4">
                주문 그룹을 생성하여 배송 정보 수집을 시작하세요.
              </p>
              <button
                type="button"
                onClick={handleCreateOrderGroup}
                disabled={createOg.isPending}
                className="h-11 px-6 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {createOg.isPending ? '생성 중...' : '주문 시작하기'}
              </button>
            </div>
          )}

          {/* Shipping form */}
          {hasOrderGroup && orderGroup.status === 'COLLECTING' && (
            <div className="bg-white rounded-xl border border-warm-border p-5">
              {!showForm ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="w-full h-12 rounded-full border-2 border-dashed border-warm-border text-sm text-ink-sub hover:border-brand hover:text-brand transition-colors"
                >
                  + 내 배송 정보 입력하기
                </button>
              ) : (
                <ShippingForm
                  orderGroupId={orderGroup.id}
                  onSuccess={() => setShowForm(false)}
                />
              )}
            </div>
          )}

          {/* Member orders list */}
          {hasOrderGroup && orders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[15px] font-semibold text-ink px-1">
                {isOrdered ? '주문 목록' : '입력 완료'}
              </h3>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-warm-border p-3.5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {order.recipientName} ({order.quantity}권)
                    </p>
                    {order.recipientAddress && (
                      <p className="text-xs text-ink-muted mt-0.5">
                        {order.recipientAddress.substring(0, 20)}***
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div className="lg:w-[340px] flex-shrink-0">
          <div className="bg-white rounded-xl border border-warm-border p-6 space-y-5 lg:sticky lg:top-6">
            <h3 className="text-base font-bold text-ink">주문 요약</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-sub">판형</span>
                <span className="font-medium text-ink">
                  {book.bookSpecUid === 'SQUAREBOOK_HC'
                    ? '정사각 하드커버'
                    : book.bookSpecUid === 'PHOTOBOOK_A4_SC'
                      ? 'A4 소프트커버'
                      : 'A5 소프트커버'}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-sub">페이지</span>
                <span className="font-medium text-ink">{book.pageCount}페이지</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-sub">단가</span>
                <span className="font-medium text-ink">
                  {unitPrice ? `${unitPrice.toLocaleString()}원` : '-'}
                </span>
              </div>
            </div>

            <hr className="border-warm-border" />

            <div className="flex justify-between text-sm">
              <span className="font-semibold text-ink">총 주문</span>
              <span className="font-bold text-brand">
                {totalQuantity}권 | {totalPrice ? `${totalPrice.toLocaleString()}원` : '-'}
              </span>
            </div>

            {credits && (
              <div className="flex justify-between text-xs text-ink-sub">
                <span>충전금 잔액</span>
                <span>{credits.balance?.toLocaleString()}원</span>
              </div>
            )}

            {hasOrderGroup &&
              orderGroup.status === 'COLLECTING' &&
              orders.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirmAndPlace.isPending}
                  className="w-full h-11 rounded-full bg-brand text-white text-[15px] font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  {confirmAndPlace.isPending
                    ? '주문 처리 중...'
                    : '전체 주문 확정'}
                </button>
              )}

            {confirmAndPlace.isError && (
              <p className="text-xs text-red-500 text-center">
                주문 처리에 실패했습니다. 다시 시도해주세요.
              </p>
            )}

            {isOrdered && (
              <div className="text-center">
                <span className="text-xs text-green-600 font-medium">
                  주문이 완료되었습니다
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
