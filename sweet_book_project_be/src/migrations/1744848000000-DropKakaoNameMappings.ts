import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropKakaoNameMappings1744848000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "kakao_name_mappings"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kakao_name_mappings" (
        "id" SERIAL NOT NULL,
        "groupId" integer NOT NULL,
        "kakaoName" character varying(100) NOT NULL,
        "userId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kakao_name_mappings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_kakao_mapping_group_name"
      ON "kakao_name_mappings" ("groupId", "kakaoName")
    `);
  }
}
