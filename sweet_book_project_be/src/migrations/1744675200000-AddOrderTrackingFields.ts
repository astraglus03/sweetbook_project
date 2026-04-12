import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderTrackingFields1744675200000 implements MigrationInterface {
  name = 'AddOrderTrackingFields1744675200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingNumber" varchar(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "carrierCode" varchar(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "expectedPrintDate" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shippedAt" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveredAt" timestamp`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "deliveredAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippedAt"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "expectedPrintDate"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "carrierCode"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "trackingNumber"`);
  }
}
