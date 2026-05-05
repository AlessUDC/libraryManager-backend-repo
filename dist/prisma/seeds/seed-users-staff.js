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
    console.log('Seeding staff users (ADMIN && LIBRARIAN)...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const district = await prisma.district.findFirst();
    if (!district) {
        console.error('District not found. Run seed-base-data first.');
        return;
    }
    const adminCode = 'ADMIN01';
    const adminEmail = 'admin@library.com';
    const adminDoc = '00000001';
    const existingAdmin = await prisma.user.findUnique({ where: { code: adminCode } });
    if (!existingAdmin) {
        await prisma.user.create({
            data: {
                code: adminCode,
                password: hashedPassword,
                role: client_1.Role.ADMINISTRATOR,
                userData: {
                    create: {
                        name: 'Administrador',
                        paternalSurname: 'Principal',
                        maternalSurname: 'Sistema',
                        documentNumber: adminDoc,
                        email: adminEmail,
                        birthdate: new Date('1985-05-15'),
                        districtId: district.districtId,
                    },
                },
                administrator: {
                    create: {
                        dateAssignment: new Date(),
                    },
                },
            },
        });
    }
    const librarianCode = 'LIB01';
    const librarianEmail = 'librarian@library.com';
    const librarianDoc = '00000002';
    const existingLibrarian = await prisma.user.findUnique({ where: { code: librarianCode } });
    if (!existingLibrarian) {
        await prisma.user.create({
            data: {
                code: librarianCode,
                password: hashedPassword,
                role: client_1.Role.LIBRARIAN,
                userData: {
                    create: {
                        name: 'Bibliotecario',
                        paternalSurname: 'Gestor',
                        maternalSurname: 'Libros',
                        documentNumber: librarianDoc,
                        email: librarianEmail,
                        birthdate: new Date('1990-10-20'),
                        districtId: district.districtId,
                    },
                },
                librarian: {
                    create: {
                        shift: 'Mañana',
                        dateAssignment: new Date(),
                    },
                },
            },
        });
    }
    console.log('Staff users seeded successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-users-staff.js.map