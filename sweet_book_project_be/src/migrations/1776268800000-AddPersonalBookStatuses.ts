import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalBookStatuses1776268800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."books_status_enum" ADD VALUE IF NOT EXISTS 'AUTO_GENERATING'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."books_status_enum" ADD VALUE IF NOT EXISTS 'READY_TO_REVIEW'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres는 ENUM 값 제거를 지원하지 않으므로 no-op
  }
}
