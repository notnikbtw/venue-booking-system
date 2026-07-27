import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import prompts from 'prompts';
import { DataSource } from 'typeorm';

import { AdminSeeder } from '@/database/seeders/seedersData/admin.seeder';
import { CommentSeeder } from '@/database/seeders/seedersData/comment.seeder';
import { EstablishmentSeeder } from '@/database/seeders/seedersData/establishment.seeder';
import { EstablishmentTypeSeeder } from '@/database/seeders/seedersData/establishmentType.seeder';
import { ScheduleSeeder } from '@/database/seeders/seedersData/schedule.seeder';
import { UserSeeder } from '@/database/seeders/seedersData/user.seeder';

@Injectable()
export class MainSeeder {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly userSeeder: UserSeeder,
    private readonly adminSeeder: AdminSeeder,
    private readonly establishmentTypeSeeder: EstablishmentTypeSeeder,
    private readonly establishmentSeeder: EstablishmentSeeder,
    private readonly commentSeeder: CommentSeeder,
    private readonly scheduleSeeder: ScheduleSeeder
  ) {}

  private async cleanDatabase() {
    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities
      .map(entity => `"${entity.tableName}"`)
      .join(', ');

    if (tableNames.length > 0) {
      await this.dataSource.query(
        `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`
      );
    }
  }

  async run() {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message:
        'WARNING: This action will delete all data in the database Continue?',
      initial: false,
    });

    if (!confirm) {
      console.log('Seeding aborted');
      return;
    }

    console.log('Seeding started...');
    await this.cleanDatabase();
    await this.userSeeder.seedData({
      user: 4,
      moderator: 2,
      owner: 2,
    });
    await this.adminSeeder.seedAdmin();
    await this.establishmentTypeSeeder.seedData(3);
    await this.establishmentSeeder.seedData(20);
    await this.scheduleSeeder.seedSchedules();
    await this.commentSeeder.seedData(100);
  }
}
