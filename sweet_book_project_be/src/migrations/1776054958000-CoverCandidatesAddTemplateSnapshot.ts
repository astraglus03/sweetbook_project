import { MigrationInterface, QueryRunner } from 'typeorm';

export class CoverCandidatesAddTemplateSnapshot1776054958000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        ADD COLUMN IF NOT EXISTS "templateName" varchar(120) NULL,
        ADD COLUMN IF NOT EXISTS "theme"         varchar(60)  NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cover_candidates"
        DROP COLUMN IF EXISTS "templateName",
        DROP COLUMN IF EXISTS "theme"
    `);
  }
}
