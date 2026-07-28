import path from 'path';

import dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'venue_booking',

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  synchronize: false,

  migrationsTableName: 'migrations_history',
  logging: ['error', 'warn'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
