#!/usr/bin/env node
/* eslint-disable */
/**
 * 개인 포토북 기능 테스트용 더미 데이터셋 생성 스크립트.
 *
 * 산출물 (test-data/):
 *   - person-a-anchor.zip   (5장, 동일 인물 A의 변형)
 *   - person-b-anchor.zip   (5장, 동일 인물 B의 변형)
 *   - group-photos.zip      (50장: A 솔로 10, B 솔로 10, A+B 단체 10,
 *                                  외부인 얼굴 5, 풍경/얼굴없음 15)
 *
 * 사용법:
 *   cd sweet_book_project_be
 *   node scripts/generate-test-dataset.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', '..', 'test-data');
const TMP_DIR = path.join(OUT_DIR, '_tmp');

const PERSON_A_URL = 'https://randomuser.me/api/portraits/men/32.jpg';
const PERSON_B_URL = 'https://randomuser.me/api/portraits/women/45.jpg';
const OTHER_FACES = [
  'https://randomuser.me/api/portraits/men/5.jpg',
  'https://randomuser.me/api/portraits/women/12.jpg',
  'https://randomuser.me/api/portraits/men/77.jpg',
  'https://randomuser.me/api/portraits/women/63.jpg',
  'https://randomuser.me/api/portraits/men/89.jpg',
];

function downloadCurl(url, dest) {
  execSync(`curl -fsSL "${url}" -o "${dest}"`, { stdio: 'inherit' });
}

function zip(folder, outputZip) {
  const rel = path.relative(path.dirname(outputZip), folder);
  execSync(`cd "${path.dirname(outputZip)}" && zip -qrj "${path.basename(outputZip)}" "${folder}"`, {
    stdio: 'inherit',
  });
}

async function makeAnchorVariants(sourceBuf, outDir, prefix) {
  fs.mkdirSync(outDir, { recursive: true });
  for (let i = 0; i < 5; i++) {
    const rotate = (i - 2) * 2;
    const brightness = 0.9 + i * 0.05;
    const quality = 78 + i * 4;
    await sharp(sourceBuf)
      .rotate(rotate, { background: '#ffffff' })
      .modulate({ brightness })
      .resize(600, 600, { fit: 'cover' })
      .jpeg({ quality })
      .toFile(path.join(outDir, `${prefix}_${i + 1}.jpg`));
  }
}

async function compositeGroup(bgBuf, faceBufs, outPath) {
  const bgResized = await sharp(bgBuf).resize(1200, 800, { fit: 'cover' }).toBuffer();

  const composites = [];
  const slotXs = [150, 550, 900];
  for (let i = 0; i < faceBufs.length; i++) {
    const faceResized = await sharp(faceBufs[i])
      .resize(280, 280, { fit: 'cover' })
      .toBuffer();
    composites.push({
      input: faceResized,
      left: slotXs[i] ?? 200,
      top: 260,
    });
  }

  await sharp(bgResized).composite(composites).jpeg({ quality: 85 }).toFile(outPath);
}

async function soloShot(faceBuf, bgBuf, outPath, { zoom = 1.0, offsetX = 0 } = {}) {
  const bgResized = await sharp(bgBuf).resize(900, 900, { fit: 'cover' }).toBuffer();
  const size = Math.round(500 * zoom);
  const face = await sharp(faceBuf).resize(size, size, { fit: 'cover' }).toBuffer();
  await sharp(bgResized)
    .composite([{ input: face, left: 200 + offsetX, top: 200 }])
    .jpeg({ quality: 82 })
    .toFile(outPath);
}

async function scenery(picsumSeed, outPath) {
  const url = `https://picsum.photos/seed/${picsumSeed}/1000/700`;
  downloadCurl(url, outPath);
}

async function main() {
  console.log('📁 테스트 데이터셋 생성 시작...');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  // 1. 소스 얼굴/배경 다운로드
  console.log('⬇️  원본 이미지 다운로드...');
  const personAPath = path.join(TMP_DIR, 'personA.jpg');
  const personBPath = path.join(TMP_DIR, 'personB.jpg');
  downloadCurl(PERSON_A_URL, personAPath);
  downloadCurl(PERSON_B_URL, personBPath);

  const personABuf = fs.readFileSync(personAPath);
  const personBBuf = fs.readFileSync(personBPath);

  const otherFaceBufs = [];
  for (let i = 0; i < OTHER_FACES.length; i++) {
    const p = path.join(TMP_DIR, `other_${i}.jpg`);
    downloadCurl(OTHER_FACES[i], p);
    otherFaceBufs.push(fs.readFileSync(p));
  }

  // 배경 10장 (picsum)
  const bgBufs = [];
  for (let i = 1; i <= 10; i++) {
    const p = path.join(TMP_DIR, `bg_${i}.jpg`);
    downloadCurl(`https://picsum.photos/seed/bg${i}/1200/800`, p);
    bgBufs.push(fs.readFileSync(p));
  }

  // 2. Anchor 세트
  console.log('🎭 Person A/B 앵커 변형 생성...');
  const anchorADir = path.join(OUT_DIR, 'person-a-anchor');
  const anchorBDir = path.join(OUT_DIR, 'person-b-anchor');
  await makeAnchorVariants(personABuf, anchorADir, 'personA');
  await makeAnchorVariants(personBBuf, anchorBDir, 'personB');

  // 3. 그룹 사진 50장
  console.log('🖼️  그룹 사진 50장 생성...');
  const groupDir = path.join(OUT_DIR, 'group-photos');
  fs.mkdirSync(groupDir, { recursive: true });

  // 3-1. A 솔로 10장 (다양한 배경/줌)
  for (let i = 0; i < 10; i++) {
    const bg = bgBufs[i % bgBufs.length];
    await soloShot(personABuf, bg, path.join(groupDir, `01_solo_A_${i + 1}.jpg`), {
      zoom: 0.85 + (i % 4) * 0.1,
      offsetX: (i % 3) * 50,
    });
  }

  // 3-2. B 솔로 10장
  for (let i = 0; i < 10; i++) {
    const bg = bgBufs[(i + 3) % bgBufs.length];
    await soloShot(personBBuf, bg, path.join(groupDir, `02_solo_B_${i + 1}.jpg`), {
      zoom: 0.85 + (i % 4) * 0.1,
      offsetX: (i % 3) * 50,
    });
  }

  // 3-3. A + B 단체사진 10장
  for (let i = 0; i < 10; i++) {
    const bg = bgBufs[(i + 5) % bgBufs.length];
    const faces = [personABuf, personBBuf];
    if (i % 3 === 0 && otherFaceBufs.length > 0) {
      faces.push(otherFaceBufs[i % otherFaceBufs.length]);
    }
    await compositeGroup(bg, faces, path.join(groupDir, `03_group_AB_${i + 1}.jpg`));
  }

  // 3-4. 외부인 얼굴 5장 (A도 B도 아닌 얼굴)
  for (let i = 0; i < 5; i++) {
    const bg = bgBufs[(i + 1) % bgBufs.length];
    await soloShot(otherFaceBufs[i], bg, path.join(groupDir, `04_other_${i + 1}.jpg`));
  }

  // 3-5. 풍경/얼굴 없음 15장
  for (let i = 0; i < 15; i++) {
    await scenery(`scenery_${i}`, path.join(groupDir, `05_scenery_${i + 1}.jpg`));
  }

  // 4. zip
  console.log('📦 zip 파일 생성...');
  zip(anchorADir, path.join(OUT_DIR, 'person-a-anchor.zip'));
  zip(anchorBDir, path.join(OUT_DIR, 'person-b-anchor.zip'));
  zip(groupDir, path.join(OUT_DIR, 'group-photos.zip'));

  console.log('🧹 임시 파일 정리...');
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log('\n✅ 완료! 생성된 파일:');
  console.log(`   ${path.join(OUT_DIR, 'person-a-anchor.zip')} (얼굴 등록용 — Person A)`);
  console.log(`   ${path.join(OUT_DIR, 'person-b-anchor.zip')} (얼굴 등록용 — Person B)`);
  console.log(`   ${path.join(OUT_DIR, 'group-photos.zip')} (그룹 사진 50장)`);
  console.log('\n💡 사용 시나리오:');
  console.log('   1) 계정 2개로 가입 (Person A 계정 / Person B 계정)');
  console.log('   2) 같은 모임에 둘 다 참여');
  console.log('   3) group-photos.zip의 50장을 모임에 업로드 (카톡 import 또는 일반 업로드)');
  console.log('   4) Person A 계정 → 얼굴 등록에 person-a-anchor.zip 내 5장 업로드');
  console.log('   5) Person B 계정 → 얼굴 등록에 person-b-anchor.zip 내 5장 업로드');
  console.log('   6) 각자 "내 개인 포토북 만들기" → 본인이 포함된 사진만 필터링 되는지 확인');
  console.log('   7) 오탐 시 ✕ 버튼 → threshold 자동 조정 확인');
}

main().catch((err) => {
  console.error('❌ 실패:', err);
  process.exit(1);
});
