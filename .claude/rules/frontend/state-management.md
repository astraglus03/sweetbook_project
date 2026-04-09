# FE 상태관리 규칙

## 상태 분류
| 종류 | 도구 | 예시 |
|------|------|------|
| 서버 상태 | TanStack Query | 모임 목록, 사진, 주문 |
| 클라이언트 상태 | Zustand | 모달 열림, 사이드바 토글 |
| 폼 상태 | 로컬 useState | 입력값, 유효성 검사 |
| URL 상태 | React Router | 페이지, 필터, 페이지네이션 |

### 절대 금지
- 서버 데이터를 Zustand에 저장 → TanStack Query 사용
- TanStack Query 캐시 수동 조작 → `invalidateQueries` 사용
- 전역 상태에 폼 입력값 저장

## TanStack Query

### Query Key 컨벤션: `[도메인, 식별자, 필터]`
```javascript
['groups']                                    // 내 모임 목록
['groups', groupId]                           // 모임 상세
['groups', groupId, 'photos', { page, chapter }] // 필터 포함
['notifications', { unreadOnly }]             // 알림
```

### staleTime 기준
| 데이터 | staleTime | 이유 |
|--------|-----------|------|
| 모임 목록 | 3분 | 자주 안 바뀜 |
| 사진 갤러리 | 1분 | 수시 업로드 |
| 알림 | 30초 | 실시간성 |
| 프로필 | 10분 | 거의 안 바뀜 |

### 커스텀 훅 패턴
```javascript
export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.getMyGroups(),
    staleTime: 3 * 60 * 1000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupApi.createGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}
```

## Zustand — UI 상태만
```javascript
export const useUIStore = create((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
}));
```
- 서버 데이터 금지, 인증 토큰 금지 (httpOnly Cookie)
- 현재 사용자 → `useQuery(['me'])`

## Axios 인스턴스
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  timeout: 10000,
});

// 401 → 자동 토큰 갱신
api.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await api.post('/auth/refresh');
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```
