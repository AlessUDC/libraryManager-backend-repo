import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding staff users (ADMIN && LIBRARIAN)...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const district = await prisma.district.findFirst();
  if (!district) {
    console.error('District not found. Run seed-base-data first.');
    return;
  }

  // Create Admin
  const adminCode = 'ADMIN01';
  const adminEmail = 'admin@library.com';
  const adminDoc = '00000001';

  const existingAdmin = await prisma.user.findUnique({ where: { code: adminCode } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        code: adminCode,
        password: hashedPassword,
        role: Role.ADMINISTRATOR,
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

  // Create Librarian
  const librarianCode = 'LIB01';
  const librarianEmail = 'librarian@library.com';
  const librarianDoc = '00000002';

  const existingLibrarian = await prisma.user.findUnique({ where: { code: librarianCode } });
  if (!existingLibrarian) {
    await prisma.user.create({
      data: {
        code: librarianCode,
        password: hashedPassword,
        role: Role.LIBRARIAN,
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
