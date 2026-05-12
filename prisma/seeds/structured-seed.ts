import 'dotenv/config';
import { PrismaClient, Role, CopyStatus, CopyCondition, LoanStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { generateSlug } from '../../src/common/utils/slug';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDatabase() {
  console.log('Cleaning database...');
  // Delete in reverse order of dependencies
  await prisma.loan.deleteMany();
  await prisma.copy.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  await prisma.category.deleteMany();
  await prisma.administrator.deleteMany();
  await prisma.librarian.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.userData.deleteMany();
  await prisma.school.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.district.deleteMany();
  await prisma.province.deleteMany();
  await prisma.address.deleteMany();
}

async function main() {
  await cleanDatabase();

  console.log('Starting structured seeding...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Base Locations
  console.log('Seeding locations...');
  const lima = await prisma.province.create({
    data: {
      title: 'Lima',
      districts: {
        create: [
          { title: 'Miraflores' },
          { title: 'San Isidro' },
          { title: 'Santiago de Surco' },
        ],
      },
    },
  });

  const district = await prisma.district.findFirst({ where: { provinceId: lima.provinceId } });
  if (!district) throw new Error('District not created');

  // 2. Academic Structure
  console.log('Seeding academic structure...');
  const faculty = await prisma.faculty.create({
    data: {
      title: 'Facultad de Ingeniería y Arquitectura',
      schools: {
        create: [
          { title: 'Ingeniería de Sistemas' },
          { title: 'Ingeniería de Software' },
        ],
      },
    },
  });

  const school = await prisma.school.findFirst({ where: { facultyId: faculty.facultyId } });
  if (!school) throw new Error('School not created');

  // 3. Users
  console.log('Seeding users...');
  
  // Admin
  const adminName = 'Admin Principal';
  await prisma.user.create({
    data: {
      code: 'ADMIN01',
      slug: generateSlug(adminName),
      password: hashedPassword,
      role: Role.ADMINISTRATOR,
      userData: {
        create: {
          name: 'Admin',
          paternalSurname: 'Principal',
          maternalSurname: 'Sistema',
          documentNumber: '00000001',
          email: 'admin@biblioteca.com',
          birthdate: new Date('1985-01-01'),
          districtId: district.districtId,
        },
      },
      administrator: { create: {} },
    },
  });

  // Librarian
  const libName = 'Librarian Uno';
  await prisma.user.create({
    data: {
      code: 'LIB01',
      slug: generateSlug(libName),
      password: hashedPassword,
      role: Role.LIBRARIAN,
      userData: {
        create: {
          name: 'Librarian',
          paternalSurname: 'Uno',
          maternalSurname: 'Sistema',
          documentNumber: '00000002',
          email: 'librarian@biblioteca.com',
          birthdate: new Date('1990-01-01'),
          districtId: district.districtId,
        },
      },
      librarian: { create: { shift: 'Mañana' } },
    },
  });

  // Teacher
  const teacherName = 'Profesor Jirafales';
  await prisma.user.create({
    data: {
      code: 'TEA01',
      slug: generateSlug(teacherName),
      password: hashedPassword,
      role: Role.TEACHER,
      userData: {
        create: {
          name: 'Profesor',
          paternalSurname: 'Jirafales',
          maternalSurname: 'Maestro',
          documentNumber: '00000003',
          email: 'teacher@biblioteca.com',
          birthdate: new Date('1970-01-01'),
          districtId: district.districtId,
        },
      },
      teacher: { create: { facultyId: faculty.facultyId } },
    },
  });

  // Students
  for (let i = 1; i <= 5; i++) {
    const name = `Alumno ${i}`;
    await prisma.user.create({
      data: {
        code: `2024${i.toString().padStart(4, '0')}`,
        slug: generateSlug(name),
        password: hashedPassword,
        role: Role.STUDENT,
        userData: {
          create: {
            name: `Alumno ${i}`,
            paternalSurname: `ApellidoP${i}`,
            maternalSurname: `ApellidoM${i}`,
            documentNumber: `7000000${i}`,
            email: `student${i}@biblioteca.com`,
            birthdate: new Date('2000-01-01'),
            districtId: district.districtId,
          },
        },
        student: { create: { cycle: i, schoolId: school.schoolId } },
      },
    });
  }

  // 4. Library Data
  console.log('Seeding library data...');
  
  const catIng = await prisma.category.create({ data: { title: 'Ingeniería' } });
  const catLit = await prisma.category.create({ data: { title: 'Literatura' } });

  const author1 = await prisma.author.create({
    data: {
      name: 'Gabriel García Márquez',
      slug: generateSlug('Gabriel García Márquez'),
      nationality: 'Colombiano',
      biography: 'Premio Nobel de Literatura 1982.',
    },
  });

  const author2 = await prisma.author.create({
    data: {
      name: 'Robert C. Martin',
      slug: generateSlug('Robert C. Martin'),
      nationality: 'Estadounidense',
      biography: 'Famoso autor de Clean Code.',
    },
  });

  // Books
  const book1 = await prisma.book.create({
    data: {
      title: 'Cien años de soledad',
      slug: generateSlug('Cien años de soledad'),
      isbn: '978-0307474728',
      publicationYear: 1967,
      publisher: 'Sudamericana',
      authors: { connect: { authorId: author1.authorId } },
      categories: { connect: { categoryId: catLit.categoryId } },
    },
  });

  const book2 = await prisma.book.create({
    data: {
      title: 'Clean Code',
      slug: generateSlug('Clean Code'),
      isbn: '978-0132350884',
      publicationYear: 2008,
      publisher: 'Prentice Hall',
      authors: { connect: { authorId: author2.authorId } },
      categories: { connect: { categoryId: catIng.categoryId } },
    },
  });

  // Copies
  const copy1 = await prisma.copy.create({
    data: {
      barcode: 'BAR001',
      status: CopyStatus.AVAILABLE,
      condition: CopyCondition.NEW,
      bookId: book1.bookId,
    },
  });

  const copy2 = await prisma.copy.create({
    data: {
      barcode: 'BAR002',
      status: CopyStatus.LENT,
      condition: CopyCondition.GOOD,
      bookId: book2.bookId,
    },
  });

  // 5. Loans
  console.log('Seeding loans...');
  const student = await prisma.user.findFirst({ where: { role: Role.STUDENT } });
  if (student) {
    await prisma.loan.create({
      data: {
        userId: student.userId,
        copyId: copy2.copyId,
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        status: LoanStatus.ACTIVE,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
