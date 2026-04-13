import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoverVoting1776133165000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cover_candidates" (
        "id" SERIAL NOT NULL,
        "groupId" integer NOT NULL,
        "creatorUserId" integer NOT NULL,
        "photoId" integer NOT NULL,
        "title" character varying(60) NOT NULL,
        "subtitle" character varying(60),
        "templateKind" character varying(20) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cover_candidates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cover_votes" (
        "id" SERIAL NOT NULL,
        "candidateId" integer NOT NULL,
        "userId" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cover_votes" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ccand_group"
      ON "cover_candidates" ("groupId")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uniq_cvote'
        ) THEN
          ALTER TABLE "cover_votes"
            ADD CONSTRAINT "uniq_cvote" UNIQUE ("candidateId", "userId");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_cover_candidates_group'
        ) THEN
          ALTER TABLE "cover_candidates"
            ADD CONSTRAINT "FK_cover_candidates_group"
            FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_cover_candidates_creator'
        ) THEN
          ALTER TABLE "cover_candidates"
            ADD CONSTRAINT "FK_cover_candidates_creator"
            FOREIGN KEY ("creatorUserId") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_cover_candidates_photo'
        ) THEN
          ALTER TABLE "cover_candidates"
            ADD CONSTRAINT "FK_cover_candidates_photo"
            FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_cover_votes_candidate'
        ) THEN
          ALTER TABLE "cover_votes"
            ADD CONSTRAINT "FK_cover_votes_candidate"
            FOREIGN KEY ("candidateId") REFERENCES "cover_candidates"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_cover_votes_user'
        ) THEN
          ALTER TABLE "cover_votes"
            ADD CONSTRAINT "FK_cover_votes_user"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cover_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cover_candidates"`);
  }
}
