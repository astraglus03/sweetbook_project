import { useState } from 'react';
import { useGroupBooks } from '../../books/hooks/useBooks';
import {
  useOrderGroupByBook,
  useCreateOrderGroup,
  useSubmitShipping,
  useConfirmAndPlace,
  useCredits,
  useEstimate,
} from '../hooks/useOrders';

const STATUS_LABELS = {
  PENDING: '대기',
  PAID: '결제 완료',
  CONFIRMED: '제작 확정',
  IN_PRODUCTION: '제작 중',
  SHIPPED: '배송 중',
  DELIVERED: '배송 완료',
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

  const inputClass = 'w-full h-11 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">수령인</label>
          <input name="recipientName" value={form.recipientName} onChange={handleChange} required placeholder="홍길동" className={inputClass} />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">연락처</label>
          <input name="recipientPhone" value={form.recipientPhone} onChange={handleChange} required placeholder="010-1234-5678" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">우편번호</label>
          <input name="recipientZipCode" value={form.recipientZipCode} onChange={handleChange} required placeholder="06101" className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-[12px] font-medium text-ink mb-1">주소</label>
          <input name="recipientAddress" value={form.recipientAddress} onChange={handleChange} required placeholder="서울시 강남구 테헤란로 123" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">상세 주소</label>
          <input name="recipientAddressDetail" value={form.recipientAddressDetail} onChange={handleChange} placeholder="4층 401호" className={inputClass} />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">수량</label>
          <input name="quantity" type="number" min={1} max={100} value={form.quantity} onChange={handleChange} required className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-ink mb-1">배송 메모</label>
        <input name="memo" value={form.memo} onChange={handleChange} placeholder="부재시 경비실" className={inputClass} />
      </div>
      <button type="submit" disabled={submit.isPending}
        className="w-full h-11 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50">
        {submit.isPending ? '저장 중...' : '배송 정보 저장'}
      </button>
      {submit.isError && (
        <p className="text-xs text-red-500 text-center">저장에 실패했습니다</p>
      )}
    </form>
  );
}

function BookOrderSection({ book, navigate }) {
  const {
    data: orderGroup,
    isLoading: ogLoading,
    isError: ogNotFound,
  } = useOrderGroupByBook(book.id);
  const createOg = useCreateOrderGroup(book.id, book.groupId);
  const confirmAndPlace = useConfirmAndPlace(orderGroup?.id);
  const { data: estimate } = useEstimate(book.id);
  const { data: credits } = useCredits();

  const [showForm, setShowForm] = useState(false);

  const hasOrderGroup = orderGroup && !ogNotFound;
  const orders = hasOrderGroup ? orderGroup.orders ?? [] : [];
  const isOrdered = hasOrderGroup && orderGroup.status === 'ORDERED';
  const isCollecting = hasOrderGroup && orderGroup.status === 'COLLECTING';

  const totalQuantity = orders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const unitPrice = estimate?.totalAmount ?? orderGroup?.estimatedPrice ?? 0;

  const handleCreateOrderGroup = () => {
    createOg.mutate(undefined, { onSuccess: () => setShowForm(true) });
  };

  const handleConfirm = () => {
    if (!window.confirm(`${orders.length}명, 총 ${totalQuantity}권 주문을 확정하시겠습니까? 충전금이 차감됩니다.`)) return;
    confirmAndPlace.mutate();
  };

  if (ogLoading) {
    return <div className="animate-spin w-5 h-5 border-2 border-brand border-t-transparent rounded-full mx-auto" />;
  }

  return (
    <div className="bg-white rounded-xl border border-warm-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-warm-border">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-ink">{book.title}</h4>
            <p className="text-[11px] text-ink-sub mt-0.5">
              {book.bookSpecUid} · {book.pageCount}p
              {unitPrice > 0 && ` · ${unitPrice.toLocaleString()}원/권`}
            </p>
          </div>
          {isOrdered && (
            <button type="button" onClick={() => navigate(`/books/${book.id}/order`)}
              className="h-8 px-3 text-xs font-medium text-brand border border-brand rounded-full hover:bg-brand/5 transition-colors">
              주문 현황
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* No order group yet */}
        {!hasOrderGroup && book.status === 'READY' && (
          <div className="text-center py-4">
            <p className="text-sm text-ink-sub mb-3">배송 정보 수집을 시작하세요</p>
            <button type="button" onClick={handleCreateOrderGroup} disabled={createOg.isPending}
              className="h-10 px-6 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50">
              {createOg.isPending ? '생성 중...' : '주문 시작하기'}
            </button>
          </div>
        )}

        {book.status !== 'READY' && book.status !== 'ORDERED' && (
          <p className="text-sm text-ink-muted text-center py-4">
            포토북 최종화 후에 주문할 수 있습니다 (현재: {book.status})
          </p>
        )}

        {/* Collecting: member progress + shipping form */}
        {isCollecting && (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink">
                배송 정보 수집중
              </span>
              <span className="text-xs text-brand font-medium">
                {orders.length}명 입력 완료
              </span>
            </div>

            {/* Member list */}
            {orders.length > 0 && (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between bg-warm-bg rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink">{order.recipientName} ({order.quantity}권)</p>
                      <p className="text-[11px] text-ink-muted">{order.recipientAddress?.substring(0, 25)}...</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add shipping form */}
            {!showForm ? (
              <button type="button" onClick={() => setShowForm(true)}
                className="w-full h-11 rounded-full border-2 border-dashed border-warm-border text-sm text-ink-sub hover:border-brand hover:text-brand transition-colors">
                + 내 배송 정보 입력하기
              </button>
            ) : (
              <ShippingForm orderGroupId={orderGroup.id} onSuccess={() => setShowForm(false)} />
            )}

            {/* Confirm button */}
            {orders.length > 0 && (
              <div className="pt-2 border-t border-warm-border">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-ink-sub">총 주문</span>
                  <span className="font-bold text-brand">
                    {totalQuantity}권 · {(totalQuantity * unitPrice).toLocaleString()}원
                  </span>
                </div>
                {credits && (
                  <div className="flex justify-between text-xs text-ink-muted mb-3">
                    <span>충전금 잔액</span>
                    <span>{credits.balance?.toLocaleString()}원</span>
                  </div>
                )}
                <button type="button" onClick={handleConfirm} disabled={confirmAndPlace.isPending}
                  className="w-full h-11 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50">
                  {confirmAndPlace.isPending ? '주문 처리 중...' : '전체 주문 확정'}
                </button>
                {confirmAndPlace.isError && (
                  <p className="text-xs text-red-500 text-center mt-2">주문에 실패했습니다</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Ordered: summary */}
        {isOrdered && (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between bg-warm-bg rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">{order.recipientName} ({order.quantity}권)</p>
                  <p className="text-[11px] text-ink-muted">
                    {order.orderedAt ? new Date(order.orderedAt).toLocaleDateString('ko-KR') : ''}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GroupOrdersTab({ groupId, navigate }) {
  const { data: books, isLoading } = useGroupBooks(groupId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  const readyBooks = (books ?? []).filter(
    (b) => b.status === 'READY' || b.status === 'ORDERED',
  );
  const otherBooks = (books ?? []).filter(
    (b) => b.status !== 'READY' && b.status !== 'ORDERED',
  );

  if (readyBooks.length === 0 && otherBooks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-ink-muted">아직 포토북이 없습니다</p>
        <p className="text-xs text-ink-muted/60 mt-1">포토북 탭에서 먼저 포토북을 만드세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {readyBooks.map((book) => (
        <BookOrderSection key={book.id} book={book} navigate={navigate} />
      ))}
      {otherBooks.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-ink-muted mb-2">준비 중인 포토북</p>
          {otherBooks.map((book) => (
            <div key={book.id} className="bg-warm-bg rounded-lg px-4 py-3 mb-2">
              <p className="text-sm text-ink">{book.title}</p>
              <p className="text-[11px] text-ink-muted">상태: {book.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
