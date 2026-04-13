import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceTemplateKindWithTemplateUid1776219565000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 새 컬럼 추가 (nullable로 먼저 추가 후 default로 채워서 NOT NULL 처리)
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ADD COLUMN IF NOT EXISTS "templateUid" character varying(50)
    `);

    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ADD COLUMN IF NOT EXISTS "bookSpecUid" character varying(50)
    `);

    // 기존 행에 기본값 채우기 (테스트 데이터 대비)
    await queryRunner.query(`
      UPDATE "cover_candidates"
        SET "templateUid" = 'CLASSIC',
            "bookSpecUid" = 'SQUAREBOOK_HC'
        WHERE "templateUid" IS NULL
    `);

    // NOT NULL 제약 추가
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ALTER COLUMN "templateUid" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ALTER COLUMN "bookSpecUid" SET NOT NULL
    `);

    // 기존 templateKind 컬럼 제거
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        DROP COLUMN IF EXISTS "templateKind"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ADD COLUMN IF NOT EXISTS "templateKind" character varying(20)
    `);

    await queryRunner.query(`
      UPDATE "cover_candidates"
        SET "templateKind" = 'CLASSIC'
        WHERE "templateKind" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ALTER COLUMN "templateKind" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        DROP COLUMN IF EXISTS "templateUid"
    `);

    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        DROP COLUMN IF EXISTS "bookSpecUid"
    `);
  }
}
