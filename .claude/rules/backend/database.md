# BE 데이터베이스 규칙

## 트랜잭션
- DB write 2개 이상 → 무조건 QueryRunner 트랜잭션
- 외부 API 호출은 트랜잭션 시작 전에 먼저 처리 (롤백 불가능하므로)
- 패턴:
```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
try {
  // DB 작업들
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

## N+1 문제 방지
```typescript
// ❌ N+1 발생
const groups = await this.groupRepository.find();
for (const group of groups) {
  group.memberCount = await this.memberRepository.count({ groupId: group.id });
}

// ✅ relations (간단한 경우)
const groups = await this.groupRepository.find({ relations: ['members', 'photos'] });

// ✅ QueryBuilder (집계 필요 시, 권장)
const groups = await this.groupRepository
  .createQueryBuilder('group')
  .leftJoin('group.members', 'member')
  .addSelect('COUNT(member.id)', 'memberCount')
  .groupBy('group.id')
  .getRawAndEntities();
```

## 쿼리 전략 선택
| 상황 | 전략 |
|------|------|
| 단건 조회 + 연관 1~2개 | `relations` 옵션 |
| 목록 조회 + 집계 | QueryBuilder |
| 복잡한 통계/리포트 | Raw Query (파라미터 바인딩 필수) |

## Raw Query 사용 조건 (3가지 모두 충족 시만)
1. QueryBuilder로 표현 불가능하거나 심하게 복잡
2. 성능이 임계적인 경우
3. **반드시 `$1`, `$2` 파라미터 바인딩** (문자열 결합 절대 금지)

## Eager Loading 금지
- `eager: true` 사용 금지 → 항상 명시적으로 `relations` 지정
- 목록 조회에서 불필요한 relation 로드 금지

## 인덱스 전략
- FK 컬럼은 TypeORM이 자동 생성하지 않음 → 수동 추가 필수
- 자주 필터링/정렬되는 컬럼에 인덱스
- Entity에서 `@Index()` 데코레이터로 선언
```typescript
@Entity('photos')
@Index('idx_photos_group_id', ['group'])
@Index('idx_photos_created_at', ['createdAt'])
@Index('idx_photos_group_chapter', ['group', 'chapter'])
export class Photo { ... }
```

## 페이지네이션 필수
- 목록 API는 무조건 페이지네이션 — 전체 조회 금지
- 기본값: `page=1`, `limit=20`, 최대 `limit=100`

## Redis 캐싱
| 키 패턴 | TTL | 무효화 시점 |
|---------|-----|------------|
| `group:{id}:stats` | 1분 | 사진 업로드/멤버 변경 시 |
| `group:{id}:info` | 5분 | 모임 정보 수정 시 |
| `book:{id}:pages` | 10분 | 포토북 편집 시 |

- Cache-Aside 패턴: 캐시 미스 → DB 조회 → 캐시 저장
- CUD 시 관련 캐시 즉시 `del()`
