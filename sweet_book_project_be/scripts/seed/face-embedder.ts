/**
 * face-embedder.ts
 * face-api 로컬 추론 헬퍼. src/external/face-api/face-api.service.ts 와 동일한 패턴.
 */

import * as path from 'path';
import * as fs from 'fs';

// face-api + tfjs-node
import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs-node';
import { Canvas, Image, ImageData } from 'canvas';
import sharp from 'sharp';

export interface DetectedFace {
  embedding: number[];
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

let initialized = false;

export async function initFaceApi(): Promise<void> {
  if (initialized) return;

  const modelsDir =
    process.env.FACE_API_MODELS_DIR ||
    path.join(process.cwd(), 'models', 'face-api');

  if (!fs.existsSync(modelsDir)) {
    throw new Error(
      `face-api 모델 디렉토리가 없습니다: ${modelsDir}\n` +
        '  → scripts/download-face-models.sh 를 먼저 실행하세요.',
    );
  }

  // canvas monkey-patch (NestJS 서비스와 동일)
  (faceapi.env as unknown as { monkeyPatch: (opts: unknown) => void }).monkeyPatch(
    { Canvas, Image, ImageData },
  );

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsDir);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir);

  initialized = true;
  console.log(`[face-embedder] 모델 로드 완료 (${modelsDir})`);
}

export async function detectAll(buffer: Buffer): Promise<DetectedFace[]> {
  if (!initialized) await initFaceApi();

  const { data, info } = await sharp(buffer)
    .rotate()
    .removeAlpha()
    .toColorspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = tf.tensor3d(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    [info.height, info.width, 3],
    'int32',
  );

  try {
    const results = await faceapi
      .detectAllFaces(tensor as unknown as faceapi.TNetInput)
      .withFaceLandmarks()
      .withFaceDescriptors();

    return results.map((r) => ({
      embedding: Array.from(r.descriptor),
      bbox: {
        x: Math.round(r.detection.box.x),
        y: Math.round(r.detection.box.y),
        width: Math.round(r.detection.box.width),
        height: Math.round(r.detection.box.height),
      },
      confidence: r.detection.score,
    }));
  } finally {
    tensor.dispose();
  }
}

export async function detectSingle(buffer: Buffer): Promise<DetectedFace | null> {
  const faces = await detectAll(buffer);
  if (faces.length === 0) return null;
  if (faces.length > 1) {
    faces.sort(
      (a, b) => b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height,
    );
  }
  return faces[0];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function averageEmbedding(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0].length;
  const avg = new Array<number>(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) avg[i] += emb[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= embeddings.length;
  return avg;
}
