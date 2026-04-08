# 프론트엔드 상태관리 규칙

## 상태 분류 원칙

| 종류 | 도구 | 예시 |
|------|------|------|
| 서버 상태 (DB 데이터) | TanStack Query | 모임 목록, 사진, 주문 |
| 클라이언트 상태 (UI) | Zustand | 모달 열림, 사이드바 토글 |
| 폼 상태 | 로컬 useState | 입력값, 유효성 검사 |
| URL 상태 | React Router | 페이지, 필터, 페이지네이션 |

### 절대 금지
- 서버 데이터를 Zustand에 저장 → TanStack Query 사용
- TanStack Query 캐시를 수동으로 조작하는 대신 `invalidateQueries` 사용
- 전역 상태에 폼 입력값 저장 금지

## TanStack Query 패턴

### Query Key 컨벤션
```javascript
// [도메인, 식별자, 필터]
['groups']                          // 내 모임 목록
['groups', groupId]                 // 모임 상세
['groups', groupId, 'photos']       // 모임 사진 목록
['groups', groupId, 'photos', { page, chapter }]  // 필터 포함
['groups', groupId, 'members']      // 멤버 목록
['books', bookId]                   // 포토북 상세
['orders']                          // 주문 내역
['notifications', { unreadOnly }]   // 알림 목록
```

### 커스텀 훅 패턴
```javascript
// features/groups/hooks/use-groups.js
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.getMyGroups(),
    staleTime: 3 * 60 * 1000, // 3분
  });
}

export function useGroupDetail(groupId) {
  return useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupApi.getGroup(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
```

### staleTime 기준
| 데이터 | staleTime | 이유 |
|--------|-----------|------|
| 모임 목록 | 3분 | 자주 변하지 않음 |
| 사진 갤러리 | 1분 | 멤버가 수시로 업로드 |
| 포토북 페이지 | 5분 | 편집 중 아니면 변경 없음 |
| 알림 | 30초 | 실시간성 필요 |
| 사용자 프로필 | 10분 | 거의 안 바뀜 |

## Zustand Store 패턴

### 스토어는 최소한으로
```javascript
// stores/ui-store.js — UI 상태만
export const useUIStore = create((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
}));

// stores/photo-upload-store.js — 업로드 진행 상태
export const useUploadStore = create((set) => ({
  uploads: [], // { id, file, progress, status }
  addUpload: (file) => set((s) => ({
    uploads: [...s.uploads, { id: crypto.randomUUID(), file, progress: 0, status: 'pending' }],
  })),
  updateProgress: (id, progress) => set((s) => ({
    uploads: s.uploads.map((u) => u.id === id ? { ...u, progress } : u),
  })),
  removeUpload: (id) => set((s) => ({
    uploads: s.uploads.filter((u) => u.id !== id),
  })),
}));
```

### 스토어 금지 대상
- 서버 데이터 (모임 목록, 사진 등) → Query 사용
- 인증 토큰 → httpOnly Cookie (FE에서 접근 불가, 정상)
- 현재 로그인 사용자 → `useQuery(['me'])` 사용

## Axios 인스턴스

```javascript
// lib/axios-instance.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true, // httpOnly Cookie 자동 전송
  timeout: 10000,
});

// 응답 인터셉터: 401 시 토큰 갱신
api.interceptors.response.use(
  (res) => res.data, // { success, data, message } → data 자동 추출
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await api.post('/auth/refresh'); // Cookie 기반이라 body 불필요
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

## 에러/로딩 처리

### 모든 페이지에 3가지 상태 처리 필수
```jsx
function PhotoGallery({ groupId }) {
  const { data, isLoading, isError } = usePhotos(groupId);

  if (isLoading) return <Skeleton />;        // 로딩 스켈레톤
  if (isError) return <ErrorMessage />;       // 에러 메시지
  if (data.length === 0) return <EmptyState />; // 빈 상태

  return <PhotoGrid photos={data} />;
}
```

### 낙관적 업데이트 (투표 등 즉각 반응 필요한 경우)
```javascript
export function useCoverVote(bookId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voteApi.vote,
    onMutate: async (photoId) => {
      await queryClient.cancelQueries({ queryKey: ['books', bookId, 'votes'] });
      const prev = queryClient.getQueryData(['books', bookId, 'votes']);
      queryClient.setQueryData(['books', bookId, 'votes'], (old) => ({
        ...old,
        votes: old.votes.map((v) =>
          v.photoId === photoId ? { ...v, count: v.count + 1 } : v
        ),
      }));
      return { prev };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['books', bookId, 'votes'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['books', bookId, 'votes'] });
    },
  });
}
```
