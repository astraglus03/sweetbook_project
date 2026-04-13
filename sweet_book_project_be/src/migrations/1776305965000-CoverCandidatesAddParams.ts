import { MigrationInterface, QueryRunner } from 'typeorm';

export class CoverCandidatesAddParams1776305965000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. params jsonb 컬럼 추가 (idempotent)
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ADD COLUMN IF NOT EXISTS "params" jsonb NOT NULL DEFAULT '{}'
    `);

    // 2. photoId nullable 전환 (NOT NULL 제약이 있을 경우만 제거)
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ALTER COLUMN "photoId" DROP NOT NULL
    `);

    // 3. title nullable 전환
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ALTER COLUMN "title" DROP NOT NULL
    `);

    // 4. 기존 데이터 백필: photoId + title + subtitle → params
    //    새 rows는 이미 params에 값이 있으므로 params = '{}' 인 것만 대상
    await queryRunner.query(`
      UPDATE "cover_candidates"
        SET "params" = jsonb_build_object(
          'slot_photo_0', "photoId",
          'title',        COALESCE("title", ''),
          'subtitle',     COALESCE("subtitle", '')
        )
        WHERE "params" = '{}' AND "photoId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // params 컬럼 제거
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        DROP COLUMN IF EXISTS "params"
    `);

    // photoId NOT NULL 복원 (기본값으로 0 설정 후 제약 추가)
    await queryRunner.query(`
      UPDATE "cover_candidates" SET "photoId" = 0 WHERE "photoId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ALTER COLUMN "photoId" SET NOT NULL
    `);

    // title NOT NULL 복원
    await queryRunner.query(`
      UPDATE "cover_candidates" SET "title" = '' WHERE "title" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ALTER COLUMN "title" SET NOT NULL
    `);
  }
}
