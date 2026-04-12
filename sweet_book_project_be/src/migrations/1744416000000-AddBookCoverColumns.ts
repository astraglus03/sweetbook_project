import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookCoverColumns1744416000000 implements MigrationInterface {
  name = 'AddBookCoverColumns1744416000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "books"
      ADD COLUMN "coverTemplateUid" varchar NULL,
      ADD COLUMN "coverParams" json NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "books"
      DROP COLUMN "coverParams",
      DROP COLUMN "coverTemplateUid"
    `);
  }
}
