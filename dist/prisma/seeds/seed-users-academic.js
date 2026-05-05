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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Seeding academic users (STUDENT && TEACHERS)...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const school = await prisma.school.findFirst();
    const faculty = await prisma.faculty.findFirst();
    const district = await prisma.district.findFirst();
    if (!school || !faculty || !district) {
        console.error('Base data (School, Faculty, District) not found. Run seed-base-data first.');
        return;
    }
    for (let i = 1; i <= 10; i++) {
        const code = `2024${String(i).padStart(4, '0')}`;
        const email = `student${i}@example.com`;
        const docNumber = `1234567${i}`;
        const existingUser = await prisma.user.findUnique({ where: { code } });
        if (!existingUser) {
            await prisma.user.create({
                data: {
                    code,
                    password: hashedPassword,
                    role: client_1.Role.STUDENT,
                    userData: {
                        create: {
                            name: `Estudiante ${i}`,
                            paternalSurname: 'ApellidoP',
                            maternalSurname: 'ApellidoM',
                            documentNumber: docNumber,
                            email,
                            birthdate: new Date('2000-01-01'),
                            districtId: district.districtId,
                        },
                    },
                    student: {
                        create: {
                            cycle: i,
                            schoolId: school.schoolId,
                        },
                    },
                },
            });
        }
    }
    const teacherCode = 'T001';
    const teacherEmail = 'teacher@example.com';
    const teacherDoc = '87654321';
    const existingTeacher = await prisma.user.findUnique({ where: { code: teacherCode } });
    if (!existingTeacher) {
        await prisma.user.create({
            data: {
                code: teacherCode,
                password: hashedPassword,
                role: client_1.Role.TEACHER,
                userData: {
                    create: {
                        name: 'Profesor X',
                        paternalSurname: 'Mansion',
                        maternalSurname: 'Mutante',
                        documentNumber: teacherDoc,
                        email: teacherEmail,
                        birthdate: new Date('1970-01-01'),
                        districtId: district.districtId,
                    },
                },
                teacher: {
                    create: {
                        facultyId: faculty.facultyId,
                    },
                },
            },
        });
    }
    console.log('Academic users seeded successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-users-academic.js.map