# BE 파일 업로드 & 이미지 처리

## Multer 검증
```typescript
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
1. MIME 타입 (jpeg, png, webp)
2. 파일 크기 (최대 10MB)
3. 확장자-MIME 일치
4. 매직 바이트 (파일 헤더)

## 저장 경로
```
uploads/
├── photos/{groupId}/
│   ├── original/    # 원본
│   ├── large/       # 1200px (인쇄용)
│   ├── medium/      # 600px (갤러리)
│   └── thumbnail/   # 200px (목록)
├── covers/          # 모임 커버
└── profiles/        # 프로필
```
- 파일명: `{uuid}.webp` (원본 파일명 사용 금지)

## Sharp 파이프라인 (Bull Queue 비동기)
```typescript
async processPhoto(filePath: string, photoId: number) {
  const base = sharp(filePath).rotate().webp({ quality: 85 });
  await Promise.all([
    base.clone().resize(1200, null, { withoutEnlargement: true }).toFile(`large/${photoId}.webp`),
    base.clone().resize(600, null, { withoutEnlargement: true }).toFile(`medium/${photoId}.webp`),
    base.clone().resize(200, 200, { fit: 'cover' }).toFile(`thumbnail/${photoId}.webp`),
  ]);
}
```
- 프로필: 200x200 center crop
- 커버: 800x400 center crop
- EXIF GPS 정보 제거 (개인정보)

## 정적 파일 서빙
- 개발: Express static (`/uploads`)
- 프로덕션: Nginx/CDN (Express 직접 서빙 금지)
