import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private transporter;
    private readonly logger;
    constructor(configService: ConfigService);
    sendConfirmationEmail(email: string, token: string): Promise<boolean>;
    sendPasswordResetEmail(email: string, token: string): Promise<boolean>;
}
