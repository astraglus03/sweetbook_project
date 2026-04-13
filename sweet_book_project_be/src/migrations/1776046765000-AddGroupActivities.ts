import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupActivities1776046765000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "group_activities" (
        "id" SERIAL NOT NULL,
        "groupId" integer NOT NULL,
        "actorUserId" integer,
        "type" character varying(40) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_activities" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_group_activities_group'
        ) THEN
          ALTER TABLE "group_activities"
            ADD CONSTRAINT "FK_group_activities_group"
            FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_group_activities_user'
        ) THEN
          ALTER TABLE "group_activities"
            ADD CONSTRAINT "FK_group_activities_user"
            FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_gact_group_created"
      ON "group_activities" ("groupId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "group_activities"`);
  }
}
