"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async register(dto) {
        const { password, email, code, documentNumber, role, schoolId, facultyId, ...userDataRest } = dto;
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { code: code },
                    { userData: { email: email } },
                    { userData: { documentNumber: documentNumber } }
                ]
            }
        });
        if (existingUser) {
            throw new common_1.ConflictException('El código, email o número de documento ya están registrados');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            return await this.prisma.$transaction(async (tx) => {
                const userData = await tx.userData.create({
                    data: {
                        ...userDataRest,
                        email,
                        documentNumber,
                        birthdate: new Date(dto.birthdate),
                    }
                });
                const user = await tx.user.create({
                    data: {
                        code,
                        password: hashedPassword,
                        role: role || client_1.Role.STUDENT,
                        userDataId: userData.userDataId,
                    }
                });
                if (user.role === client_1.Role.STUDENT) {
                    if (!schoolId)
                        throw new common_1.ConflictException('El schoolId es requerido para estudiantes');
                    await tx.student.create({
                        data: {
                            userId: user.userId,
                            schoolId: schoolId,
                            cycle: 1,
                        }
                    });
                }
                else if (user.role === client_1.Role.TEACHER) {
                    if (!facultyId)
                        throw new common_1.ConflictException('El facultyId es requerido para profesores');
                    await tx.teacher.create({
                        data: {
                            userId: user.userId,
                            facultyId: facultyId,
                        }
                    });
                }
                return {
                    message: 'Cuenta creada exitosamente',
                    userId: user.userId,
                    code: user.code
                };
            });
        }
        catch (error) {
            if (error instanceof common_1.ConflictException)
                throw error;
            console.error(error);
            throw new common_1.InternalServerErrorException('Error al crear la cuenta del usuario');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map