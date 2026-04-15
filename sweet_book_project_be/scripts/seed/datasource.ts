/**
 * datasource.ts
 * TypeORM DataSource 생성 — NestJS 없이 standalone 실행.
 * --target=local  → .env 로드
 * --target=production → .env.production 로드
 */

import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// ── 엔티티 명시적 import (glob 피함) ──────────────────────────────
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

export const ALL_ENTITIES = [
  User,
  Group,
  GroupMember,
  Photo,
  PhotoFace,
  UserFaceAnchor,
  UserFaceAnchorSample,
  Book,
  BookPage,
  PersonalBookMatch,
  Order,
  OrderGroup,
  Notification,
  GroupActivity,
  CoverCandidate,
  CoverVote,
];

export function loadEnv(target: 'local' | 'production'): void {
  const envFile =
    target === 'production'
      ? path.join(process.cwd(), '.env.production')
      : path.join(process.cwd(), '.env');
  const result = dotenv.config({ path: envFile });
  if (result.error) {
    throw new Error(`환경파일 로드 실패: ${envFile}\n${result.error.message}`);
  }
  console.log(`[datasource] 환경파일 로드: ${envFile}`);
}

export function createSeedDataSource(): DataSource {
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  const username = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !username || !password || !database) {
    throw new Error(
      '환경변수 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME 이 필요합니다.',
    );
  }

  return new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: ALL_ENTITIES,
    synchronize: false,
    logging: false,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
}
