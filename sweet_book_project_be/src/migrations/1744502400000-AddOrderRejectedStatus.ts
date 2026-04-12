import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderRejectedStatus1744502400000 implements MigrationInterface {
  name = 'AddOrderRejectedStatus1744502400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. REJECTED 상태를 orders status enum에 추가
    await queryRunner.query(`
      ALTER TYPE "orders_status_enum"
      ADD VALUE IF NOT EXISTS 'REJECTED' AFTER 'PENDING'
    `);

    // 2. 배송 필드들을 nullable로 변경 (거절 시 배송 정보 없이 레코드 생성)
    await queryRunner.query(`
      ALTER TABLE "orders"
      ALTER COLUMN "recipientName" DROP NOT NULL,
      ALTER COLUMN "recipientPhone" DROP NOT NULL,
      ALTER COLUMN "recipientAddress" DROP NOT NULL,
      ALTER COLUMN "recipientZipCode" DROP NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 배송 필드 NOT NULL 복원 (REJECTED 레코드 먼저 삭제 필요)
    await queryRunner.query(`
      DELETE FROM "orders" WHERE "status" = 'REJECTED'
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ALTER COLUMN "recipientName" SET NOT NULL,
      ALTER COLUMN "recipientPhone" SET NOT NULL,
      ALTER COLUMN "recipientAddress" SET NOT NULL,
      ALTER COLUMN "recipientZipCode" SET NOT NULL
    `);

    // PostgreSQL에서는 enum 값 제거가 복잡하므로 생략
  }
}
