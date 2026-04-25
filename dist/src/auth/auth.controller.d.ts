import { AuthService } from './auth.service';
import { CreateAccountDto } from './dto/create-account.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(createAccountDto: CreateAccountDto): Promise<{
        message: string;
        userId: string;
        code: string;
    }>;
}
