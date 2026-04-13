import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalBookFaceTables1744761600000 implements MigrationInterface {
  name = 'AddPersonalBookFaceTables1744761600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "books_status_enum" ADD VALUE IF NOT EXISTS 'AUTO_GENERATING';
    `);
    await queryRunner.query(`
      ALTER TYPE "books_status_enum" ADD VALUE IF NOT EXISTS 'READY_TO_REVIEW';
    `);
    await queryRunner.query(`
      ALTER TYPE "books_status_enum" ADD VALUE IF NOT EXISTS 'EDITING';
    `);
    await queryRunner.query(`
      ALTER TYPE "books_status_enum" ADD VALUE IF NOT EXISTS 'FINALIZED';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_face_anchors" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "groupId" integer NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
        "embedding" double precision[] NOT NULL,
        "sampleCount" integer NOT NULL DEFAULT 1,
        "threshold" double precision NOT NULL DEFAULT 0.6,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_face_anchors_user_group" ON "user_face_anchors" ("userId", "groupId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_face_anchors_group" ON "user_face_anchors" ("groupId");`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_face_anchor_samples" (
        "id" SERIAL PRIMARY KEY,
        "anchorId" integer NOT NULL REFERENCES "user_face_anchors"("id") ON DELETE CASCADE,
        "embedding" double precision[] NOT NULL,
        "sourcePath" varchar(500),
        "confidence" double precision,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_face_anchor_samples_anchor" ON "user_face_anchor_samples" ("anchorId");`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "photo_faces" (
        "id" SERIAL PRIMARY KEY,
        "photoId" integer NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
        "groupId" integer NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
        "embedding" double precision[] NOT NULL,
        "bboxX" integer NOT NULL,
        "bboxY" integer NOT NULL,
        "bboxWidth" integer NOT NULL,
        "bboxHeight" integer NOT NULL,
        "confidence" double precision NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_photo_faces_photo" ON "photo_faces" ("photoId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_photo_faces_group" ON "photo_faces" ("groupId");`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "personal_book_matches" (
        "id" SERIAL PRIMARY KEY,
        "bookId" integer NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
        "photoId" integer NOT NULL REFERENCES "photos"("id") ON DELETE CASCADE,
        "photoFaceId" integer REFERENCES "photo_faces"("id") ON DELETE SET NULL,
        "similarity" double precision NOT NULL,
        "excludedByUser" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_personal_book_matches_book_photo" ON "personal_book_matches" ("bookId", "photoId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_personal_book_matches_book" ON "personal_book_matches" ("bookId");`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "personal_book_matches";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "photo_faces";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_face_anchor_samples";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_face_anchors";`);
  }
}
