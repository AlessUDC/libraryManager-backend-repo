import { PrismaService } from '../prisma/prisma.service';
export declare class UsersCron {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    cleanupUnconfirmedAccounts(): Promise<void>;
}
