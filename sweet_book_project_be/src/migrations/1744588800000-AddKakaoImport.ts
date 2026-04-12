import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKakaoImport1744588800000 implements MigrationInterface {
  name = 'AddKakaoImport1744588800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // photos: uploaderId nullable + kakaoName 컬럼 추가
    await queryRunner.query(`ALTER TABLE "photos" ALTER COLUMN "uploaderId" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "kakaoName" varchar(100)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_photos_kakao_name" ON "photos" ("groupId", "kakaoName")`,
    );

    // kakao_name_mappings 테이블
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kakao_name_mappings" (
        "id" SERIAL PRIMARY KEY,
        "groupId" integer NOT NULL,
        "kakaoName" varchar(100) NOT NULL,
        "userId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_kakao_mapping_group" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_kakao_mapping_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_kakao_mapping_group_name" ON "kakao_name_mappings" ("groupId", "kakaoName")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "kakao_name_mappings"`);
    await queryRunner.query(`DROP INDEX "idx_photos_kakao_name"`);
    await queryRunner.query(`ALTER TABLE "photos" DROP COLUMN "kakaoName"`);
    await queryRunner.query(`ALTER TABLE "photos" ALTER COLUMN "uploaderId" SET NOT NULL`);
  }
}
