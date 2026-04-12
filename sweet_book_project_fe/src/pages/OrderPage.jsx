import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages, useAvailableTemplates } from '../features/books/hooks/useBooks';
import { TemplateCanvas } from '../features/books/components/TemplateCanvas';
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

function ShippingForm({ orderGroupId, initialData, onSuccess }) {
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
        {submit.isPending ? '저장 중...' : (isEditMode ? '배송 정보 수정' : '배송 정보 저장')}
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

  const isReady = book.status === 'READY' || book.status === 'ORDERED';
  const hasOrderGroup = orderGroup && !ogNotFound;
  const orders = hasOrderGroup ? orderGroup.orders ?? [] : [];
  const isOrdered = hasOrderGroup && orderGroup.status === 'ORDERED';

  const myOrder = orders.find((o) => o.userId === me?.id);
  const hasSubmitted = !!myOrder;
  const isRejected = myOrder?.status === 'REJECTED';
  const totalQuantity = orders
    .filter((o) => o.status !== 'REJECTED')
    .reduce((sum, o) => sum + (o.quantity ?? 0), 0);
  const unitPrice = estimate?.totalAmount ?? orderGroup?.estimatedPrice ?? 0;
  const totalPrice = totalQuantity * unitPrice;
  const allResponded = membersStatus
    ? (membersStatus.submittedCount + membersStatus.rejectedCount >= membersStatus.totalMembers)
    : false;

  const handleCreateOrderGroup = () => {
    createOg.mutate(undefined, {
      onSuccess: () => setShowForm(true),
    });
  };

  const handleConfirm = () => {
    if (!window.confirm(`총 ${totalQuantity}권 주문을 확정하시겠습니까? 충전금이 차감됩니다.`)) return;
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

      <div className="max-w-6xl mx-auto px-4 lg:px-10 py-6 flex flex-col lg:flex-row gap-8">
        {/* Left: Product Detail */}
        <div className="lg:w-1/2 flex flex-col items-center">
          <div className="bg-white rounded-2xl border border-warm-border p-6 lg:p-10 shadow-sm w-full">
            {pages?.[0] ? (
              <div className="bg-warm-bg rounded-xl overflow-hidden mb-6 flex items-center justify-center border border-warm-border">
                {allTemplates.length > 0 && book?.coverTemplateUid ? (
                  <TemplateCanvas
                    template={allTemplates.find((t) => t.templateUid === book.coverTemplateUid)}
                    params={book.coverParams || pages[0].templateParams || {}}
                    photos={photos}
                    isEditable={false}
                    templateKind="cover"
                  />
                ) : (
                  <img src={pages[0].mediumUrl || pages[0].thumbnailUrl} alt="표지" className="w-full aspect-square object-contain" />
                )}
              </div>
            ) : (
              <div className="aspect-square bg-warm-bg rounded-xl mb-6 flex items-center justify-center border border-warm-border">
                <span className="text-ink-muted">표지 이미지 없음</span>
              </div>
            )}

            <h2 className="text-2xl font-bold text-ink mb-2">{book.title}</h2>
            <p className="text-sm text-ink-sub mb-6">
              {book.bookSpecUid === 'SQUAREBOOK_HC' ? '정사각 하드커버' : book.bookSpecUid === 'PHOTOBOOK_A4_SC' ? 'A4 소프트커버' : 'A5 소프트커버'}
              <span className="mx-2">·</span>
              {book.pageCount}페이지
            </p>

          </div>
        </div>

        {/* Right: Actions and Members */}
        <div className="lg:w-1/2 flex flex-col gap-6">

          {/* 내 배송 정보 */}
          <div className="bg-white rounded-2xl border border-warm-border p-6 shadow-sm">
              <h3 className="text-lg font-bold text-ink mb-4">
                {hasSubmitted && !isRejected ? '내 배송 정보 (입력 완료)' : '내 배송 정보'}
              </h3>

              {hasSubmitted && !isRejected && !showForm && (
                <div className="bg-warm-bg rounded-lg p-3 mb-4 space-y-1">
                  <p className="text-sm font-semibold text-ink">{myOrder.recipientName} · {myOrder.quantity}권</p>
                  <p className="text-xs text-ink-sub">{myOrder.recipientPhone}</p>
                  <p className="text-xs text-ink-sub">[{myOrder.recipientZipCode}] {myOrder.recipientAddress} {myOrder.recipientAddressDetail || ''}</p>
                  {myOrder.memo && <p className="text-[11px] text-ink-muted">메모: {myOrder.memo}</p>}
                </div>
              )}

              {!isReady ? (
                <div className="text-center py-6">
                  <p className="text-sm text-ink-sub mb-4">포토북 최종화(finalize) 후에 주문할 수 있습니다.</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/books/${numBookId}/preview`)}
                    className="h-10 px-6 rounded-full border border-warm-border text-sm font-medium text-ink hover:bg-warm-bg transition-colors"
                  >
                    미리보기로 이동
                  </button>
                </div>
              ) : !hasOrderGroup ? (
                <div className="text-center py-6">
                  <p className="text-sm text-ink-sub mb-4">주문 그룹을 생성하여 배송 정보 수집을 시작하세요.</p>
                  <button
                    type="button"
                    onClick={handleCreateOrderGroup}
                    disabled={createOg.isPending}
                    className="w-full h-12 rounded-xl bg-brand text-white text-base font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50"
                  >
                    {createOg.isPending ? '생성 중...' : '주문을 시작하고 멤버 초대하기'}
                  </button>
                </div>
              ) : hasOrderGroup && orderGroup.status === 'COLLECTING' ? (
                <div>
                  {!showForm ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="h-12 rounded-xl bg-brand text-white font-semibold hover:bg-brand-hover transition-colors shadow-sm"
                      >
                        {hasSubmitted ? (isRejected ? '배송지 다시 입력 (거절 취소)' : '배송 정보 수정하기') : '참여 및 배송지 입력'}
                      </button>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={rejectOrder.isPending || isRejected}
                        className={`h-12 rounded-xl font-semibold transition-colors border ${isRejected ? 'bg-red-100 text-red-500 border-red-200 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100'}`}
                      >
                        {isRejected ? '거절됨 (다시 입력 가능)' : '수령 안 함 (거절)'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button onClick={() => setShowForm(false)} className="text-xs text-ink-sub mb-3 hover:text-ink">← 뒤로</button>
                      <ShippingForm orderGroupId={orderGroup.id} initialData={myOrder} onSuccess={() => setShowForm(false)} />
                    </div>
                  )}
                </div>
              ) : isOrdered ? (
                <div className="py-4 text-center border rounded-xl border-green-200 bg-green-50 text-green-700">
                  <span className="font-semibold">주문이 확정되었습니다.</span>
                  <p className="text-xs mt-1 opacity-80">제작 및 배송 현황은 이 곳에서 확인할 수 있습니다.</p>
                </div>
              ) : null}
            </div>

          {hasOrderGroup && (
            <div className="bg-white rounded-2xl border border-warm-border p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-ink">그룹 멤버 현황</h3>
                {membersStatus && (
                  <span className="text-xs font-medium text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                    응답 {membersStatus.submittedCount + membersStatus.rejectedCount}/{membersStatus.totalMembers}명
                  </span>
                )}
              </div>

              {orderGroup.status === 'COLLECTING' && isCreator && (
                <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-semibold text-blue-800">멤버 배송정보 입력 요청</p>
                    <p className="text-xs text-blue-600 mt-1">아직 응답하지 않은 멤버에게 알림 메일을 보냅니다.</p>
                  </div>
                  <button
                    onClick={() => remindMembers.mutate()}
                    disabled={remindMembers.isPending || allResponded}
                    className="h-9 px-4 text-xs font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {remindMembers.isPending ? '발송 중...' : (remindMembers.isSuccess ? '발송 완료' : '이메일 발송')}
                  </button>
                </div>
              )}

              {membersStatus && membersStatus.members && (
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2">
                  {membersStatus.members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between p-3 rounded-lg border border-warm-border bg-warm-bg text-sm">
                      <span className="font-semibold text-ink">{m.name}</span>
                      {m.status === 'SUBMITTED' ? (
                        <span className="text-green-600 font-medium text-xs">입력 완료</span>
                      ) : m.status === 'REJECTED' ? (
                        <span className="text-red-500 font-medium text-xs">참여 안함</span>
                      ) : (
                        <span className="text-amber-500 font-medium text-xs">대기중</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <hr className="border-warm-border my-4" />

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-sub font-medium">참여 수량</span>
                  <span className="font-semibold text-ink">{totalQuantity}권</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-sub font-medium">권당 가격</span>
                  <span className="font-semibold text-ink">{unitPrice ? `${unitPrice.toLocaleString()}원` : '-'}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-ink font-bold">결제 예상 금액</span>
                  <span className="font-bold text-brand">{totalPrice ? `${totalPrice.toLocaleString()}원` : '-'}</span>
                </div>
                {credits && (
                  <div className="flex justify-between text-xs text-ink-sub">
                    <span>보유 충전금</span>
                    <span>{credits.balance?.toLocaleString()}원</span>
                  </div>
                )}
              </div>

              {orderGroup.status === 'COLLECTING' && isCreator && (
                <>
                  {!allResponded && membersStatus && (
                    <p className="text-xs text-amber-600 text-center mb-2 font-medium">
                      아직 {membersStatus.pendingCount}명이 응답하지 않았습니다. 모두 응답해야 결제할 수 있습니다.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirmAndPlace.isPending || totalQuantity === 0 || !allResponded}
                    className="w-full h-12 rounded-xl bg-ink text-white text-base font-semibold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {confirmAndPlace.isPending ? '주문 처리 중...' : '취합 완료 및 결제하기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/orders')}
                    className="w-full h-11 mt-2 rounded-xl bg-white border border-warm-border text-ink-sub text-sm font-medium hover:bg-warm-bg transition-colors"
                  >
                    나중에 진행하기 (주문 목록으로)
                  </button>
                </>
              )}
              {orderGroup.status === 'COLLECTING' && !isCreator && (
                <p className="text-xs text-ink-muted text-center py-3 bg-warm-bg rounded-lg">
                  결제는 주문을 시작한 사람만 진행할 수 있습니다.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
