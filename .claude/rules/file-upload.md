# 파일 업로드 & 이미지 처리 규칙

## 업로드 검증 (Multer)

### 필수 검증 항목
```typescript
// multer 설정
{
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new ValidationException('지원하지 않는 파일 형식입니다'), false);
    }
    cb(null, true);
  },
}
```

### 검증 순서
1. MIME 타입 검증 (jpeg, png, webp만 허용)
2. 파일 크기 검증 (최대 10MB)
3. 확장자 검증 (MIME과 확장자 일치 여부)
4. 이미지 매직 바이트 검증 (파일 헤더로 실제 이미지 확인)

## 저장 경로 전략
```
uploads/
├── photos/
│   ├── original/     # 원본 (리사이징 전)
│   ├── large/        # 1200px (포토북 인쇄용)
│   ├── medium/       # 600px (갤러리 뷰)
│   └── thumbnail/    # 200px (목록 썸네일)
├── covers/           # 모임 커버 이미지
└── profiles/         # 프로필 이미지
```

### 파일명 규칙
- 원본 파일명 사용 금지 → UUID + 확장자 (`{uuid}.webp`)
- 경로 조합: `photos/original/{groupId}/{uuid}.webp`

## Sharp 이미지 처리 파이프라인

### 사진 업로드 시 자동 처리 (Bull Queue에서 비동기)
```typescript
async processPhoto(filePath: string, photoId: number) {
  const original = sharp(filePath);
  const metadata = await original.metadata();

  // 1. EXIF 방향 보정 + WebP 변환
  const base = original.rotate().webp({ quality: 85 });

  // 2. 리사이즈 변형 생성 (비율 유지)
  await Promise.all([
    base.clone().resize(1200, null, { withoutEnlargement: true })
      .toFile(`uploads/photos/large/${photoId}.webp`),
    base.clone().resize(600, null, { withoutEnlargement: true })
      .toFile(`uploads/photos/medium/${photoId}.webp`),
    base.clone().resize(200, 200, { fit: 'cover' })
      .toFile(`uploads/photos/thumbnail/${photoId}.webp`),
  ]);

  // 3. DB에 메타데이터 저장
  await this.photoRepository.update(photoId, {
    width: metadata.width,
    height: metadata.height,
    fileSize: metadata.size,
    processedAt: new Date(),
  });
}
```

### 프로필/커버 이미지
- 프로필: 200x200 center crop, WebP
- 커버: 800x400 center crop, WebP
- 원본 저장 불필요 — 크롭 버전만 저장

## Sweetbook 업로드 (2단계)
```
사용자 → 우리 서버 (Multer) → Sharp 처리 → 로컬 저장
                                            ↓ (Bull Queue)
                                    Sweetbook API 업로드
```
- 우리 서버에 먼저 저장 → 비동기로 Sweetbook에 재업로드
- Sweetbook 업로드 실패 시 재시도 (최대 3회)
- 재시도 실패 시 DB에 `sweetbookUploadStatus: 'FAILED'` 기록

## 정적 파일 서빙
- 개발: Express static middleware (`/uploads` 경로)
- 프로덕션: Nginx 또는 CDN으로 서빙 (Express에서 직접 서빙 금지)
- 캐시 헤더: `Cache-Control: public, max-age=31536000, immutable` (UUID 파일명이라 캐시 무효화 불필요)

## 보안
- 업로드 경로 traversal 방지: 파일명에 `../` 포함 시 거부
- 업로드 디렉토리는 실행 권한 제거
- 사진 접근 시 모임 멤버 여부 확인 (인가 체크)
- 원본 EXIF GPS 정보 제거 (개인정보 보호)
