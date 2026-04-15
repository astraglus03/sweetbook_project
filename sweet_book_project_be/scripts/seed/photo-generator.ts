/**
 * photo-generator.ts
 * 시드용 사진 파일을 로컬에 생성한다.
 *
 * 산출물:
 *   test-data/seed/anchors/{userIdx}/anchor_{0..4}.jpg  (8명 각 5장)
 *   test-data/seed/photos/group1/   10장 (단독·풍경)
 *   test-data/seed/photos/group2/   15장 (인물 포함)
 *   test-data/seed/photos/group3/   20장 (인물 포함, 얼굴 매칭 대상)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';
import { PERSONS, GROUP_MEMBERS } from './persons';

const BASE_DIR = path.join(process.cwd(), 'test-data', 'seed');
const TMP_DIR = path.join(BASE_DIR, '_tmp');

function curl(url: string, dest: string): void {
  execSync(`curl -fsSL --retry 3 --retry-delay 1 "${url}" -o "${dest}"`, {
    stdio: 'pipe',
  });
}

async function makeAnchorVariants(
  srcBuf: Buffer,
  outDir: string,
  prefix: string,
): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  for (let i = 0; i < 5; i++) {
    const rotate = (i - 2) * 3;
    const brightness = 0.88 + i * 0.06;
    const quality = 75 + i * 5;
    await sharp(srcBuf)
      .rotate(rotate, { background: '#ffffff' })
      .modulate({ brightness })
      .resize(600, 600, { fit: 'cover' })
      .jpeg({ quality })
      .toFile(path.join(outDir, `${prefix}_${i}.jpg`));
  }
}

async function compositeGroup(
  bgBuf: Buffer,
  faceBufs: Buffer[],
  outPath: string,
): Promise<void> {
  const bgResized = await sharp(bgBuf)
    .resize(1200, 800, { fit: 'cover' })
    .toBuffer();
  const slotXs = [120, 480, 860];
  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < faceBufs.length; i++) {
    const fb = await sharp(faceBufs[i])
      .resize(260, 260, { fit: 'cover' })
      .toBuffer();
    composites.push({ input: fb, left: slotXs[i] ?? 200, top: 270 });
  }
  await sharp(bgResized)
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(outPath);
}

async function soloShot(
  faceBuf: Buffer,
  bgBuf: Buffer,
  outPath: string,
  opts: { zoom?: number; offsetX?: number } = {},
): Promise<void> {
  const { zoom = 1.0, offsetX = 0 } = opts;
  const bgResized = await sharp(bgBuf)
    .resize(900, 900, { fit: 'cover' })
    .toBuffer();
  const size = Math.round(480 * zoom);
  const face = await sharp(faceBuf).resize(size, size, { fit: 'cover' }).toBuffer();
  await sharp(bgResized)
    .composite([{ input: face, left: 200 + offsetX, top: 210 }])
    .jpeg({ quality: 82 })
    .toFile(outPath);
}

async function scenery(seed: string, outPath: string): Promise<void> {
  curl(`https://picsum.photos/seed/${seed}/1000/700`, outPath);
}

export async function generatePhotos(): Promise<{
  anchorPaths: string[][];   // [personIdx][sampleIdx] → filePath
  groupPhotoPaths: string[][]; // [groupIdx (0-based)] → filePaths[]
}> {
  console.log('[photo-generator] 시작...');
  fs.mkdirSync(BASE_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  // ── 1. 소스 얼굴/배경 다운로드 ──────────────────────────────────
  console.log('[photo-generator] 인물 사진 다운로드 (8명)...');
  const personBufs: Buffer[] = [];
  for (const p of PERSONS) {
    const dest = path.join(TMP_DIR, `person_${p.idx}.jpg`);
    if (!fs.existsSync(dest)) {
      curl(p.portraitUrl, dest);
    }
    personBufs.push(fs.readFileSync(dest));
  }

  console.log('[photo-generator] 배경 이미지 다운로드 (15장)...');
  const bgBufs: Buffer[] = [];
  for (let i = 1; i <= 15; i++) {
    const dest = path.join(TMP_DIR, `bg_${i}.jpg`);
    if (!fs.existsSync(dest)) {
      curl(`https://picsum.photos/seed/seed${i * 7}/1200/800`, dest);
    }
    bgBufs.push(fs.readFileSync(dest));
  }

  // ── 2. 앵커 변형 (8명 × 5장) ───────────────────────────────────
  console.log('[photo-generator] 앵커 변형 생성 (8명 × 5장)...');
  const anchorPaths: string[][] = [];
  for (const p of PERSONS) {
    const outDir = path.join(BASE_DIR, 'anchors', String(p.idx));
    await makeAnchorVariants(personBufs[p.idx], outDir, `anchor`);
    const paths: string[] = [];
    for (let s = 0; s < 5; s++) {
      paths.push(path.join(outDir, `anchor_${s}.jpg`));
    }
    anchorPaths.push(paths);
  }

  // ── 3. 그룹 사진 생성 ─────────────────────────────────────────
  const groupPhotoPaths: string[][] = [];

  // 모임①: 10장 (단독·풍경) — 멤버 idx [0,2,3,4,5]
  {
    const gDir = path.join(BASE_DIR, 'photos', 'group1');
    fs.mkdirSync(gDir, { recursive: true });
    const paths: string[] = [];
    const members = GROUP_MEMBERS.group1;

    // 솔로 6장
    for (let i = 0; i < 6; i++) {
      const memberIdx = members[i % members.length];
      const outPath = path.join(gDir, `g1_solo_${i + 1}.jpg`);
      if (!fs.existsSync(outPath)) {
        await soloShot(personBufs[memberIdx], bgBufs[i % bgBufs.length], outPath, {
          zoom: 0.9 + (i % 3) * 0.08,
          offsetX: (i % 4) * 30,
        });
      }
      paths.push(outPath);
    }
    // 풍경 4장
    for (let i = 0; i < 4; i++) {
      const outPath = path.join(gDir, `g1_scenery_${i + 1}.jpg`);
      if (!fs.existsSync(outPath)) {
        await scenery(`g1bg${i}`, outPath);
      }
      paths.push(outPath);
    }
    groupPhotoPaths.push(paths);
    console.log(`[photo-generator] 모임① 사진 ${paths.length}장 완료`);
  }

  // 모임②: 15장 (인물 포함) — 멤버 idx [1,2,3,6]
  {
    const gDir = path.join(BASE_DIR, 'photos', 'group2');
    fs.mkdirSync(gDir, { recursive: true });
    const paths: string[] = [];
    const members = GROUP_MEMBERS.group2;

    // 솔로 8장
    for (let i = 0; i < 8; i++) {
      const memberIdx = members[i % members.length];
      const outPath = path.join(gDir, `g2_solo_${i + 1}.jpg`);
      if (!fs.existsSync(outPath)) {
        await soloShot(personBufs[memberIdx], bgBufs[(i + 3) % bgBufs.length], outPath, {
          zoom: 0.85 + (i % 4) * 0.08,
          offsetX: (i % 3) * 40,
        });
      }
      paths.push(outPath);
    }
    // 단체 4장
    for (let i = 0; i < 4; i++) {
      const faces = [
        personBufs[members[0]],
        personBufs[members[1]],
        personBufs[members[2 % members.length]],
      ];
      const outPath = path.join(gDir, `g2_group_${i + 1}.jpg`);
      if (!fs.existsSync(outPath)) {
        await compositeGroup(bgBufs[(i + 5) % bgBufs.length], faces, outPath);
      }
      paths.push(outPath);
    }
    // 풍경 3장
    for (let i = 0; i < 3; i++) {
      const outPath = path.join(gDir, `g2_scenery_${i + 1}.jpg`);
      if (!fs.existsSync(outPath)) {
        await scenery(`g2bg${i}`, outPath);
      }
      paths.push(outPath);
    }
    groupPhotoPaths.push(paths);
    console.log(`[photo-generator] 모임② 사진 ${paths.length}장 완료`);
  }

  // 모임③: 20장 (인물 포함 + 얼굴 매칭 대상) — 멤버 idx [4,5,7]
  {
    const gDir = path.join(BASE_DIR, 'photos', 'group3');
    fs.mkdirSync(gDir, { recursive: true });
    const paths: string[] = [];
    const members = GROUP_MEMBERS.group3; // [4, 5, 7]

    // 솔로 9장 (각 멤버 3장씩)
    for (let m = 0; m < members.length; m++) {
      for (let i = 0; i < 3; i++) {
        const outPath = path.join(gDir, `g3_solo_m${m}_${i + 1}.jpg`);
        if (!fs.existsSync(outPath)) {
          await soloShot(
            personBufs[members[m]],
            bgBufs[(m * 3 + i + 7) % bgBufs.length],
            outPath,
            { zoom: 0.88 + i * 0.07, offsetX: i * 35 },
          );
        }
        paths.push(outPath);
      }
    }
    // 단체 6장 (2인 or 3인 조합)
    for (let i = 0; i < 6; i++) {
      const faces =
        i % 2 === 0
          ? [personBufs[members[0]], personBufs[members[1]]]
          : [personBufs[members[0]], personBufs[members[1]], personBufs[members[2]]];
      const outPath = path.join(gDir, `g3_group_${i + 1}.jpg`);
      if (!fs.existsSync(outPath)) {
        await compositeGroup(bgBufs[(i + 9) % bgBufs.length], faces, outPath);
      }
      paths.push(outPath);
    }
    // 풍경 5장
    for (let i = 0; i < 5; i++) {
      const outPath = path.join(gDir, `g3_scenery_${i + 1}.jpg`);
      if (!fs.existsSync(outPath)) {
        await scenery(`g3bg${i}`, outPath);
      }
      paths.push(outPath);
    }
    groupPhotoPaths.push(paths);
    console.log(`[photo-generator] 모임③ 사진 ${paths.length}장 완료`);
  }

  // 모임④: 0장
  groupPhotoPaths.push([]);

  console.log('[photo-generator] 완료');
  return { anchorPaths, groupPhotoPaths };
}

// 직접 실행 시
if (process.argv[1] && process.argv[1].includes('photo-generator')) {
  generatePhotos()
    .then(({ anchorPaths, groupPhotoPaths }) => {
      console.log('앵커:', anchorPaths.map((a) => a.length));
      console.log('그룹 사진:', groupPhotoPaths.map((g) => g.length));
    })
    .catch((err) => {
      console.error('실패:', err);
      process.exit(1);
    });
}
