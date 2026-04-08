# 성능 최적화 규칙

## TypeORM N+1 문제 방지

### 절대 금지 패턴
```typescript
// ❌ N+1 발생 — 모임 목록 조회 후 각각 멤버 수 조회
const groups = await this.groupRepository.find();
for (const group of groups) {
  group.memberCount = await this.memberRepository.count({ groupId: group.id });
}
```

### 해결: relations 옵션 (간단한 경우)
```typescript
// ✅ LEFT JOIN으로 한 번에 조회
const groups = await this.groupRepository.find({
  relations: ['members', 'photos'],
});
```

### 해결: QueryBuilder (복잡한 경우, 권장)
```typescript
// ✅ 필요한 컬럼만 SELECT + JOIN + 서브쿼리
const groups = await this.groupRepository
  .createQueryBuilder('group')
  .leftJoin('group.members', 'member')
  .addSelect('COUNT(member.id)', 'memberCount')
  .leftJoin('group.photos', 'photo')
  .addSelect('COUNT(photo.id)', 'photoCount')
  .where('member.userId = :userId', { userId })
  .groupBy('group.id')
  .getRawAndEntities();
```

### 해결: Raw Query (최고 성능, 복잡한 집계)
```typescript
// ✅ 복잡한 통계/집계에만 사용 — 반드시 파라미터 바인딩
const result = await this.dataSource.query(
  `SELECT g.id, g.name,
    COUNT(DISTINCT m.id) as "memberCount",
    COUNT(DISTINCT p.id) as "photoCount"
   FROM groups g
   LEFT JOIN group_members m ON m.group_id = g.id
   LEFT JOIN photos p ON p.group_id = g.id
   WHERE m.user_id = $1
   GROUP BY g.id
   ORDER BY g.created_at DESC
   LIMIT $2 OFFSET $3`,
  [userId, limit, offset]
);
```

## 쿼리 전략 선택 기준

| 상황 | 전략 | 예시 |
|------|------|------|
| 단건 조회 + 연관 1~2개 | `relations` 옵션 | 모임 상세 + 멤버 목록 |
| 목록 조회 + 집계 필요 | `QueryBuilder` | 대시보드 (모임별 멤버수/사진수) |
| 복잡한 통계/리포트 | Raw Query | 활동 피드 (다중 테이블 UNION) |
| 페이지네이션 + 정렬 | `QueryBuilder` | 사진 갤러리 (챕터별/업로더별 필터) |

## QueryBuilder 필수 규칙
- `select()`로 필요한 컬럼만 명시 — `SELECT *` 금지
- `where()`에 항상 파라미터 바인딩 사용 — SQL 인젝션 방지
- 목록 조회는 반드시 `take()` + `skip()` 페이지네이션 적용
- `orderBy()`에 인덱스 걸린 컬럼 사용

## Raw Query 사용 조건 (3가지 모두 충족 시만)
1. QueryBuilder로 표현 불가능하거나 심하게 복잡한 경우
2. 성능이 임계적인 경우 (대시보드 메인 쿼리 등)
3. **반드시 파라미터 바인딩 사용** (문자열 결합 절대 금지)

## 인덱스 전략

### 반드시 인덱스 걸어야 하는 컬럼
```sql
-- FK는 TypeORM이 자동 생성하지 않음 — 수동으로 추가 필수
CREATE INDEX idx_photos_group_id ON photos(group_id);
CREATE INDEX idx_photos_uploader_id ON photos(uploader_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_orders_book_id ON orders(book_id);

-- 자주 필터링/정렬되는 컬럼
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- 복합 인덱스 (자주 함께 조건되는 컬럼)
CREATE INDEX idx_photos_group_chapter ON photos(group_id, chapter);
```

### TypeORM Entity에서 인덱스 선언
```typescript
@Entity('photos')
@Index('idx_photos_group_id', ['group'])
@Index('idx_photos_created_at', ['createdAt'])
@Index('idx_photos_group_chapter', ['group', 'chapter'])
export class Photo { ... }
```

## Eager Loading vs Lazy Loading
- `eager: true` 사용 금지 — 항상 명시적으로 `relations` 지정
- 목록 조회에서 불필요한 relation 로드 금지
- 상세 조회에서만 필요한 relation 포함

```typescript
// ❌ eager loading — 모든 조회에서 photos를 불러옴
@OneToMany(() => Photo, photo => photo.group, { eager: true })
photos: Photo[];

// ✅ 필요할 때만 명시적 로드
@OneToMany(() => Photo, photo => photo.group)
photos: Photo[];

// 상세 조회 시
findOne(id, { relations: ['photos', 'members'] });
// 목록 조회 시 — relations 없이 조회
find({ where: { userId } });
```

## 페이지네이션 필수 적용
- 목록 API는 무조건 페이지네이션 — 전체 조회 금지
- 기본값: `page=1`, `limit=20`, 최대 `limit=100`
- `COUNT` 쿼리 최적화: 필터 없는 전체 카운트는 캐싱 고려

```typescript
async findPhotos(groupId: number, page: number, limit: number) {
  const [items, total] = await this.photoRepository
    .createQueryBuilder('photo')
    .where('photo.groupId = :groupId', { groupId })
    .orderBy('photo.createdAt', 'DESC')
    .take(limit)
    .skip((page - 1) * limit)
    .getManyAndCount();

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
```

## Redis 캐싱 전략

### 캐시 대상 (읽기 빈도 높고 변경 빈도 낮은 데이터)
| 키 패턴 | 데이터 | TTL |
|---------|--------|-----|
| `group:{id}:info` | 모임 기본 정보 | 5분 |
| `group:{id}:stats` | 멤버수/사진수 집계 | 1분 |
| `book:{id}:pages` | 포토북 페이지 구성 | 10분 |
| `user:{id}:groups` | 사용자 모임 목록 | 3분 |

### 캐시 무효화 규칙
- 데이터 변경(CUD) 시 관련 캐시 즉시 삭제
- TTL은 짧게 설정 — 정합성 우선
- 캐시 미스 시 DB 조회 후 캐시 갱신 (Cache-Aside 패턴)

```typescript
// Cache-Aside 패턴
async getGroupStats(groupId: number) {
  const cacheKey = `group:${groupId}:stats`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const stats = await this.calculateGroupStats(groupId);
  await this.redis.set(cacheKey, JSON.stringify(stats), 'EX', 60);
  return stats;
}

// 사진 업로드 시 캐시 무효화
async uploadPhoto(groupId: number, ...) {
  // ... 업로드 로직
  await this.redis.del(`group:${groupId}:stats`);
}
```

## Bull Queue 비동기 처리

### 큐로 처리해야 하는 작업 (응답 시간에 영향주면 안 되는 것)
- 사진 리사이징/최적화 (Sharp)
- AI 품질 분석 (OpenAI Vision API)
- 포토북 PDF 생성
- Sweetbook API 사진 업로드 (외부 API)
- 알림 발송 (대량)

### 큐 사용 패턴
```typescript
// Controller → 즉시 응답
@Post('photos/upload')
async upload(@UploadedFile() file) {
  const photo = await this.photoService.saveToLocal(file);
  await this.photoQueue.add('process', { photoId: photo.id }); // 큐에 넣기
  return photo; // 즉시 응답 (처리는 백그라운드)
}

// Processor → 백그라운드 처리
@Processor('photo')
export class PhotoProcessor {
  @Process('process')
  async handle(job: Job<{ photoId: number }>) {
    await this.resizeImage(job.data.photoId);      // Sharp
    await this.analyzeQuality(job.data.photoId);   // OpenAI
    await this.uploadToSweetbook(job.data.photoId); // 외부 API
  }
}
```
