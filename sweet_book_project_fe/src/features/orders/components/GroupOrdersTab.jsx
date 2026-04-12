import { useGroupBooks } from '../../books/hooks/useBooks';
import { useMe } from '../../auth/hooks/useAuth';
import { useOrderGroupByBook, useEstimate, useGroupMembersStatus } from '../hooks/useOrders';

const SPEC_LABEL = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

const BOOK_STATUS = {
  DRAFT: { label: '편집 중', cls: 'bg-gray-100 text-gray-700' },
  PROCESSING: { label: 'PDF 변환 중', cls: 'bg-blue-50 text-blue-700' },
  READY: { label: '결제 대기', cls: 'bg-brand/10 text-brand' },
  ORDERED: { label: '주문 완료', cls: 'bg-green-50 text-green-700' },
  COMPLETED: { label: '배송 완료', cls: 'bg-green-50 text-green-700' },
};

function BookCoverThumb({ title }) {
  const initial = title?.[0] ?? '?';
  return (
    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-brand/20 to-brand/5 border border-warm-border">
      <span className="font-display text-2xl text-brand/80 font-bold">{initial}</span>
    </div>
  );
}

function BookOrderCard({ book, navigate }) {
  const { data: me } = useMe();
  const { data: orderGroup, isError: ogNotFound } = useOrderGroupByBook(book.id);
  const { data: membersStatus } = useGroupMembersStatus(orderGroup?.id);
  const { data: estimate } = useEstimate(book.id);

  const hasOrderGroup = orderGroup && !ogNotFound;
  const orders = hasOrderGroup ? orderGroup.orders ?? [] : [];
  const isOrdered = hasOrderGroup && orderGroup.status === 'ORDERED';
  const isCollecting = hasOrderGroup && orderGroup.status === 'COLLECTING';

  const respondedCount = membersStatus ? membersStatus.submittedCount + membersStatus.rejectedCount : 0;
  const totalMembers = membersStatus?.totalMembers ?? 0;
  const progressPct = totalMembers ? Math.round((respondedCount / totalMembers) * 100) : 0;
  const submittedCount = membersStatus?.submittedCount ?? 0;
  const totalQuantity = orders.filter((o) => o.status !== 'REJECTED').reduce((sum, o) => sum + (o.quantity ?? 0), 0);
  const myOrder = orders.find((o) => (o.ordererId ?? o.userId) === me?.id);
  const myOrderIsValid = myOrder && myOrder.status !== 'REJECTED';
  const isCreator = membersStatus?.isCreator ?? false;
  const unitPrice = estimate?.totalAmount ?? orderGroup?.estimatedPrice ?? 0;
  const totalPrice = unitPrice * totalQuantity;

  const statusInfo = BOOK_STATUS[book.status] ?? { label: book.status, cls: 'bg-gray-100 text-gray-600' };
  const specLabel = SPEC_LABEL[book.bookSpecUid] || book.bookSpecUid;

  // 비활성 책 (DRAFT / PROCESSING)
  if (book.status === 'DRAFT' || book.status === 'PROCESSING') {
    return (
      <div className="bg-white rounded-2xl border border-warm-border p-4 lg:p-5 flex gap-4">
        <BookCoverThumb title={book.title} />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-[15px] font-bold text-ink truncate">{book.title}</h3>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-[12px] text-ink-muted">{specLabel} · {book.pageCount}페이지</p>
          <div className="flex-1" />
          <div className="flex gap-2 mt-3">
            {book.status === 'DRAFT' && (
              <button type="button" onClick={() => navigate(`/books/${book.id}/editor`)}
                className="h-9 px-4 text-[13px] font-semibold bg-white border border-warm-border text-ink rounded-full hover:bg-warm-bg transition-colors">
                이어서 편집
              </button>
            )}
            {book.status === 'PROCESSING' && (
              <div className="flex items-center gap-2 h-9 px-4 bg-warm-bg rounded-full border border-warm-border">
                <div className="animate-spin w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full" />
                <span className="text-[12px] text-brand font-medium">변환 진행중</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-warm-border overflow-hidden">
      {/* Top: book info */}
      <div className="p-4 lg:p-5 flex gap-4">
        <BookCoverThumb title={book.title} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-[15px] font-bold text-ink truncate">{book.title}</h3>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-[12px] text-ink-muted mb-3">
            {specLabel} · {book.pageCount}페이지
            {unitPrice > 0 && ` · 권당 ${unitPrice.toLocaleString()}원`}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => navigate(`/books/${book.id}/preview`)}
              className="h-8 px-3.5 text-[12px] font-medium text-ink border border-warm-border rounded-full bg-white hover:bg-warm-bg transition-colors">
              미리보기
            </button>
            {!hasOrderGroup && book.status === 'READY' && (
              <button type="button" onClick={() => navigate(`/books/${book.id}/order`)}
                className="h-8 px-3.5 text-[12px] font-bold bg-brand text-white rounded-full hover:bg-brand-hover transition-colors shadow-sm">
                주문 시작하기
              </button>
            )}
            {isCollecting && (
              <button type="button" onClick={() => navigate(`/books/${book.id}/order`)}
                className="h-8 px-3.5 text-[12px] font-bold bg-brand text-white rounded-full hover:bg-brand-hover transition-colors shadow-sm">
                {myOrderIsValid ? '주문 관리' : '배송지 입력'}
              </button>
            )}
            {isOrdered && (
              <button type="button" onClick={() => navigate(`/books/${book.id}/order`)}
                className="h-8 px-3.5 text-[12px] font-bold bg-ink text-white rounded-full hover:bg-black transition-colors">
                주문 현황
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collecting progress */}
      {isCollecting && membersStatus && (
        <div className="border-t border-warm-border px-4 lg:px-5 py-4 bg-warm-bg/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-ink">배송 정보 수집중</span>
            <span className="text-[11px] text-ink-sub">
              {respondedCount}/{totalMembers}명 응답 · {submittedCount}명 참여
            </span>
          </div>
          <div className="h-1.5 bg-warm-border rounded-full overflow-hidden mb-2">
            <div className="h-full bg-brand transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          {isCreator && !myOrderIsValid && (
            <p className="text-[11px] text-amber-700 mt-1.5">아직 배송지를 입력하지 않으셨어요</p>
          )}
          {totalQuantity > 0 && (
            <div className="flex justify-between text-[12px] pt-2 mt-2 border-t border-warm-border/60">
              <span className="text-ink-sub">집계</span>
              <span className="text-ink font-semibold">{totalQuantity}권 · {totalPrice.toLocaleString()}원</span>
            </div>
          )}
        </div>
      )}

      {/* Ordered summary — per-member rows (pen #13 style) */}
      {isOrdered && orders.length > 0 && (
        <div className="border-t border-warm-border bg-warm-bg/40">
          <div className="px-4 lg:px-5 pt-3 pb-1.5 text-[11px] font-bold text-ink-sub uppercase tracking-wider">
            개별 주문 현황 ({orders.filter((o) => o.status !== 'REJECTED').length}건)
          </div>
          <ul className="divide-y divide-warm-border">
            {orders.filter((o) => o.status !== 'REJECTED').map((order) => (
              <li key={order.id} className="px-4 lg:px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">
                    {order.recipientName} · {order.quantity}권
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {order.recipientAddress}
                  </p>
                </div>
                <OrderStatusPill status={order.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OrderStatusPill({ status }) {
  const map = {
    PAID: { label: '결제 완료', cls: 'bg-blue-50 text-blue-700' },
    PDF_READY: { label: 'PDF 준비', cls: 'bg-blue-50 text-blue-700' },
    CONFIRMED: { label: '제작 확정', cls: 'bg-indigo-50 text-indigo-700' },
    IN_PRODUCTION: { label: '제작 중', cls: 'bg-indigo-50 text-indigo-700' },
    PRODUCTION_COMPLETE: { label: '제작 완료', cls: 'bg-indigo-50 text-indigo-700' },
    SHIPPED: { label: '배송 중', cls: 'bg-amber-50 text-amber-700' },
    DELIVERED: { label: '배송 완료', cls: 'bg-green-50 text-green-700' },
    CANCELLED: { label: '주문 취소', cls: 'bg-red-50 text-red-600' },
    CANCELLED_REFUND: { label: '환불 완료', cls: 'bg-red-50 text-red-600' },
    ERROR: { label: '오류', cls: 'bg-red-50 text-red-600' },
  };
  const info = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${info.cls}`}>
      {info.label}
    </span>
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

  const bookList = books ?? [];

  if (bookList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-warm-border p-10 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-warm-bg flex items-center justify-center text-ink-muted/50">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-ink mb-1">아직 포토북이 없어요</p>
        <p className="text-xs text-ink-muted">포토북 탭에서 먼저 포토북을 만드세요</p>
      </div>
    );
  }

  // 버킷으로 분류
  const activeBooks = bookList.filter((b) => b.status === 'READY' || b.status === 'ORDERED');
  const draftBooks = bookList.filter((b) => b.status === 'DRAFT' || b.status === 'PROCESSING');

  return (
    <div className="space-y-6">
      {activeBooks.length > 0 && (
        <section>
          <h2 className="text-[12px] font-bold text-ink-sub uppercase tracking-wider mb-3">
            주문 · {activeBooks.length}
          </h2>
          <div className="space-y-3">
            {activeBooks.map((book) => (
              <BookOrderCard key={book.id} book={book} navigate={navigate} />
            ))}
          </div>
        </section>
      )}

      {draftBooks.length > 0 && (
        <section>
          <h2 className="text-[12px] font-bold text-ink-sub uppercase tracking-wider mb-3">
            작업 중 · {draftBooks.length}
          </h2>
          <div className="space-y-3">
            {draftBooks.map((book) => (
              <BookOrderCard key={book.id} book={book} navigate={navigate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
