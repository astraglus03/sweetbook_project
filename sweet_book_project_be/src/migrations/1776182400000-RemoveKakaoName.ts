import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveKakaoName1776182400000 implements MigrationInterface {
  name = 'RemoveKakaoName1776182400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_photos_kakao_name"`);
    await queryRunner.query(
      `ALTER TABLE "photos" DROP COLUMN IF EXISTS "kakaoName"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "photos" ADD COLUMN "kakaoName" character varying(100)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_photos_kakao_name" ON "photos" ("groupId", "kakaoName")`,
    );
  }
}
