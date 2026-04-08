# React 개발 스킬

## 새 Feature 생성 절차
1. `src/features/{domain}/` 디렉토리 생성
2. 하위 구조:
   - `api/` — API 호출 함수 (axios)
   - `hooks/` — 커스텀 훅 (React Query + 비즈니스 로직)
   - `components/` — 도메인 전용 컴포넌트
3. `src/pages/`에 페이지 컴포넌트 추가
4. `src/router/`에 라우트 등록

## API 호출 패턴
```javascript
// features/groups/api/groups-api.js
import { apiClient } from '../../../lib/axios';

export const groupsApi = {
  getAll: (params) => apiClient.get('/groups', { params }),
  getById: (id) => apiClient.get(`/groups/${id}`),
  create: (data) => apiClient.post('/groups', data),
  update: (id, data) => apiClient.patch(`/groups/${id}`, data),
  delete: (id) => apiClient.delete(`/groups/${id}`),
};
```

## React Query 훅 패턴
```javascript
// features/groups/hooks/use-groups.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/groups-api';

export const useGroups = (params) => {
  return useQuery({
    queryKey: ['groups', params],
    queryFn: () => groupsApi.getAll(params),
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};
```

## Zustand Store 패턴
```javascript
// stores/auth-store.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));
```

## Axios 인스턴스 설정
```javascript
// lib/axios.js
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true, // httpOnly cookie 자동 전송
});

// 401 시 자동 refresh
apiClient.interceptors.response.use(
  (res) => res.data, // { success, data, message } 중 전체 반환
  async (error) => {
    // refresh token 로직
  }
);
```

## 컴포넌트 작성 규칙
- props 구조분해 할당
- 로딩/에러/빈 상태 항상 처리
- Tailwind CSS 클래스만 사용 (인라인 스타일 금지)
- 이벤트 핸들러: `handle` 접두사

## 페이지 구조
```javascript
// pages/GroupDetailPage.jsx
export default function GroupDetailPage() {
  const { groupId } = useParams();
  const { data, isLoading, error } = useGroupDetail(groupId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;

  return <GroupDetail group={data} />;
}
```
