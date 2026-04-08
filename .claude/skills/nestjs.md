# NestJS 개발 스킬

## 새 도메인 모듈 생성 절차
1. `src/domains/{domain}/` 디렉토리 생성
2. 파일 생성 순서:
   - `{domain}.entity.ts` — TypeORM Entity
   - `{domain}.repository.ts` — 커스텀 Repository
   - `{domain}.service.ts` — 비즈니스 로직
   - `{domain}.controller.ts` — HTTP 엔드포인트
   - `{domain}.module.ts` — NestJS Module
   - `dto/create-{domain}.dto.ts` — 요청 DTO
   - `dto/{domain}-response.dto.ts` — 응답 DTO
3. `AppModule`에 새 모듈 import 추가

## Entity 작성 패턴
```typescript
@Entity('table_name')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

## Service 작성 패턴
```typescript
@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateGroupDto, userId: string): Promise<Group> {
    // 검증 → 비즈니스 로직 → 저장
  }
}
```

## Controller 작성 패턴
```typescript
@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: '모임 생성' })
  @ApiResponse({ status: 201, type: GroupResponseDto })
  async create(
    @Body() dto: CreateGroupDto,
    @CurrentUser() user: User,
  ): Promise<GroupResponseDto> {
    return this.groupService.create(dto, user.id);
  }
}
```

## 공통 응답 래핑
- `ResponseInterceptor`가 자동으로 `{ success: true, data, message }` 래핑
- Controller에서 raw 데이터만 return하면 됨
- 에러는 `GlobalExceptionFilter`가 자동 처리

## Guard 적용 순서
1. `JwtAuthGuard` — 인증 확인 (기본)
2. `RolesGuard` — 권한 확인 (필요시)
3. `GroupMemberGuard` — 모임 멤버 확인 (모임 관련 API)

## 테스트 작성
- Service 단위 테스트 필수
- Repository mock 사용
- 성공/실패 케이스 모두 작성
