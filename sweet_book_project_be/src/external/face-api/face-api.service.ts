import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as faceapi from '@vladmandic/face-api';
import '@tensorflow/tfjs-node';
import { Canvas, Image, ImageData, loadImage } from 'canvas';

type FaceInput = string | Buffer;

export interface DetectedFace {
  embedding: number[];
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

@Injectable()
export class FaceApiService implements OnModuleInit {
  private readonly logger = new Logger(FaceApiService.name);
  private initialized = false;
  private modelsDir: string;

  constructor(private readonly configService: ConfigService) {
    this.modelsDir = this.configService.get<string>(
      'FACE_API_MODELS_DIR',
      path.join(process.cwd(), 'models', 'face-api'),
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.init();
    } catch (error) {
      this.logger.warn(
        `FaceApi 초기화 실패 (모델 미설치?): ${(error as Error).message}. ` +
          '개인 포토북 기능 사용 전 models/face-api/ 에 모델을 내려받으세요.',
      );
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    (
      faceapi.env as unknown as { monkeyPatch: (opts: unknown) => void }
    ).monkeyPatch({ Canvas, Image, ImageData });

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelsDir);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsDir);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsDir);

    this.initialized = true;
    this.logger.log(`FaceApi 초기화 완료 (models: ${this.modelsDir})`);
  }

  isReady(): boolean {
    return this.initialized;
  }

  async detectAll(input: FaceInput): Promise<DetectedFace[]> {
    if (!this.initialized) await this.init();

    const img = await loadImage(input);
    const results = await faceapi
      .detectAllFaces(img as unknown as faceapi.TNetInput)
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
  }

  async detectSingle(input: FaceInput): Promise<DetectedFace | null> {
    const faces = await this.detectAll(input);
    if (faces.length === 0) return null;
    if (faces.length > 1) {
      faces.sort(
        (a, b) => b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height,
      );
    }
    return faces[0];
  }

  cosineSimilarity(a: number[], b: number[]): number {
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

  averageEmbedding(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    const dim = embeddings[0].length;
    const avg = new Array<number>(dim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) avg[i] += emb[i];
    }
    for (let i = 0; i < dim; i++) avg[i] /= embeddings.length;
    return avg;
  }
}
