import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: string,
    entity: string,
    entityId: string | null,
    performedBy: string,
    details?: any,
  ) {
    return this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        performedBy,
        details: details ? JSON.stringify(details) : null,
      },
    });
  }

  async getAllLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
