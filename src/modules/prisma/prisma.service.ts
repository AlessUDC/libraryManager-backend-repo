import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import colors from 'colors';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      const errorMessage =
        'DATABASE_URL is not defined. Please create a .env file in the backend directory containing your PostgreSQL database connection URL (e.g. DATABASE_URL=postgresql://user:pass@localhost:5433/db).';
      console.error(colors.red.bold(`❌ Error: ${errorMessage}`));
      throw new Error(errorMessage);
    }
    const pool = new Pool({
      connectionString: databaseUrl,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log(colors.blue.bold('Prisma conectado a PostgreSQL 🗣️ [✅✅ ]'));
    } catch (error) {
      console.log(
        colors.red.bold(
          'Error al conectar a la base de datos con Prisma 🗣️ [❌❌ ]',
        ),
      );
      console.error(error);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
