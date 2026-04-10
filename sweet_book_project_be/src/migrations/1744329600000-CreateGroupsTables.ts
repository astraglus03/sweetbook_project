import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupsTables1744329600000 implements MigrationInterface {
  name = 'CreateGroupsTables1744329600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "group_status" AS ENUM (
        'COLLECTING', 'EDITING', 'VOTING', 'ORDERED', 'COMPLETED', 'DELETED'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "group_role" AS ENUM ('OWNER', 'MEMBER');
    `);

    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "description" text,
        "coverImage" varchar(500),
        "inviteCode" varchar(20) NOT NULL,
        "status" "group_status" NOT NULL DEFAULT 'COLLECTING',
        "ownerId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "eventDate" date,
        "uploadDeadline" timestamp,
        "year" integer,
        "parentGroupId" integer REFERENCES "groups"("id"),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_groups_invite_code" ON "groups" ("inviteCode");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_groups_owner_id" ON "groups" ("ownerId");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_groups_parent_group_id" ON "groups" ("parentGroupId");`,
    );

    await queryRunner.query(`
      CREATE TABLE "group_members" (
        "id" SERIAL PRIMARY KEY,
        "groupId" integer NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
        "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role" "group_role" NOT NULL DEFAULT 'MEMBER',
        "uploadCount" integer NOT NULL DEFAULT 0,
        "lastNotifiedAt" timestamp,
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_group_members_group_user" ON "group_members" ("groupId", "userId");`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_group_members_group_user";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "group_members";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_groups_parent_group_id";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_groups_owner_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_groups_invite_code";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "groups";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "group_role";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "group_status";`);
  }
}
