import { PrismaService } from '../prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
export declare class AuthService {
    private prisma;
    constructor(prisma: PrismaService);
    register(dto: CreateAccountDto): Promise<{
        message: string;
        userId: string;
        code: string;
    }>;
}
