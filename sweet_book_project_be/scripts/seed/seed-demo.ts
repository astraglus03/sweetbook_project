/**
 * seed-demo.ts
 * 메인 시드 오케스트레이터.
 *
 * 사용법:
 *   npm run seed:demo -- --target=local
 *   npm run seed:demo -- --target=production
 *   npm run seed:demo -- --target=local --reset
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';

import { loadEnv, createSeedDataSource } from './datasource';
import { PERSONS, GROUP_MEMBERS } from './persons';
import { generatePhotos } from './photo-generator';
import { initSupabase, uploadFile } from './supabase-uploader';
import { createSweetbookClient, SweetbookClient } from './sweetbook-client';
import {
  initFaceApi,
  detectAll,
  detectSingle,
  cosineSimilarity,
  averageEmbedding,
  DetectedFace,
} from './face-embedder';

import { User } from '../../src/domains/users/entities/user.entity';
import { Group } from '../../src/domains/groups/entities/group.entity';
import { GroupMember } from '../../src/domains/groups/entities/group-member.entity';
import { Photo } from '../../src/domains/photos/entities/photo.entity';
import { PhotoFace } from '../../src/domains/photos/entities/photo-face.entity';
import { UserFaceAnchor } from '../../src/domains/photos/entities/user-face-anchor.entity';
import { UserFaceAnchorSample } from '../../src/domains/photos/entities/user-face-anchor-sample.entity';
import { Book } from '../../src/domains/books/entities/book.entity';
import { BookPage } from '../../src/domains/books/entities/book-page.entity';
import { PersonalBookMatch } from '../../src/domains/books/entities/personal-book-match.entity';
import { Order } from '../../src/domains/orders/entities/order.entity';
import { OrderGroup } from '../../src/domains/orders/entities/order-group.entity';
import { Notification } from '../../src/domains/notifications/entities/notification.entity';
import { GroupActivity } from '../../src/domains/activities/entities/group-activity.entity';
import { CoverCandidate } from '../../src/domains/cover-voting/entities/cover-candidate.entity';
import { CoverVote } from '../../src/domains/cover-voting/entities/cover-vote.entity';

// ─── 페이지 캡션 풀 ───────────────────────────────────────────────────────────

const CAPTIONS: string[] = [
  '오랜만의 만남',
  '잊지 못할 순간',
  '함께한 시간',
  '추억의 한 페이지',
  '소중한 사람들과',
  '웃음이 넘치는 하루',
  '우리들의 이야기',
  '행복한 기억',
  '따뜻한 봄날',
  '눈부신 하루',
  '다시 만날 그날까지',
  '기억 속의 풍경',
  '찰나의 행복',
  '모두 함께여서 좋았던 날',
];

// ─── CLI 인수 파싱 ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const targetArg = args.find((a) => a.startsWith('--target='));
const target = (targetArg?.split('=')[1] ?? 'local') as 'local' | 'production';
const doReset = args.includes('--reset');
const skipFace = args.includes('--skip-face');
const skipSweetbook = args.includes('--skip-sweetbook');

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function randomInviteCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

function seedIdempotencyKey(tag: string): string {
  return `seed-${tag}-${Date.now()}`;
}

async function findOrCreate<T extends object>(
  repo: Repository<T>,
  where: Partial<T>,
  creator: () => T,
): Promise<{ entity: T; created: boolean }> {
  const existing = await repo.findOne({ where: where as any });
  if (existing) return { entity: existing, created: false };
  const entity = repo.create(creator() as any) as T;
  const saved = await repo.save(entity as any);
  return { entity: saved as T, created: true };
}

// ─── 리셋 ─────────────────────────────────────────────────────────────────────

async function resetDb(ds: DataSource): Promise<void> {
  console.log('\n[reset] 모든 테이블 TRUNCATE...');
  const tableOrder = [
    'personal_book_matches',
    'book_pages',
    'cover_votes',
    'cover_candidates',
    'group_activities',
    'notifications',
    'orders',
    'order_groups',
    'books',
    'user_face_anchor_samples',
    'user_face_anchors',
    'photo_faces',
    'photos',
    'group_members',
    'groups',
    'users',
  ];
  for (const table of tableOrder) {
    await ds.query(
      `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`,
    );
    console.log(`  TRUNCATE ${table}`);
  }
  console.log('[reset] 완료\n');
}

// ─── Sweetbook 헬퍼 ───────────────────────────────────────────────────────────

interface ParamDef {
  binding: string;
  [key: string]: unknown;
}

interface SbDefaults {
  bookSpecUid: string;
  coverTemplateUid: string;
  contentTemplateUid: string;
  blankTemplateUid: string;   // 빈내지 패딩용 (없으면 contentTemplateUid 와 동일)
  coverBindingKey: string;
  contentBindingKey: string;
  coverDefs: Record<string, ParamDef>;
  contentDefs: Record<string, ParamDef>;
  blankDefs: Record<string, ParamDef>;
  theme: string;
  // bookSpec 페이지 규칙 (match: books.service.ts:280-282)
  pageMin: number;
  pageMax: number;
  pageIncrement: number;
}

// ── binding 판별 헬퍼 (match: books.service.ts:351-377) ──────────────────────

function isFileBinding(binding: string): boolean {
  const b = binding.toLowerCase();
  return (
    b.includes('file') ||
    b.includes('photo') ||
    b.includes('image') ||
    b.includes('collage') ||
    b.includes('gallery')
  );
}

/**
 * multi-file binding 여부 (match: books.service.ts:365-377)
 * gallery/collage/list 등은 string[] 배열로 보내야 함
 */
function isMultiFileBinding(binding: string): boolean {
  const b = binding.toLowerCase();
  return (
    b === 'files' ||
    b === 'filelist' ||
    b === 'images' ||
    b === 'photos' ||
    b.includes('collage') ||
    b.includes('gallery') ||
    b.endsWith('list') ||
    b.endsWith('s')
  );
}

function fileKeys(defs: Record<string, ParamDef>): string[] {
  return Object.entries(defs)
    .filter(([, v]) => isFileBinding(v.binding))
    .map(([k]) => k);
}

/**
 * 템플릿 정의를 보고 모든 파라미터를 채워 완성된 parameters 객체를 만든다.
 * match: books.service.ts:515-546 (내지 파라미터 채움 로직)
 *
 * - file binding (single) → fileName (string)
 * - file binding (multi/gallery/collage) → [fileName] (string[])
 * - text binding (title|spineTitle) → bookTitle
 * - text binding (subtitle) → ' '
 * - text binding (dateRange) → 현재 연도
 * - text binding (year) → 현재 연도
 * - text binding (month) → 현재 월
 * - text binding (date) → 현재 일
 * - 그 외 text → ' '
 */
function buildParams(
  defs: Record<string, ParamDef>,
  fileName: string,
  bookTitle: string,
  captionIndex?: number,
  groupDescription?: string,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  const now = new Date();

  // subtitle용 문구: 그룹 description 또는 "YYYY.MM 추억" 형식
  const subtitleText = groupDescription
    ? groupDescription
    : `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')} 추억`;

  for (const [key, def] of Object.entries(defs)) {
    const binding = String(def.binding ?? '');
    if (isFileBinding(binding)) {
      // match: books.service.ts:529-534 (multi vs single file binding)
      params[key] = isMultiFileBinding(binding) ? [fileName] : fileName;
    } else if (binding === 'text') {
      // match: books.service.ts:543-545 (필수 텍스트 기본값)
      if (/title|spineTitle/i.test(key)) params[key] = bookTitle;
      else if (/subtitle/i.test(key)) params[key] = subtitleText;
      else if (/dateRange/i.test(key)) params[key] = now.getFullYear().toString();
      else if (/year/i.test(key)) params[key] = now.getFullYear().toString();
      else if (/month/i.test(key)) params[key] = String(now.getMonth() + 1);
      else if (/date/i.test(key)) params[key] = String(now.getDate());
      else if (/caption|description|memo|comment/i.test(key) && captionIndex !== undefined) {
        params[key] = CAPTIONS[captionIndex % CAPTIONS.length];
      } else {
        params[key] = ' ';
      }
    }
  }
  return params;
}

/**
 * 빈내지 패딩용 파라미터 빌드 (match: books.service.ts:577-599)
 */
function buildBlankParams(
  defs: Record<string, ParamDef>,
  fallbackFileName: string,
  bookTitle: string,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  const now = new Date();
  const fks = fileKeys(defs);

  // file 바인딩: 업로드된 fallback 사진으로 채움
  for (const fk of fks) {
    const def = defs[fk];
    params[fk] = isMultiFileBinding(def.binding) ? [fallbackFileName] : fallbackFileName;
  }
  // text 바인딩: 필수 필드 기본값 (match: books.service.ts:588-598)
  for (const [key, def] of Object.entries(defs)) {
    if (def.binding !== 'text') continue;
    if (params[key]) continue;
    if (/title|bookTitle/i.test(key)) params[key] = bookTitle;
    else if (/year/i.test(key)) params[key] = now.getFullYear().toString();
    else if (/month/i.test(key)) params[key] = String(now.getMonth() + 1);
    else if (/date/i.test(key)) params[key] = String(now.getDate());
    else params[key] = ' ';
  }
  return params;
}

/**
 * book_pages.templateParams 용: contentDefs 의 모든 binding 키를 채운다.
 * match: books.service.ts:520-552 (내지 파라미터 채움 로직)
 *
 * - single file binding → fileName (string)
 * - multi file binding  → [fileName] (string[])
 * - text binding        → buildParams 와 동일 규칙
 */
function buildPageTemplateParams(
  defs: Record<string, ParamDef>,
  fileName: string,
  bookTitle: string,
  captionIndex: number,
  groupDescription?: string,
): Record<string, string | string[]> {
  return buildParams(defs, fileName, bookTitle, captionIndex, groupDescription);
}

/**
 * pageMin/pageMax/pageIncrement 를 만족하는 목표 페이지 수 계산
 * match: books.service.ts:654-667 (calcTargetPageCount)
 */
function calcTargetPageCount(
  current: number,
  pageMin: number,
  pageMax: number,
  pageIncrement: number,
): number {
  let target = Math.max(current, pageMin);
  const remainder = (target - pageMin) % pageIncrement;
  if (remainder !== 0) {
    target += pageIncrement - remainder;
  }
  return Math.min(target, pageMax);
}

async function resolveSweetbookDefaults(sb: SweetbookClient): Promise<SbDefaults> {
  const specs = await sb.getBookSpecs();
  if (specs.length === 0) throw new Error('Sweetbook: book-specs 가 비어있습니다');
  const bookSpecUid = String(specs[0].uid ?? specs[0]['bookSpecUid'] ?? '');
  if (!bookSpecUid) throw new Error('Sweetbook: bookSpecUid 를 확인할 수 없습니다');

  // bookSpec 상세 (pageMin/pageMax/pageIncrement) 조회
  // match: books.service.ts:280-282
  const specDetail = await sb.getBookSpec(bookSpecUid);
  const pageMin = Number(specDetail.pageMin ?? 20);
  const pageMax = Number(specDetail.pageMax ?? 200);
  const pageIncrement = Number(specDetail.pageIncrement ?? 2);

  const templates = await sb.getTemplates(bookSpecUid);

  // 테마/커버/컨텐츠 해석 (match: books.service.ts:292-315)
  const themeKinds = new Map<string, Set<string>>();
  for (const t of templates) {
    const theme = String(t.theme ?? '');
    if (!theme || theme === '공용' || /알림장/.test(theme)) continue;
    if (!themeKinds.has(theme)) themeKinds.set(theme, new Set());
    themeKinds.get(theme)!.add(String(t.templateKind ?? '').toLowerCase());
  }
  let pickedTheme: string | null = null;
  for (const [theme, kinds] of themeKinds) {
    if (kinds.has('cover') && kinds.has('content')) {
      pickedTheme = theme;
      break;
    }
  }

  const coverTpl =
    templates.find(
      (t) => String(t.theme ?? '') === pickedTheme && String(t.templateKind ?? '').toLowerCase() === 'cover',
    ) ?? templates[0];
  const contentTpl =
    templates.find(
      (t) => String(t.theme ?? '') === pickedTheme && String(t.templateKind ?? '').toLowerCase() === 'content',
    ) ?? templates[1] ?? templates[0];

  // 빈내지 템플릿 (match: books.service.ts:302-314)
  // 테마 내 '빈내지' 이름 → 없으면 공용 빈내지 → 없으면 contentTpl 재사용
  const blankTpl =
    templates.find(
      (t) =>
        String(t.theme ?? '') === pickedTheme &&
        String(t.templateKind ?? '').toLowerCase() === 'content' &&
        /빈내지/.test(String(t.templateName ?? '')),
    ) ??
    templates.find(
      (t) =>
        String(t.templateKind ?? '').toLowerCase() === 'content' &&
        /빈내지/.test(String(t.templateName ?? '')) &&
        String(t.theme ?? '') === '공용',
    );

  const fetchDefs = async (templateUid: string): Promise<Record<string, ParamDef>> => {
    try {
      const detail = await sb.getTemplateDetail(templateUid);
      return (detail?.parameters?.definitions ?? {}) as Record<string, ParamDef>;
    } catch {
      return {};
    }
  };

  const findFirstFileKey = (defs: Record<string, ParamDef>, fallback: string): string => {
    const found = Object.entries(defs).find(([, v]) => isFileBinding(v.binding));
    return found ? found[0] : fallback;
  };

  const coverTemplateUid = String(coverTpl.templateUid ?? '');
  const contentTemplateUid = String(contentTpl.templateUid ?? '');
  const blankTemplateUid = blankTpl ? String(blankTpl.templateUid ?? '') : contentTemplateUid;

  const coverDefs = await fetchDefs(coverTemplateUid);
  const contentDefs = await fetchDefs(contentTemplateUid);
  // blankDefs: blank 가 contentTpl 과 같으면 캐시 재사용
  const blankDefs =
    blankTemplateUid === contentTemplateUid ? contentDefs : await fetchDefs(blankTemplateUid);

  const coverBindingKey = findFirstFileKey(coverDefs, 'coverPhoto');
  const contentBindingKey = findFirstFileKey(contentDefs, 'photo');

  console.log(
    `  [SB] theme="${pickedTheme}" cover=${coverTemplateUid} content=${contentTemplateUid} blank=${blankTemplateUid} pageMin=${pageMin} pageMax=${pageMax} pageIncrement=${pageIncrement}`,
  );

  return {
    bookSpecUid,
    coverTemplateUid,
    contentTemplateUid,
    blankTemplateUid,
    coverBindingKey,
    contentBindingKey,
    coverDefs,
    contentDefs,
    blankDefs,
    theme: pickedTheme ?? String(coverTpl.theme ?? 'default'),
    pageMin,
    pageMax,
    pageIncrement,
  };
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  GroupBook 데모 시드 시작');
  console.log(`  target: ${target}  reset: ${doReset}`);
  console.log('========================================\n');

  // ── a) dotenv 로드 ──────────────────────────────────────────────────────────
  loadEnv(target);

  // ── b) DB 연결 ──────────────────────────────────────────────────────────────
  console.log('[step-b] DB 연결...');
  const ds = createSeedDataSource();
  await ds.initialize();
  console.log('[step-b] DB 연결 성공\n');

  try {
    // ── c) 리셋 ────────────────────────────────────────────────────────────────
    if (doReset) {
      await resetDb(ds);
    }

    // ── d) 사진 생성 ──────────────────────────────────────────────────────────
    console.log('[step-d] 사진 파일 생성...');
    const { anchorPaths, groupPhotoPaths } = await generatePhotos();
    console.log('[step-d] 완료\n');

    // ── e) face-api 초기화 + 임베딩 ───────────────────────────────────────────
    let faceApiReady = false;
    /** personIdx → 앵커 임베딩 배열(샘플별) */
    const anchorEmbeddings: Map<number, DetectedFace[]> = new Map();
    /** personIdx → 평균 임베딩 */
    const anchorAvgEmbeddings: Map<number, number[]> = new Map();

    if (!skipFace) {
      console.log('[step-e] face-api 초기화...');
      try {
        await initFaceApi();
        faceApiReady = true;

        // 모임③ 멤버 (idx 4,5,7) 앵커 임베딩 산출
        for (const personIdx of GROUP_MEMBERS.group3) {
          const samples = anchorPaths[personIdx];
          if (!samples?.length) continue;
          const detected: DetectedFace[] = [];
          for (const samplePath of samples) {
            const buf = fs.readFileSync(samplePath);
            const face = await detectSingle(buf);
            if (face) detected.push(face);
          }
          if (detected.length > 0) {
            anchorEmbeddings.set(personIdx, detected);
            anchorAvgEmbeddings.set(
              personIdx,
              averageEmbedding(detected.map((d) => d.embedding)),
            );
            console.log(
              `  person[${personIdx}] 앵커 ${detected.length}/${samples.length}장 감지됨`,
            );
          } else {
            console.warn(`  person[${personIdx}] 얼굴 감지 실패 — 앵커 스킵`);
          }
        }
        console.log('[step-e] 완료\n');
      } catch (err) {
        console.warn(`[step-e] face-api 초기화 실패 — 얼굴 관련 데이터 스킵: ${(err as Error).message}\n`);
        faceApiReady = false;
      }
    } else {
      console.log('[step-e] --skip-face 플래그 — 건너뜀\n');
    }

    // ── f) Supabase 업로드 ────────────────────────────────────────────────────
    console.log('[step-f] Supabase 초기화...');
    initSupabase();

    /** localPath → { filename, width, height, size } */
    const processedPhotos: Map<
      string,
      { filename: string; width: number | null; height: number | null; size: number }
    > = new Map();

    /**
     * Production photos.service.ts:processAndSave 와 동일한 패턴.
     * 사진 1장당 sharp로 3 사이즈(original/medium/thumbnail) 만들어 webp로 업로드.
     * Photo.filename 컬럼에는 URL이 아니라 **파일명만** 저장.
     */
    const processAndUploadPhoto = async (
      localPath: string,
      groupId: number,
    ): Promise<{ filename: string; width: number | null; height: number | null; size: number }> => {
      if (processedPhotos.has(localPath)) return processedPhotos.get(localPath)!;

      const sharp = (await import('sharp')).default;
      const buf = fs.readFileSync(localPath);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

      const base = sharp(buf).rotate().webp({ quality: 85 });
      const metadata = await sharp(buf).metadata();

      const [originalBuf, mediumBuf, thumbnailBuf] = await Promise.all([
        base.clone().resize(1200, null, { withoutEnlargement: true }).toBuffer(),
        base.clone().resize(600, null, { withoutEnlargement: true }).toBuffer(),
        base.clone().resize(200, 200, { fit: 'cover' }).toBuffer(),
      ]);

      await Promise.all([
        uploadFile(originalBuf, `photos/${groupId}/original/${uniqueName}`, 'image/webp'),
        uploadFile(mediumBuf, `photos/${groupId}/medium/${uniqueName}`, 'image/webp'),
        uploadFile(thumbnailBuf, `photos/${groupId}/thumbnail/${uniqueName}`, 'image/webp'),
      ]);

      const result = {
        filename: uniqueName,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        size: originalBuf.length,
      };
      processedPhotos.set(localPath, result);
      return result;
    };

    console.log('[step-f] 완료\n');

    // ── g) DB INSERT ──────────────────────────────────────────────────────────

    // -- users --
    console.log('[step-g] users INSERT...');
    const userRepo = ds.getRepository(User);
    const createdUsers: User[] = [];
    for (const p of PERSONS) {
      const passwordHash = await bcrypt.hash(p.password, 10);
      const { entity: user, created } = await findOrCreate(
        userRepo,
        { email: p.email } as Partial<User>,
        () =>
          ({
            email: p.email,
            name: p.name,
            passwordHash,
            provider: 'local',
            providerUserId: null,
            avatarUrl: p.portraitUrl,
          } as User),
      );
      createdUsers.push(user);
      console.log(`  ${created ? '생성' : '기존'} ${p.email} (id=${user.id})`);
    }

    // -- groups --
    console.log('[step-g] groups INSERT...');
    const groupRepo = ds.getRepository(Group);
    const memberRepo = ds.getRepository(GroupMember);

    const groupDefs = [
      {
        name: '2026 봄 동창회',
        description: '오랜만에 모인 동창회 모임입니다. 추억을 기록해요!',
        status: 'COLLECTING' as const,
        ownerIdx: 0,
        memberIdxs: GROUP_MEMBERS.group1,
        eventDate: '2026-03-15',
      },
      {
        name: '등산 동호회 3월 정모',
        description: '북한산 등반 기념 포토북을 만들어요.',
        status: 'EDITING' as const,
        ownerIdx: 1,
        memberIdxs: GROUP_MEMBERS.group2,
        eventDate: '2026-03-22',
      },
      {
        name: '가족 제주 여행',
        description: '제주도 봄 여행 기념 앨범입니다.',
        status: 'ORDERED' as const,
        ownerIdx: 4,
        memberIdxs: GROUP_MEMBERS.group3,
        eventDate: '2026-03-29',
      },
      {
        name: '사진 동호회 1기',
        description: '사진 동호회 첫 번째 기수 모임입니다.',
        status: 'COLLECTING' as const,
        ownerIdx: 6,
        memberIdxs: GROUP_MEMBERS.group4,
        eventDate: null,
      },
    ];

    const createdGroups: Group[] = [];
    for (const gd of groupDefs) {
      const owner = createdUsers[gd.ownerIdx];
      let group = await groupRepo.findOne({ where: { name: gd.name, ownerId: owner.id } });
      if (!group) {
        group = groupRepo.create({
          name: gd.name,
          description: gd.description,
          status: gd.status,
          ownerId: owner.id,
          inviteCode: randomInviteCode(),
          eventDate: gd.eventDate,
          uploadDeadline: null,
          year: 2026,
          parentGroupId: null,
          coverImage: null,
        });
        group = await groupRepo.save(group);
        console.log(`  생성 "${gd.name}" (id=${group.id})`);
      } else {
        console.log(`  기존 "${gd.name}" (id=${group.id})`);
      }
      createdGroups.push(group);

      // group_members
      for (const midx of gd.memberIdxs) {
        const user = createdUsers[midx];
        const role = midx === gd.ownerIdx ? 'OWNER' : 'MEMBER';
        const existing = await memberRepo.findOne({
          where: { groupId: group.id, userId: user.id },
        });
        if (!existing) {
          await memberRepo.save(
            memberRepo.create({ groupId: group.id, userId: user.id, role, uploadCount: 0 }),
          );
        }
      }
    }

    // -- photos --
    console.log('[step-g] photos INSERT...');
    const photoRepo = ds.getRepository(Photo);
    /** groupIdx (0-based) → Photo[] */
    const createdPhotos: Photo[][] = [[], [], [], []];

    for (let gi = 0; gi < 3; gi++) {
      const group = createdGroups[gi];
      const photoPaths = groupPhotoPaths[gi];
      const memberIdxs =
        gi === 0
          ? GROUP_MEMBERS.group1
          : gi === 1
          ? GROUP_MEMBERS.group2
          : GROUP_MEMBERS.group3;

      for (let pi = 0; pi < photoPaths.length; pi++) {
        const localPath = photoPaths[pi];
        const fileName = path.basename(localPath);
        const uploaderIdx = memberIdxs[pi % memberIdxs.length];
        const uploader = createdUsers[uploaderIdx];

        let photo = await photoRepo.findOne({
          where: { groupId: group.id, originalFilename: fileName },
        });
        if (!photo) {
          console.log(`  처리+업로드 ${fileName} (sharp 3x → Supabase)...`);
          const processed = await processAndUploadPhoto(localPath, group.id);

          photo = await photoRepo.save(
            photoRepo.create({
              groupId: group.id,
              uploaderId: uploader.id,
              filename: processed.filename,  // ← URL이 아니라 파일명만
              originalFilename: fileName,
              mimetype: 'image/webp',
              size: processed.size,
              chapter: pi < Math.floor(photoPaths.length / 2) ? '1부' : '2부',
              width: processed.width,
              height: processed.height,
            }),
          );
        }
        createdPhotos[gi].push(photo);
      }
      console.log(`  모임${gi + 1} 사진 ${createdPhotos[gi].length}장 완료`);
    }

    // -- group cover image (각 그룹 첫 사진을 1600x900 webp로 합성해서 업로드) --
    console.log('[step-g] group cover image 업로드...');
    {
      const sharp = (await import('sharp')).default;
      for (let gi = 0; gi < 3; gi++) {
        const group = createdGroups[gi];
        if (group.coverImage) {
          console.log(`  모임${gi + 1} 커버 기존 — 스킵`);
          continue;
        }
        const photoPaths = groupPhotoPaths[gi];
        if (!photoPaths || photoPaths.length === 0) continue;
        const sourcePath = photoPaths[0];
        try {
          const srcBuf = fs.readFileSync(sourcePath);
          const coverBuf = await sharp(srcBuf)
            .rotate()
            .resize(1600, 900, { fit: 'cover', position: 'attention' })
            .webp({ quality: 85 })
            .toBuffer();
          const coverUrl = await uploadFile(
            coverBuf,
            `groups/${group.id}/cover.webp`,
            'image/webp',
          );
          group.coverImage = coverUrl;
          await groupRepo.save(group);
          console.log(`  모임${gi + 1} 커버 업로드 완료`);
        } catch (err) {
          console.warn(`  모임${gi + 1} 커버 실패: ${(err as Error).message}`);
        }
      }
    }

    // -- photo_faces + user_face_anchors + samples (모임③만) --
    const photoFaceRepo = ds.getRepository(PhotoFace);
    const anchorRepo = ds.getRepository(UserFaceAnchor);
    const sampleRepo = ds.getRepository(UserFaceAnchorSample);

    /** personIdx → UserFaceAnchor */
    const createdAnchors: Map<number, UserFaceAnchor> = new Map();
    /** photoId → PhotoFace[] */
    const photoFacesByPhotoId: Map<number, PhotoFace[]> = new Map();

    if (faceApiReady) {
      console.log('[step-g] photo_faces INSERT (모임③)...');
      const group3 = createdGroups[2];

      // photo_faces: 모임③ 사진들에서 얼굴 검출
      for (const photo of createdPhotos[2]) {
        const existing = await photoFaceRepo.findOne({ where: { photoId: photo.id } });
        if (existing) {
          const all = await photoFaceRepo.find({ where: { photoId: photo.id } });
          photoFacesByPhotoId.set(photo.id, all);
          continue;
        }
        try {
          const localPath = groupPhotoPaths[2].find((p) =>
            path.basename(p) === photo.originalFilename,
          );
          if (!localPath || !fs.existsSync(localPath)) continue;
          const buf = fs.readFileSync(localPath);
          const faces = await detectAll(buf);
          const saved: PhotoFace[] = [];
          for (const face of faces) {
            const pf = await photoFaceRepo.save(
              photoFaceRepo.create({
                photoId: photo.id,
                groupId: group3.id,
                embedding: face.embedding,
                bboxX: face.bbox.x,
                bboxY: face.bbox.y,
                bboxWidth: face.bbox.width,
                bboxHeight: face.bbox.height,
                confidence: face.confidence,
              }),
            );
            saved.push(pf);
          }
          if (saved.length > 0) {
            photoFacesByPhotoId.set(photo.id, saved);
          }
        } catch (err) {
          console.warn(`  얼굴 검출 실패 (photo=${photo.id}): ${(err as Error).message}`);
        }
      }

      // user_face_anchors + samples: 모임③ 멤버
      console.log('[step-g] user_face_anchors INSERT (모임③)...');
      for (const personIdx of GROUP_MEMBERS.group3) {
        const user = createdUsers[personIdx];
        const avgEmb = anchorAvgEmbeddings.get(personIdx);
        if (!avgEmb || avgEmb.length === 0) {
          console.warn(`  person[${personIdx}] 평균 임베딩 없음 — 스킵`);
          continue;
        }

        let anchor = await anchorRepo.findOne({
          where: { userId: user.id, groupId: group3.id },
        });
        if (!anchor) {
          anchor = await anchorRepo.save(
            anchorRepo.create({
              userId: user.id,
              groupId: group3.id,
              embedding: avgEmb,
              sampleCount: anchorEmbeddings.get(personIdx)?.length ?? 1,
              threshold: 0.6,
            }),
          );
        }
        createdAnchors.set(personIdx, anchor);

        // samples — anchor당 모든 샘플 저장 (기존: anchor에 샘플 1개라도 있으면 break → 1장만 저장되는 버그 수정)
        const samples = anchorEmbeddings.get(personIdx) ?? [];
        const anchorPaths3 = anchorPaths[personIdx];
        const existingSampleCount = await sampleRepo.count({ where: { anchorId: anchor.id } });
        if (existingSampleCount === 0) {
          for (let si = 0; si < samples.length; si++) {
            const localPath = anchorPaths3?.[si];
            let sourcePath: string | null = null;
            if (localPath) {
              const objectPath = `face-anchors/seed-person${personIdx}-${si}.jpg`;
              try {
                const buf = fs.readFileSync(localPath);
                await uploadFile(buf, objectPath, 'image/jpeg');
                sourcePath = objectPath;
              } catch (err) {
                console.warn(`  앵커 샘플 업로드 실패: ${(err as Error).message}`);
              }
            }
            await sampleRepo.save(
              sampleRepo.create({
                anchorId: anchor.id,
                embedding: samples[si].embedding,
                sourcePath,
                confidence: samples[si].confidence,
              }),
            );
          }
        }
        console.log(`  앵커 등록 person[${personIdx}] (id=${anchor.id}, 샘플=${samples.length}장)`);
      }
    }

    // -- cover_candidates + votes (모임①) --
    console.log('[step-g] cover_candidates + cover_votes INSERT (모임①)...');
    const candidateRepo = ds.getRepository(CoverCandidate);
    const voteRepo = ds.getRepository(CoverVote);
    const group1 = createdGroups[0];

    // Sweetbook defaults (표지 후보용)
    let sbDefaults: SbDefaults | null = null;
    if (!skipSweetbook) {
      try {
        const sb = createSweetbookClient();
        sbDefaults = await resolveSweetbookDefaults(sb);
      } catch (err) {
        console.warn(`  Sweetbook defaults 조회 실패 — 폴백값 사용: ${(err as Error).message}`);
      }
    }
    const fallbackTemplateUid = sbDefaults?.coverTemplateUid ?? 'tpl_default_cover';
    const fallbackBookSpecUid = sbDefaults?.bookSpecUid ?? 'SQUAREBOOK_HC';

    const candidateDefs = [
      {
        title: '봄날의 동창회',
        subtitle: '2026년 봄',
        photoIdx: 0,
        creatorIdx: 0,
      },
      {
        title: '우리들의 이야기',
        subtitle: '2026 동창회',
        photoIdx: 1,
        creatorIdx: 2,
      },
      {
        title: '따뜻한 봄날',
        subtitle: '소중한 친구들과',
        photoIdx: 2,
        creatorIdx: 3,
      },
    ];

    const createdCandidates: CoverCandidate[] = [];
    for (const cd of candidateDefs) {
      const photo = createdPhotos[0][cd.photoIdx];
      const creator = createdUsers[cd.creatorIdx];
      let candidate = await candidateRepo.findOne({
        where: { groupId: group1.id, creatorUserId: creator.id },
      });
      if (!candidate) {
        candidate = await candidateRepo.save(
          candidateRepo.create({
            groupId: group1.id,
            creatorUserId: creator.id,
            photoId: photo?.id ?? null,
            title: cd.title,
            subtitle: cd.subtitle,
            templateUid: fallbackTemplateUid,
            bookSpecUid: fallbackBookSpecUid,
            templateName: '기본 표지',
            theme: sbDefaults?.theme ?? 'default',
            params: photo ? { slot_0: photo.id } : {},
          }),
        );
      }
      createdCandidates.push(candidate);
    }

    // 투표 데이터: 후보0 → 3표, 후보1 → 2표, 후보2 → 2표
    const voteData = [
      { candidateIdx: 0, voterIdxs: [0, 2, 3] },
      { candidateIdx: 1, voterIdxs: [4, 5] },
      { candidateIdx: 2, voterIdxs: [2, 3] },
    ];
    for (const vd of voteData) {
      const candidate = createdCandidates[vd.candidateIdx];
      if (!candidate) continue;
      for (const voterIdx of vd.voterIdxs) {
        const voter = createdUsers[voterIdx];
        const existing = await voteRepo.findOne({
          where: { candidateId: candidate.id, userId: voter.id },
        });
        if (!existing) {
          await voteRepo.save(
            voteRepo.create({ candidateId: candidate.id, userId: voter.id }),
          );
        }
      }
    }
    console.log('  cover_candidates 3개, cover_votes 7표 완료');

    // ── h) Sweetbook API 호출 (모임②③ books) ──────────────────────────────────
    // match: books.service.ts:245 finalize() 전체 흐름과 1:1 매핑
    console.log('\n[step-h] Sweetbook book 생성 (모임②③)...');

    /** groupIdx → sweetbookBookUid */
    const sweetbookBookUids: Map<number, string> = new Map();
    /** groupIdx → uploadedFileNames[] (photo順, photoId 매핑용) */
    const sbUploadedFileNames: Map<number, string[]> = new Map();

    if (!skipSweetbook) {
      const sb = createSweetbookClient();
      if (!sbDefaults) {
        sbDefaults = await resolveSweetbookDefaults(sb);
      }

      for (const gi of [1, 2]) {
        // 모임② (gi=1) → EDITING 상태 유지, finalization 안 함
        // 모임③ (gi=2) → finalization 까지 수행
        const group = createdGroups[gi];
        const photos = createdPhotos[gi];
        const owner = createdUsers[gi === 1 ? 1 : 4];
        const idKey = `seed-book-g${group.id}-u${owner.id}-${Date.now()}`;

        try {
          // ── h-1. 책 생성 ──────────────────────────────────────────────────────
          const { bookUid } = await sb.createBook({
            title: group.name,
            bookSpecUid: sbDefaults.bookSpecUid,
            externalRef: `seed-group${group.id}`,
            idempotencyKey: idKey,
          });
          sweetbookBookUids.set(gi, bookUid);
          console.log(`  모임${gi + 1} bookUid=${bookUid}`);

          // ── h-2. 사진 업로드 (match: books.service.ts:390-411) ───────────────
          const fileNames: string[] = [];
          // photoId → uploadedFileName 매핑 (표지 fallback 등에 활용)
          const uploadedMap = new Map<number, string>();

          for (const photo of photos.slice(0, Math.min(photos.length, 20))) {
            const localPath = groupPhotoPaths[gi].find(
              (p) => path.basename(p) === photo.originalFilename,
            );
            if (!localPath || !fs.existsSync(localPath)) continue;
            const buf = fs.readFileSync(localPath);
            const { fileName } = await sb.uploadPhotoToBook(bookUid, buf, photo.originalFilename);
            fileNames.push(fileName);
            uploadedMap.set(photo.id, fileName);
          }
          sbUploadedFileNames.set(gi, fileNames);

          // fallback: 첫 번째 업로드된 파일명 (표지/빈내지 file 키가 비었을 때 사용)
          const fallbackFileName = fileNames[0] ?? '';

          // ── h-3. 표지 (match: books.service.ts:418-486) ─────────────────────
          // text 바인딩에 title/subtitle/dateRange 기본값 자동 채움
          // file 바인딩: 첫 번째 사진으로 채움 (사용자 지정 없으므로 fallback 사용)
          const coverParams = buildParams(
            sbDefaults.coverDefs,
            fallbackFileName,
            group.name,
            undefined,
            group.description ?? undefined,
          ) as Record<string, string>;
          // cover parameters는 string only (multi-file 없음) — addCover 시그니처 맞춤
          await sb.addCover(bookUid, {
            templateUid: sbDefaults.coverTemplateUid,
            parameters: coverParams,
          });
          console.log(`  모임${gi + 1} 표지 추가 완료`);

          // ── h-4. 내지 (match: books.service.ts:494-553) ──────────────────────
          // 사진당 1페이지, breakBefore: 'page' 고정 (match: books.service.ts:551)
          // multi-file binding(gallery/collage)은 배열로 전송 (match: books.service.ts:532-534)
          let contentPageCount = 0;
          for (const fileName of fileNames) {
            const contentParams = buildParams(
              sbDefaults.contentDefs,
              fileName,
              group.name,
              contentPageCount,
              group.description ?? undefined,
            );
            await sb.addContents(bookUid, {
              templateUid: sbDefaults.contentTemplateUid,
              parameters: contentParams,
              breakBefore: 'page', // match: books.service.ts:551 — 'true' 아님
            });
            contentPageCount++;
          }
          console.log(`  모임${gi + 1} 내지 ${contentPageCount}페이지 추가 완료`);

          // ── h-5. 빈내지 패딩 (match: books.service.ts:556-608) ───────────────
          // pageMin/pageMax/pageIncrement 충족을 위해 blank 페이지 추가
          const targetPageCount = calcTargetPageCount(
            contentPageCount,
            sbDefaults.pageMin,
            sbDefaults.pageMax,
            sbDefaults.pageIncrement,
          );
          console.log(
            `  모임${gi + 1} 페이지 수: 현재=${contentPageCount} → 목표=${targetPageCount} (min=${sbDefaults.pageMin} inc=${sbDefaults.pageIncrement})`,
          );

          if (targetPageCount > contentPageCount) {
            const blankParams = buildBlankParams(
              sbDefaults.blankDefs,
              fallbackFileName,
              group.name,
            );
            for (let i = contentPageCount; i < targetPageCount; i++) {
              await sb.addContents(bookUid, {
                templateUid: sbDefaults.blankTemplateUid,
                parameters: blankParams,
                breakBefore: 'page', // match: books.service.ts:605
              });
            }
            console.log(`  모임${gi + 1} 빈내지 ${targetPageCount - contentPageCount}페이지 패딩 완료`);
          }

          // ── h-6. finalization (모임③만) (match: books.service.ts:611-612) ────
          // 모임②는 EDITING 상태로 두기 위해 finalize 생략
          if (gi === 2) {
            console.log(
              `  모임③ finalization 직전 총 페이지 수: ${targetPageCount}`,
            );
            await sb.finalizeBook(bookUid);
            console.log(`  모임③ finalization 완료`);
          }
        } catch (err) {
          console.error(`  [!] 모임${gi + 1} Sweetbook 실패: ${(err as Error).message}`);
          throw err;
        }
      }
    } else {
      console.log('[step-h] --skip-sweetbook 플래그 — 건너뜀\n');
    }

    // ── i) books + book_pages + personal_book_matches INSERT ─────────────────
    console.log('\n[step-i] books + book_pages INSERT...');
    const bookRepo = ds.getRepository(Book);
    const pageRepo = ds.getRepository(BookPage);
    const matchRepo = ds.getRepository(PersonalBookMatch);

    // 모임② 공유 포토북 (EDITING — finalization 안 함)
    let book2: Book | null = null;
    {
      const group = createdGroups[1];
      const owner = createdUsers[1];
      let book = await bookRepo.findOne({ where: { groupId: group.id, bookType: 'SHARED' } });
      if (!book) {
        book = await bookRepo.save(
          bookRepo.create({
            groupId: group.id,
            title: group.name,
            subtitle: '3월 정모 기념',
            bookType: 'SHARED',
            ownerUserId: null,
            createdById: owner.id,
            bookSpecUid: sbDefaults?.bookSpecUid ?? 'SQUAREBOOK_HC',
            templateUid: sbDefaults?.contentTemplateUid ?? null,
            theme: sbDefaults?.theme ?? null,
            status: 'READY',
            sweetbookBookUid: sweetbookBookUids.get(1) ?? null,
            externalRef: `seed-group${group.id}`,
            coverPhotoId: createdPhotos[1][0]?.id ?? null,
            pageCount: createdPhotos[1].length,
            shareCode: null,
            isShared: false,
            coverTemplateUid: sbDefaults?.coverTemplateUid ?? null,
            coverParams: null,
          }),
        );
      }
      book2 = book;

      // book_pages
      const existingPages = await pageRepo.find({ where: { bookId: book.id } });
      if (existingPages.length === 0) {
        const fileNames = sbUploadedFileNames.get(1) ?? [];
        const group2 = createdGroups[1];
        for (let pi = 0; pi < createdPhotos[1].length; pi++) {
          const photo = createdPhotos[1][pi];
          const fn = fileNames[pi] ?? '';
          const tplParams =
            sbDefaults?.contentDefs && fn
              ? buildPageTemplateParams(
                  sbDefaults.contentDefs,
                  fn,
                  group2.name,
                  pi,
                  group2.description ?? undefined,
                )
              : fn
              ? { [sbDefaults?.contentBindingKey ?? 'photo']: fn }
              : null;
          await pageRepo.save(
            pageRepo.create({
              bookId: book.id,
              pageNumber: pi + 1,
              photoId: photo.id,
              chapterTitle: pi === 0 ? '등산 시작' : pi === 5 ? '정상 도착' : null,
              caption: null,
              contentTemplateUid: sbDefaults?.contentTemplateUid ?? null,
              templateParams: tplParams as unknown as Record<string, string> | null,
            }),
          );
        }
      }
      console.log(`  모임② 포토북 id=${book.id} (${createdPhotos[1].length}페이지)`);
    }

    // 모임③ 공유 포토북 (ORDERED — finalization 완료)
    let book3: Book | null = null;
    {
      const group = createdGroups[2];
      const owner = createdUsers[4];
      let book = await bookRepo.findOne({ where: { groupId: group.id, bookType: 'SHARED' } });
      if (!book) {
        book = await bookRepo.save(
          bookRepo.create({
            groupId: group.id,
            title: group.name,
            subtitle: '봄 제주 여행',
            bookType: 'SHARED',
            ownerUserId: null,
            createdById: owner.id,
            bookSpecUid: sbDefaults?.bookSpecUid ?? 'SQUAREBOOK_HC',
            templateUid: sbDefaults?.contentTemplateUid ?? null,
            theme: sbDefaults?.theme ?? null,
            status: 'ORDERED',
            sweetbookBookUid: sweetbookBookUids.get(2) ?? null,
            externalRef: `seed-group${group.id}`,
            coverPhotoId: createdPhotos[2][0]?.id ?? null,
            pageCount: createdPhotos[2].length,
            shareCode: null,
            isShared: false,
            coverTemplateUid: sbDefaults?.coverTemplateUid ?? null,
            coverParams: null,
          }),
        );
      }
      book3 = book;

      // book_pages
      const existingPages = await pageRepo.find({ where: { bookId: book.id } });
      if (existingPages.length === 0) {
        const fileNames = sbUploadedFileNames.get(2) ?? [];
        const group3Def = createdGroups[2];
        for (let pi = 0; pi < createdPhotos[2].length; pi++) {
          const photo = createdPhotos[2][pi];
          const fn = fileNames[pi] ?? '';
          const tplParams =
            sbDefaults?.contentDefs && fn
              ? buildPageTemplateParams(
                  sbDefaults.contentDefs,
                  fn,
                  group3Def.name,
                  pi,
                  group3Def.description ?? undefined,
                )
              : fn
              ? { [sbDefaults?.contentBindingKey ?? 'photo']: fn }
              : null;
          await pageRepo.save(
            pageRepo.create({
              bookId: book.id,
              pageNumber: pi + 1,
              photoId: photo.id,
              chapterTitle: pi === 0 ? '제주 도착' : pi === 10 ? '한라산' : null,
              caption: null,
              contentTemplateUid: sbDefaults?.contentTemplateUid ?? null,
              templateParams: tplParams as unknown as Record<string, string> | null,
            }),
          );
        }
      }
      console.log(`  모임③ 포토북 id=${book.id} (${createdPhotos[2].length}페이지)`);
    }

    // 모임③ 개인 포토북 (PERSONAL, READY_TO_REVIEW) — 얼굴 인식 결과 기반
    if (faceApiReady && book3) {
      console.log('[step-i] 개인 포토북 + personal_book_matches INSERT...');
      const group3 = createdGroups[2];
      const THRESHOLD = 0.72;

      // ── 디버그: 매칭 결과 표 출력 ──────────────────────────────────────────
      {
        const allFacesDebug: PhotoFace[] = [];
        for (const [, faces] of photoFacesByPhotoId) allFacesDebug.push(...faces);

        const memberIdxs = GROUP_MEMBERS.group3;
        const memberNames = memberIdxs.map((idx) => PERSONS[idx].name.replace(/\s/g, ''));

        console.log(`\n[debug] 개인 포토북 매칭 결과 (threshold=${THRESHOLD})`);
        // 헤더
        const header = `| photoId | ${memberNames.map((n) => n.padEnd(8)).join(' | ')} |`;
        const divider = `|---------|${memberNames.map(() => '---------|').join('')}`;
        console.log(header);
        console.log(divider);

        const memberMatchCounts: Record<number, number> = {};
        for (const idx of memberIdxs) memberMatchCounts[idx] = 0;

        for (const photo of createdPhotos[2]) {
          const faces = photoFacesByPhotoId.get(photo.id) ?? [];
          const cols = memberIdxs.map((personIdx) => {
            const anchor = createdAnchors.get(personIdx);
            if (!anchor || faces.length === 0) return '  -     ';
            const best = faces.reduce<number>((max, face) => {
              const sim = cosineSimilarity(anchor.embedding, face.embedding);
              return sim > max ? sim : max;
            }, 0);
            const matched = best >= THRESHOLD;
            if (matched) memberMatchCounts[personIdx]++;
            return `${best.toFixed(2)}${matched ? '✓' : ' '}`.padEnd(8);
          });
          const photoIdStr = String(photo.id).padStart(7);
          console.log(`|${photoIdStr}  | ${cols.join(' | ')} |`);
        }

        const summaryParts = memberIdxs.map(
          (idx) => `${PERSONS[idx].name}=${memberMatchCounts[idx]}장`,
        );
        console.log(`\n요약: ${summaryParts.join(', ')}\n`);
      }

      for (const personIdx of GROUP_MEMBERS.group3) {
        const user = createdUsers[personIdx];
        const anchor = createdAnchors.get(personIdx);
        if (!anchor) {
          console.warn(`  person[${personIdx}] 앵커 없음 — 개인 포토북 스킵`);
          continue;
        }

        // 매칭: anchor.embedding vs photo_faces.embedding
        const allFaces: PhotoFace[] = [];
        for (const [, faces] of photoFacesByPhotoId) {
          allFaces.push(...faces);
        }

        const matched = new Map<number, { similarity: number; faceId: number }>();
        for (const face of allFaces) {
          const sim = cosineSimilarity(anchor.embedding, face.embedding);
          if (sim >= THRESHOLD) {
            const prev = matched.get(face.photoId);
            if (!prev || sim > prev.similarity) {
              matched.set(face.photoId, { similarity: sim, faceId: face.id });
            }
          }
        }

        const matchedPhotoIds = Array.from(matched.keys());
        // MIN_PAGES 체크 (서비스 코드는 12이지만 시드에서는 1도 허용)
        if (matchedPhotoIds.length === 0) {
          console.warn(`  person[${personIdx}] 매칭 사진 0장 — 개인 포토북 스킵`);
          continue;
        }

        let personalBook = await bookRepo.findOne({
          where: { groupId: group3.id, ownerUserId: user.id, bookType: 'PERSONAL' },
        });
        if (!personalBook) {
          const externalRef = `personal-${group3.id}-${user.id}-seed`;
          personalBook = await bookRepo.save(
            bookRepo.create({
              groupId: group3.id,
              title: `${user.name}의 포토북`,
              bookType: 'PERSONAL',
              ownerUserId: user.id,
              createdById: user.id,
              bookSpecUid: sbDefaults?.bookSpecUid ?? 'SQUAREBOOK_HC',
              theme: sbDefaults?.theme ?? null,
              status: 'READY_TO_REVIEW',
              sweetbookBookUid: null,
              externalRef,
              coverPhotoId: null,
              pageCount: 0,
              shareCode: null,
              isShared: false,
              coverTemplateUid: null,
              coverParams: null,
            }),
          );
        }

        // personal_book_matches
        const existingMatches = await matchRepo.find({ where: { bookId: personalBook.id } });
        if (existingMatches.length === 0) {
          for (const [photoId, info] of matched) {
            await matchRepo.save(
              matchRepo.create({
                bookId: personalBook.id,
                photoId,
                photoFaceId: info.faceId,
                similarity: info.similarity,
                excludedByUser: false,
              }),
            );
          }

        }
        console.log(
          `  person[${personIdx}] 개인 포토북 id=${personalBook.id}, 매칭=${matchedPhotoIds.length}장`,
        );
      }
    }

    // ── j) Sweetbook 주문 (모임③) ─────────────────────────────────────────────
    console.log('\n[step-j] Sweetbook 주문 생성 (모임③)...');

    let orderUid1: string | null = null;
    let orderUid2: string | null = null;
    let estimatedPrice: number | null = null;

    if (!skipSweetbook && book3 && book3.sweetbookBookUid) {
      const sb = createSweetbookClient();
      try {
        // 충전금 확보
        await sb.sandboxCharge(200000);
        console.log('  sandbox 충전 200,000원 완료');

        // 견적
        const estimate = await sb.estimateOrder([
          { bookUid: book3.sweetbookBookUid, quantity: 1 },
        ]);
        estimatedPrice = (estimate as { totalPrice?: number }).totalPrice ?? null;
        console.log(`  견적: ${estimatedPrice}원`);

        // 주문 1 (PAID)
        const ikey1 = `order-${book3.id}-${createdUsers[4].id}-${Date.now()}`;
        const ord1 = await sb.createOrder({
          items: [{ bookUid: book3.sweetbookBookUid, quantity: 1 }],
          shipping: {
            recipientName: createdUsers[4].name,
            recipientPhone: '010-1234-5678',
            postalCode: '04524',
            address1: '서울특별시 중구 세종대로 110',
            address2: '101호',
            memo: '부재 시 경비실 맡겨주세요',
          },
          externalRef: `seed-order1-group${book3.groupId}`,
          idempotencyKey: ikey1,
        });
        orderUid1 = ord1.orderUid;
        console.log(`  주문1 orderUid=${orderUid1} (PAID)`);

        // 주문 2 (SHIPPED 예정 — 두 번째 주문)
        const ikey2 = `order-${book3.id}-${createdUsers[5].id}-${Date.now() + 1}`;
        const ord2 = await sb.createOrder({
          items: [{ bookUid: book3.sweetbookBookUid, quantity: 1 }],
          shipping: {
            recipientName: createdUsers[5].name,
            recipientPhone: '010-9876-5432',
            postalCode: '06236',
            address1: '서울특별시 강남구 테헤란로 152',
            address2: '강남파이낸스센터 15층',
          },
          externalRef: `seed-order2-group${book3.groupId}`,
          idempotencyKey: ikey2,
        });
        orderUid2 = ord2.orderUid;
        console.log(`  주문2 orderUid=${orderUid2} (SHIPPED 예정)`);
      } catch (err) {
        console.error(`  [!] 주문 생성 실패: ${(err as Error).message}`);
        throw err;
      }
    } else {
      console.log('[step-j] 스킵 (skip-sweetbook 또는 book3 없음)\n');
    }

    // ── k) order_groups + orders INSERT ───────────────────────────────────────
    console.log('\n[step-k] order_groups + orders INSERT...');
    const orderGroupRepo = ds.getRepository(OrderGroup);
    const orderRepo = ds.getRepository(Order);

    let orderGroup: OrderGroup | null = null;
    if (book3) {
      let og = await orderGroupRepo.findOne({ where: { bookId: book3.id } });
      if (!og) {
        og = await orderGroupRepo.save(
          orderGroupRepo.create({
            bookId: book3.id,
            groupId: book3.groupId,
            initiatedBy: createdUsers[4].id,
            estimatedPrice,
            status: 'ORDERED',
          }),
        );
      }
      orderGroup = og;

      // 주문 1: PAID
      const ikey1 = orderUid1
        ? `order-${book3.id}-${createdUsers[4].id}-seed1`
        : `seed-order1-${Date.now()}`;
      let order1 = await orderRepo.findOne({ where: { idempotencyKey: ikey1 } });
      if (!order1 && !orderUid1) {
        // sweetbook 스킵 시에도 DB 레코드 생성
        order1 = await orderRepo.save(
          orderRepo.create({
            orderGroupId: og.id,
            ordererId: createdUsers[4].id,
            status: 'PAID',
            sweetbookOrderUid: null,
            idempotencyKey: ikey1,
            quantity: 1,
            recipientName: createdUsers[4].name,
            recipientPhone: '010-1234-5678',
            recipientAddress: '서울특별시 중구 세종대로 110',
            recipientZipCode: '04524',
            recipientAddressDetail: '101호',
            memo: '부재 시 경비실 맡겨주세요',
            totalPrice: estimatedPrice,
            orderedAt: new Date(),
          }),
        );
      } else if (!order1 && orderUid1) {
        order1 = await orderRepo.save(
          orderRepo.create({
            orderGroupId: og.id,
            ordererId: createdUsers[4].id,
            status: 'PAID',
            sweetbookOrderUid: orderUid1,
            idempotencyKey: ikey1,
            quantity: 1,
            recipientName: createdUsers[4].name,
            recipientPhone: '010-1234-5678',
            recipientAddress: '서울특별시 중구 세종대로 110',
            recipientZipCode: '04524',
            recipientAddressDetail: '101호',
            memo: '부재 시 경비실 맡겨주세요',
            totalPrice: estimatedPrice,
            orderedAt: new Date(),
          }),
        );
      }

      // 주문 2: SHIPPED
      const ikey2 = orderUid2
        ? `order-${book3.id}-${createdUsers[5].id}-seed2`
        : `seed-order2-${Date.now()}`;
      let order2 = await orderRepo.findOne({ where: { idempotencyKey: ikey2 } });
      if (!order2) {
        order2 = await orderRepo.save(
          orderRepo.create({
            orderGroupId: og.id,
            ordererId: createdUsers[5].id,
            status: 'SHIPPED',
            sweetbookOrderUid: orderUid2,
            idempotencyKey: ikey2,
            quantity: 1,
            recipientName: createdUsers[5].name,
            recipientPhone: '010-9876-5432',
            recipientAddress: '서울특별시 강남구 테헤란로 152',
            recipientZipCode: '06236',
            recipientAddressDetail: '강남파이낸스센터 15층',
            memo: null,
            totalPrice: estimatedPrice,
            orderedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            trackingNumber: 'CJ1234567890',
            carrierCode: 'cjlogistics',
            shippedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          }),
        );
      }
      console.log(`  order_group id=${og.id}, 주문 2건 완료`);
    }

    // ── l) notifications + group_activities ────────────────────────────────────
    console.log('\n[step-l] notifications + group_activities INSERT...');
    const notifRepo = ds.getRepository(Notification);
    const activityRepo = ds.getRepository(GroupActivity);

    // 알림 샘플
    const notifDefs = [
      {
        userId: createdUsers[0].id,
        groupId: createdGroups[0].id,
        type: 'UPLOAD_REMINDER',
        title: '사진 업로드를 잊지 마세요!',
        message: `"${createdGroups[0].name}" 마감까지 3일 남았어요.`,
      },
      {
        userId: createdUsers[2].id,
        groupId: createdGroups[0].id,
        type: 'COVER_VOTE_STARTED',
        title: '표지 투표가 시작되었어요',
        message: `"${createdGroups[0].name}" 표지 후보 3개에 투표해주세요.`,
      },
      {
        userId: createdUsers[4].id,
        groupId: createdGroups[2].id,
        type: 'ORDER_SHIPPED',
        title: '포토북이 발송되었어요!',
        message: '운송장 번호: CJ1234567890 (CJ대한통운)',
      },
      {
        userId: createdUsers[5].id,
        groupId: createdGroups[2].id,
        type: 'ORDER_SHIPPED',
        title: '포토북이 발송되었어요!',
        message: '운송장 번호: CJ1234567890 (CJ대한통운)',
      },
      {
        userId: createdUsers[1].id,
        groupId: createdGroups[1].id,
        type: 'BOOK_READY',
        title: '포토북 초안이 완성되었어요',
        message: `"${createdGroups[1].name}" 포토북을 확인해보세요.`,
      },
    ];

    for (const nd of notifDefs) {
      const exists = await notifRepo.findOne({
        where: { userId: nd.userId, type: nd.type, groupId: nd.groupId },
      });
      if (!exists) {
        await notifRepo.save(notifRepo.create(nd));
      }
    }

    // 활동 로그
    const actDefs = [
      {
        groupId: createdGroups[0].id,
        actorUserId: createdUsers[0].id,
        type: 'PHOTO_UPLOADED' as const,
        payload: { photoCount: createdPhotos[0].length },
      },
      {
        groupId: createdGroups[0].id,
        actorUserId: createdUsers[2].id,
        type: 'COVER_VOTED' as const,
        payload: { candidateTitle: '봄날의 동창회' },
      },
      {
        groupId: createdGroups[1].id,
        actorUserId: createdUsers[1].id,
        type: 'BOOK_CREATED' as const,
        payload: { bookId: book2?.id },
      },
      {
        groupId: createdGroups[2].id,
        actorUserId: createdUsers[4].id,
        type: 'ORDER_PLACED' as const,
        payload: { orderCount: 2 },
      },
      {
        groupId: createdGroups[2].id,
        actorUserId: createdUsers[4].id,
        type: 'PHOTO_UPLOADED' as const,
        payload: { photoCount: createdPhotos[2].length },
      },
    ];

    for (const ad of actDefs) {
      await activityRepo.save(activityRepo.create(ad));
    }

    console.log(`  알림 ${notifDefs.length}건, 활동 ${actDefs.length}건 완료`);

    // ── m) 최종 요약 출력 ──────────────────────────────────────────────────────
    console.log('\n========================================');
    console.log('  시드 완료! 생성된 데이터 요약');
    console.log('========================================');
    console.log('\n[계정 목록]');
    console.log('  비밀번호: demo1234 (전원 동일)');
    for (const p of PERSONS) {
      const u = createdUsers[p.idx];
      console.log(`  ${p.email}  (${p.name}, id=${u.id})`);
    }
    console.log('\n[모임]');
    for (let gi = 0; gi < createdGroups.length; gi++) {
      const g = createdGroups[gi];
      const memberIdxs =
        gi === 0 ? GROUP_MEMBERS.group1
        : gi === 1 ? GROUP_MEMBERS.group2
        : gi === 2 ? GROUP_MEMBERS.group3
        : GROUP_MEMBERS.group4;
      const memberNames = memberIdxs.map((i) => PERSONS[i].name).join(', ');
      console.log(`  [${gi + 1}] "${g.name}" (id=${g.id}, status=${g.status})`);
      console.log(`      멤버: ${memberNames}`);
      console.log(`      사진: ${createdPhotos[gi]?.length ?? 0}장`);
    }
    console.log('\n[Sweetbook]');
    console.log(`  모임② bookUid: ${sweetbookBookUids.get(1) ?? '(스킵)'}`);
    console.log(`  모임③ bookUid: ${sweetbookBookUids.get(2) ?? '(스킵)'}`);
    console.log(`  주문1 orderUid: ${orderUid1 ?? '(스킵)'} (PAID)`);
    console.log(`  주문2 orderUid: ${orderUid2 ?? '(스킵)'} (SHIPPED)`);
    console.log('\n[진입 URL]');
    const feUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    console.log(`  로그인: ${feUrl}/login`);
    console.log(`  추천 계정: demo01@groupbook.test / demo1234`);
    console.log('\n========================================\n');

  } finally {
    await ds.destroy();
    console.log('[완료] DB 연결 종료');
  }
}

main().catch((err) => {
  console.error('\n[시드 실패]', err);
  process.exit(1);
});
