import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { dataSourceOptions } from '@/database/data-source';

export const typeOrmConfig: TypeOrmModuleOptions = {
  ...dataSourceOptions,
  autoLoadEntities: true,
};
