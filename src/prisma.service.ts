import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import colors from 'colors';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService) {
    const pool = new Pool({ connectionString: configService.get<string>('DATAB5ASE_URL') });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log(colors.blue.bold('Prisma conectado a PostgreSQL 🗣️ [✅✅ ]'));
    } catch (error) {
      console.log(colors.red.bold('Error al conectar a la base de datos con Prisma 🗣️ [❌❌ ]'));
      console.error(error);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
