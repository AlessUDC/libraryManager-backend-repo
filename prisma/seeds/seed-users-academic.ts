import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding academic users (STUDENT && TEACHERS)...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Get some base data to link
  const school = await prisma.school.findFirst();
  const faculty = await prisma.faculty.findFirst();
  const district = await prisma.district.findFirst();

  if (!school || !faculty || !district) {
    console.error('Base data (School, Faculty, District) not found. Run seed-base-data first.');
    return;
  }

  // Create 10 Students (one for each cycle)
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
          role: Role.STUDENT,
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

  // Create a Teacher
  const teacherCode = 'T001';
  const teacherEmail = 'teacher@example.com';
  const teacherDoc = '87654321';

  const existingTeacher = await prisma.user.findUnique({ where: { code: teacherCode } });
  if (!existingTeacher) {
    await prisma.user.create({
      data: {
        code: teacherCode,
        password: hashedPassword,
        role: Role.TEACHER,
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
