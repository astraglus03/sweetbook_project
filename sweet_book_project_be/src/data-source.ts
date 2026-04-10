import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const isTs = __filename.endsWith('.ts');
const ext = isTs ? 'ts' : 'js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'sweetbook_user',
  password: process.env.DB_PASSWORD || 'sweetbook_pass',
  database: process.env.DB_NAME || 'sweetbook',
  entities: [`${__dirname}/**/*.entity.${ext}`],
  migrations: [`${__dirname}/migrations/*.${ext}`],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
