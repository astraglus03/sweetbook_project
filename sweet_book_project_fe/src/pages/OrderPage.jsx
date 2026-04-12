import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages, useAvailableTemplates } from '../features/books/hooks/useBooks';
import { TemplateCanvas } from '../features/books/components/TemplateCanvas';
import { BookPreviewModal } from '../features/books/components/BookPreviewModal';
import { usePhotos } from '../features/photos/hooks/usePhotos';
import { useMe } from '../features/auth/hooks/useAuth';
import {
  useEstimate,
  useOrderGroupByBook,
  useCreateOrderGroup,
  useSubmitShipping,
  useConfirmAndPlace,
  useCredits,
  useRejectOrder,
  useGroupMembersStatus,
  useRemindMembers
} from '../features/orders/hooks/useOrders';

const SPEC_LABEL = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

// 사용자별 색상 도트 (pen 디자인)
const DOT_COLORS = ['#D4916E', '#6E93D4', '#C8C8C8', '#7FB069', '#E5B13A', '#B07FD4'];
function getDotColor(userId) {
  return DOT_COLORS[userId % DOT_COLORS.length];
}

function ShippingForm({ orderGroupId, initialData, onSuccess, onCancel }) {
  const submit = useSubmitShipping(orderGroupId);
  const isEditMode = !!initialData;
  const [form, setForm] = useState({
    recipientName: initialData?.recipientName || '',
    recipientPhone: initialData?.recipientPhone || '',
    recipientAddress: initialData?.recipientAddress || '',
    recipientZipCode: initialData?.recipientZipCode || '',
    recipientAddressDetail: initialData?.recipientAddressDetail || '',
    memo: initialData?.memo || '',
    quantity: initialData?.quantity || 1,
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

  const inputCls = 'w-full h-11 px-3.5 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">수령인</label>
          <input name="recipientName" value={form.recipientName} onChange={handleChange} required className={inputCls} placeholder="홍길동" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">연락처</label>
          <input name="recipientPhone" value={form.recipientPhone} onChange={handleChange} required className={inputCls} placeholder="010-1234-5678" />
        </div>
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">우편번호</label>
          <input name="recipientZipCode" value={form.recipientZipCode} onChange={handleChange} required className={inputCls} placeholder="06101" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">주소</label>
          <input name="recipientAddress" value={form.recipientAddress} onChange={handleChange} required className={inputCls} placeholder="서울시 강남구 테헤란로 123" />
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-ink mb-1">상세 주소</label>
        <input name="recipientAddressDetail" value={form.recipientAddressDetail} onChange={handleChange} className={inputCls} placeholder="4층 401호" />
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">수량</label>
          <input name="quantity" type="number" min={1} max={100} value={form.quantity} onChange={handleChange} required className={inputCls} />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1">배송 메모</label>
          <input name="memo" value={form.memo} onChange={handleChange} className={inputCls} placeholder="부재시 경비실" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 h-11 rounded-full border border-warm-border text-sm font-medium text-ink-sub hover:bg-warm-bg transition-colors">
            취소
          </button>
        )}
        <button type="submit" disabled={submit.isPending}
          className="flex-1 h-11 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50">
          {submit.isPending ? '저장 중…' : (isEditMode ? '수정 저장' : '배송지 저장')}
        </button>
      </div>
    </form>
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
  const rejectOrder = useRejectOrder(orderGroup?.id);
  const remindMembers = useRemindMembers(orderGroup?.id);
  const { data: membersStatus } = useGroupMembersStatus(orderGroup?.id);
  const { data: pages } = useBookPages(numBookId);
  const { data: me } = useMe();
  const { data: photosData } = usePhotos(book?.groupId, { limit: 100 });
  const photos = photosData?.photos ?? [];
  const { data: templatesData } = useAvailableTemplates(numBookId);
  const allTemplates = [
    ...(templatesData?.cover || []),
    ...(templatesData?.content || []),
    ...(templatesData?.divider || []),
    ...(templatesData?.publish || []),
  ];

  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isCreator = membersStatus?.isCreator ?? false;

  const handleReject = () => {
    if (!window.confirm('주문에 참여하지 않으시겠습니까? 이 결정은 번복할 수 없습니다.')) return;
    rejectOrder.mutate({ rejectReason: '사용자 거절' }, {
      onSuccess: () => alert('거절 처리되었습니다.')
    });
  };

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

  const specLabel = SPEC_LABEL[book.bookSpecUid] || book.bookSpecUid;
  const isReady = book.status === 'READY' || book.status === 'ORDERED';
  const hasOrderGroup = orderGroup && !ogNotFound;
  const orders = hasOrderGroup ? orderGroup.orders ?? [] : [];
  const isOrdered = hasOrderGroup && orderGroup.status === 'ORDERED';

  const myOrder = orders.find((o) => (o.ordererId ?? o.userId) === me?.id);
  const hasSubmitted = !!myOrder && myOrder.status !== 'REJECTED';
  const isRejected = myOrder?.status === 'REJECTED';
  const totalQuantity = orders
    .filter((o) => o.status !== 'REJECTED')
    .reduce((sum, o) => sum + (o.quantity ?? 0), 0);
  const unitPrice = estimate?.totalAmount ?? orderGroup?.estimatedPrice ?? 0;
  const totalPrice = totalQuantity * unitPrice;
  const respondedCount = membersStatus ? membersStatus.submittedCount + membersStatus.rejectedCount : 0;
  const totalMembers = membersStatus?.totalMembers ?? 0;
  const progressPct = totalMembers ? Math.round((respondedCount / totalMembers) * 100) : 0;
  const allResponded = totalMembers > 0 && respondedCount >= totalMembers;

  const handleCreateOrderGroup = () => {
    createOg.mutate(undefined, {
      onSuccess: () => setShowForm(true),
    });
  };

  const handleConfirm = () => {
    if (!window.confirm(`총 ${totalQuantity}권 주문을 확정하시겠습니까? 충전금이 차감됩니다.`)) return;
    confirmAndPlace.mutate(undefined, {
      onSuccess: (res) => {
        const firstSuccess = res?.results?.find((r) => r.success);
        if (firstSuccess?.orderId) navigate(`/orders/${firstSuccess.orderId}/complete`);
        else navigate('/orders');
      },
    });
  };

  // 표지 썸네일 (작은 프리뷰용)
  const coverThumb = (
    <div className="w-full aspect-square bg-warm-bg rounded-lg overflow-hidden border border-warm-border">
      {allTemplates.length > 0 && book?.coverTemplateUid ? (
        <TemplateCanvas
          template={allTemplates.find((t) => t.templateUid === book.coverTemplateUid)}
          params={book.coverParams || pages?.[0]?.templateParams || {}}
          photos={photos}
          isEditable={false}
          templateKind="cover"
        />
      ) : pages?.[0] ? (
        <img src={pages[0].mediumUrl || pages[0].thumbnailUrl} alt="표지" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-ink-muted text-xs">표지 없음</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-warm-bg pb-20 lg:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-warm-border px-4 lg:px-10 py-5 lg:py-6">
        <button type="button" onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-ink-sub hover:text-ink transition-colors text-sm mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로
        </button>
        <h1 className="text-[22px] font-bold text-ink">
          {isOrdered ? '주문 현황' : '주문 정보 수집'}
        </h1>
        <p className="text-sm text-ink-sub mt-1">
          {book.title} · {specLabel} {book.pageCount}페이지
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-10 py-6 space-y-5">

        {/* Not ready: 최종화 필요 */}
        {!isReady && (
          <div className="bg-white rounded-2xl border border-warm-border p-8 text-center">
            <p className="text-sm text-ink-sub mb-4">포토북 최종화(finalize) 후에 주문할 수 있습니다.</p>
            <button type="button" onClick={() => navigate(`/books/${numBookId}/preview`)}
              className="h-11 px-6 rounded-full border border-warm-border text-sm font-medium text-ink hover:bg-warm-bg transition-colors">
              미리보기로 이동
            </button>
          </div>
        )}

        {/* Ready but no order group: 시작하기 */}
        {isReady && !hasOrderGroup && (
          <div className="bg-white rounded-2xl border border-warm-border p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-6 items-center">
              <div className="w-32 lg:w-40 flex-shrink-0">{coverThumb}</div>
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-xl font-bold text-ink mb-1">{book.title}</h2>
                <p className="text-sm text-ink-sub mb-4">{specLabel} · {book.pageCount}페이지 · 권당 {unitPrice ? `${unitPrice.toLocaleString()}원` : '-'}</p>
                <p className="text-sm text-ink-sub mb-5">주문을 시작하고 멤버들에게 배송 정보를 요청하세요.</p>
                <div className="flex gap-2 justify-center lg:justify-start">
                  <button type="button" onClick={() => setShowPreview(true)}
                    className="h-11 px-5 rounded-full border border-warm-border text-sm font-medium text-ink hover:bg-warm-bg transition-colors">
                    포토북 미리보기
                  </button>
                  <button type="button" onClick={handleCreateOrderGroup} disabled={createOg.isPending}
                    className="h-11 px-6 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50">
                    {createOg.isPending ? '생성 중…' : '주문 시작하고 멤버 초대'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Has order group: 메인 레이아웃 */}
        {hasOrderGroup && (
          <>
            {/* Ordered success banner */}
            {isOrdered && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-800">주문이 확정되었습니다</p>
                  <p className="text-xs text-green-700 mt-1">제작 및 배송 현황은 주문 목록에서 확인할 수 있습니다.</p>
                </div>
                <button type="button" onClick={() => navigate('/orders')}
                  className="h-9 px-4 rounded-full bg-white border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors">
                  주문 목록
                </button>
              </div>
            )}

            {/* 내 배송정보 card */}
            {!isOrdered && (
              <div className="bg-white rounded-2xl border border-warm-border p-5 lg:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-20 lg:w-24 flex-shrink-0">{coverThumb}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-base font-bold text-ink">
                          {hasSubmitted ? '내 배송 정보' : isRejected ? '참여하지 않음' : '배송 정보를 입력해주세요'}
                        </h3>
                        <p className="text-xs text-ink-sub mt-0.5">{book.title}</p>
                      </div>
                      <button type="button" onClick={() => setShowPreview(true)}
                        className="h-8 px-3 rounded-full border border-warm-border text-xs font-medium text-ink-sub hover:bg-warm-bg transition-colors whitespace-nowrap">
                        미리보기
                      </button>
                    </div>

                    {hasSubmitted && !showForm && (
                      <div className="bg-warm-bg/60 rounded-lg p-3 text-[13px] space-y-0.5 mb-3">
                        <p className="font-semibold text-ink">{myOrder.recipientName} · {myOrder.quantity}권</p>
                        <p className="text-ink-sub">{myOrder.recipientPhone}</p>
                        <p className="text-ink-sub">[{myOrder.recipientZipCode}] {myOrder.recipientAddress} {myOrder.recipientAddressDetail || ''}</p>
                        {myOrder.memo && <p className="text-[11px] text-ink-muted">메모: {myOrder.memo}</p>}
                      </div>
                    )}

                    {showForm ? (
                      <ShippingForm
                        orderGroupId={orderGroup.id}
                        initialData={myOrder}
                        onSuccess={() => setShowForm(false)}
                        onCancel={() => setShowForm(false)}
                      />
                    ) : orderGroup.status === 'COLLECTING' ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setShowForm(true)}
                          className="h-10 px-5 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors">
                          {hasSubmitted ? '배송 정보 수정' : isRejected ? '다시 참여하기' : '배송지 입력'}
                        </button>
                        {!isRejected && (
                          <button type="button" onClick={handleReject} disabled={rejectOrder.isPending}
                            className="h-10 px-5 rounded-full border border-warm-border bg-white text-sm font-medium text-ink-sub hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                            수령 안 함
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* 주문 접수 현황 + 주문 요약 2-col */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left: 접수 현황 + 멤버 리스트 */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-warm-border p-5 lg:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-ink">주문 접수 현황</h3>
                  <span className="text-xs text-ink-sub">
                    {respondedCount}/{totalMembers}명 응답
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-ink-sub">진행률</span>
                    <span className="font-semibold text-brand">{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-warm-bg rounded-full overflow-hidden">
                    <div className="h-full bg-brand transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                {/* Reminder box (creator, collecting) */}
                {orderGroup.status === 'COLLECTING' && isCreator && !allResponded && (
                  <div className="mb-5 p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <p className="font-semibold text-blue-800">미응답 멤버에게 알림 보내기</p>
                      <p className="text-blue-600 mt-0.5">{membersStatus?.pendingCount}명이 아직 응답하지 않았습니다.</p>
                    </div>
                    <button onClick={() => remindMembers.mutate()}
                      disabled={remindMembers.isPending}
                      className="h-9 px-4 text-xs font-semibold text-white bg-blue-500 rounded-full hover:bg-blue-600 transition-colors whitespace-nowrap disabled:opacity-50">
                      {remindMembers.isPending ? '발송 중…' : remindMembers.isSuccess ? '발송 완료' : '이메일 발송'}
                    </button>
                  </div>
                )}

                {/* Member list */}
                {membersStatus?.members && (
                  <ul className="space-y-1.5">
                    {membersStatus.members.map((m) => {
                      const memberOrder = orders.find((o) => (o.ordererId ?? o.userId) === m.userId);
                      const qty = memberOrder?.quantity ?? 0;
                      const statusBadge =
                        m.status === 'SUBMITTED' ? { label: '완료', cls: 'bg-green-50 text-green-700' } :
                        m.status === 'REJECTED' ? { label: '거절', cls: 'bg-red-50 text-red-600' } :
                        { label: '대기중', cls: 'bg-amber-50 text-amber-700' };
                      return (
                        <li key={m.userId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-warm-bg/50 transition-colors">
                          <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: getDotColor(m.userId) }}>
                            {m.name?.[0] ?? '?'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                            {m.status === 'SUBMITTED' && qty > 0 && (
                              <p className="text-[11px] text-ink-muted">{qty}권 신청</p>
                            )}
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Right: 주문 요약 */}
              <div className="bg-white rounded-2xl border border-warm-border p-5 lg:p-6 h-fit lg:sticky lg:top-6">
                <h3 className="text-base font-bold text-ink mb-4">주문 요약</h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-sub">판형</dt>
                    <dd className="text-ink font-medium">{specLabel}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-sub">페이지</dt>
                    <dd className="text-ink font-medium">{book.pageCount}페이지</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-sub">단가</dt>
                    <dd className="text-ink font-medium">{unitPrice ? `${unitPrice.toLocaleString()}원` : '-'}</dd>
                  </div>
                </dl>

                <hr className="my-4 border-warm-border" />

                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm text-ink-sub">총 주문</span>
                  <span className="text-lg font-bold text-ink">{totalQuantity}권</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-sub">결제 예상</span>
                  <span className="text-xl font-bold text-brand">{totalPrice ? `${totalPrice.toLocaleString()}원` : '-'}</span>
                </div>
                {credits && (
                  <div className="flex justify-between text-xs text-ink-muted mt-2">
                    <span>보유 충전금</span>
                    <span>{credits.balance?.toLocaleString()}원</span>
                  </div>
                )}

                {/* Creator CTA */}
                {orderGroup.status === 'COLLECTING' && isCreator && (
                  <div className="mt-5 space-y-2">
                    {!allResponded && (
                      <p className="text-[11px] text-amber-600 text-center font-medium">
                        모든 멤버가 응답해야 결제할 수 있어요
                      </p>
                    )}
                    <button type="button" onClick={handleConfirm}
                      disabled={confirmAndPlace.isPending || totalQuantity === 0 || !allResponded}
                      className="w-full h-12 rounded-full bg-brand text-white text-[15px] font-semibold hover:bg-brand-hover transition-colors disabled:bg-warm-border disabled:text-ink-muted disabled:cursor-not-allowed shadow-sm">
                      {confirmAndPlace.isPending ? '주문 처리 중…' : '전체 주문 확정'}
                    </button>
                    <button type="button" onClick={() => navigate('/orders')}
                      className="w-full h-10 rounded-full text-ink-sub text-xs font-medium hover:bg-warm-bg transition-colors">
                      나중에 진행하기
                    </button>
                  </div>
                )}

                {orderGroup.status === 'COLLECTING' && !isCreator && (
                  <p className="mt-5 text-[11px] text-ink-muted text-center py-3 bg-warm-bg/60 rounded-lg">
                    결제는 주문을 시작한 사람만 진행할 수 있어요
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showPreview && (
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
