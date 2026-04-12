import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookCoverColumns1744416000000 implements MigrationInterface {
  name = 'AddBookCoverColumns1744416000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "coverTemplateUid" varchar NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "coverParams" json NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "books"
      DROP COLUMN "coverParams",
      DROP COLUMN "coverTemplateUid"
    `);
  }
}
