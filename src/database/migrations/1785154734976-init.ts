import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1785154734976 implements MigrationInterface {
  name = 'Init1785154734976';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_token" ("id" SERIAL NOT NULL, "hashedToken" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "comment" ("id" SERIAL NOT NULL, "text" text NOT NULL, "rating" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "establishmentId" integer, "userId" integer, CONSTRAINT "UQ_a41d32644f71a4b438bd2d92148" UNIQUE ("userId", "establishmentId"), CONSTRAINT "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3edd3cdb7232a3e9220607eabb" ON "comment" ("createdAt") `
    );
    await queryRunner.query(
      `CREATE TABLE "establishment_type" ("id" SERIAL NOT NULL, "name" text NOT NULL, CONSTRAINT "PK_69e8376c18fb1feb526c270d611" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "features" ("id" SERIAL NOT NULL, "name" text NOT NULL, "image" character varying(500), CONSTRAINT "PK_5c1e336df2f4a7051e5bf08a941" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."schedules_day_enum" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`
    );
    await queryRunner.query(
      `CREATE TABLE "schedules" ("id" SERIAL NOT NULL, "day" "public"."schedules_day_enum" NOT NULL, "openTime" TIME, "closeTime" TIME, "establishmentId" integer NOT NULL, CONSTRAINT "UQ_9e4cc65c6b5799e2949029c856a" UNIQUE ("establishmentId", "day"), CONSTRAINT "PK_7e33fc2ea755a5765e3564e66dd" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "establishment" ("id" SERIAL NOT NULL, "name" text NOT NULL, "address" text NOT NULL, "locationDetails" jsonb, "lat" numeric(10,7), "lng" numeric(10,7), "description" text NOT NULL, "totalSeats" integer NOT NULL DEFAULT '0', "rating" numeric(3,2) NOT NULL DEFAULT '0', "coverPhoto" text, "photos" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "ownerId" integer NOT NULL, "type_id" integer, CONSTRAINT "PK_149bd9dc1f2bd4e825a0c474932" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_58a3c0e6b35c7e30aa3a58b3af" ON "establishment" ("name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c481dca67729b24e344f5df7a4" ON "establishment" ("lat") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aed567f9d2ac0a63c4a352c772" ON "establishment" ("lng") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b526583847c892eea5a29128ed" ON "establishment" ("ownerId") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED')`
    );
    await queryRunner.query(
      `CREATE TABLE "booking" ("id" SERIAL NOT NULL, "bookingDate" date NOT NULL, "bookingTime" TIME NOT NULL, "numberOfGuests" integer NOT NULL, "status" "public"."booking_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "establishmentId" integer, CONSTRAINT "PK_49171efc69702ed84c812f33540" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f41ae8e531cb4371c5af345fb" ON "booking" ("createdAt") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'MODERATOR', 'OWNER', 'SUPER_ADMIN')`
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "phoneNumber" character varying NOT NULL, "avatarSeed" character varying, "avatarUrl" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "favorites" integer array NOT NULL DEFAULT '{}', CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_1e3d0240b49c40521aaeb953293" UNIQUE ("phoneNumber"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "establishment_features" ("establishment_id" integer NOT NULL, "feature_id" integer NOT NULL, CONSTRAINT "PK_7b7cdbd0f9bbe6d667022a0410e" PRIMARY KEY ("establishment_id", "feature_id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_985cb209e933c1e9c02ea19001" ON "establishment_features" ("establishment_id") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52e72d7fb4bc4355a27d4f4f10" ON "establishment_features" ("feature_id") `
    );
    await queryRunner.query(
      `CREATE TABLE "entity_moderators" ("establishmentId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_270ac6dd0ad8dfc18f4c7e066ac" PRIMARY KEY ("establishmentId", "userId"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9d4fb89e37074bc29290e1168" ON "entity_moderators" ("establishmentId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8094015c37b9bb107d593fbddb" ON "entity_moderators" ("userId") `
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_8e913e288156c133999341156ad" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_9098909d9d1a8c601a5e98ec731" FOREIGN KEY ("establishmentId") REFERENCES "establishment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_c0354a9a009d3bb45a08655ce3b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "schedules" ADD CONSTRAINT "FK_053274295f8acaae79d494f9069" FOREIGN KEY ("establishmentId") REFERENCES "establishment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "establishment" ADD CONSTRAINT "FK_69e8376c18fb1feb526c270d611" FOREIGN KEY ("type_id") REFERENCES "establishment_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "establishment" ADD CONSTRAINT "FK_b526583847c892eea5a29128edd" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_336b3f4a235460dc93645fbf222" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_0b58432fa292e08deed0cae0c5e" FOREIGN KEY ("establishmentId") REFERENCES "establishment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "establishment_features" ADD CONSTRAINT "FK_985cb209e933c1e9c02ea190012" FOREIGN KEY ("establishment_id") REFERENCES "establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "establishment_features" ADD CONSTRAINT "FK_52e72d7fb4bc4355a27d4f4f10c" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "entity_moderators" ADD CONSTRAINT "FK_f9d4fb89e37074bc29290e11687" FOREIGN KEY ("establishmentId") REFERENCES "establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "entity_moderators" ADD CONSTRAINT "FK_8094015c37b9bb107d593fbddbc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "entity_moderators" DROP CONSTRAINT "FK_8094015c37b9bb107d593fbddbc"`
    );
    await queryRunner.query(
      `ALTER TABLE "entity_moderators" DROP CONSTRAINT "FK_f9d4fb89e37074bc29290e11687"`
    );
    await queryRunner.query(
      `ALTER TABLE "establishment_features" DROP CONSTRAINT "FK_52e72d7fb4bc4355a27d4f4f10c"`
    );
    await queryRunner.query(
      `ALTER TABLE "establishment_features" DROP CONSTRAINT "FK_985cb209e933c1e9c02ea190012"`
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT "FK_0b58432fa292e08deed0cae0c5e"`
    );
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT "FK_336b3f4a235460dc93645fbf222"`
    );
    await queryRunner.query(
      `ALTER TABLE "establishment" DROP CONSTRAINT "FK_b526583847c892eea5a29128edd"`
    );
    await queryRunner.query(
      `ALTER TABLE "establishment" DROP CONSTRAINT "FK_69e8376c18fb1feb526c270d611"`
    );
    await queryRunner.query(
      `ALTER TABLE "schedules" DROP CONSTRAINT "FK_053274295f8acaae79d494f9069"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_c0354a9a009d3bb45a08655ce3b"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_9098909d9d1a8c601a5e98ec731"`
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_8e913e288156c133999341156ad"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8094015c37b9bb107d593fbddb"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9d4fb89e37074bc29290e1168"`
    );
    await queryRunner.query(`DROP TABLE "entity_moderators"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_52e72d7fb4bc4355a27d4f4f10"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_985cb209e933c1e9c02ea19001"`
    );
    await queryRunner.query(`DROP TABLE "establishment_features"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1f41ae8e531cb4371c5af345fb"`
    );
    await queryRunner.query(`DROP TABLE "booking"`);
    await queryRunner.query(`DROP TYPE "public"."booking_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b526583847c892eea5a29128ed"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aed567f9d2ac0a63c4a352c772"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c481dca67729b24e344f5df7a4"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_58a3c0e6b35c7e30aa3a58b3af"`
    );
    await queryRunner.query(`DROP TABLE "establishment"`);
    await queryRunner.query(`DROP TABLE "schedules"`);
    await queryRunner.query(`DROP TYPE "public"."schedules_day_enum"`);
    await queryRunner.query(`DROP TABLE "features"`);
    await queryRunner.query(`DROP TABLE "establishment_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3edd3cdb7232a3e9220607eabb"`
    );
    await queryRunner.query(`DROP TABLE "comment"`);
    await queryRunner.query(`DROP TABLE "refresh_token"`);
  }
}
