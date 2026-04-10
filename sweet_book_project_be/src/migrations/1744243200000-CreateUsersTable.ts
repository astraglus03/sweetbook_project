import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1744243200000 implements MigrationInterface {
  name = 'CreateUsersTable1744243200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" varchar NOT NULL,
        "passwordHash" varchar NULL,
        "name" varchar(100) NOT NULL,
        "avatarUrl" varchar NULL,
        "provider" varchar(20) NOT NULL DEFAULT 'local',
        "providerUserId" varchar NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_provider_lookup" ON "users" ("provider", "providerUserId");`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_provider_lookup";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
