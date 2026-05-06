import 'dotenv/config';
import { PrismaClient, CopyStatus, CopyCondition } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding library data (Categories, Authors, Books, Copies)...');

  // 1. Categories
  const categoriesData = [
    { title: 'Ingeniería' },
    { title: 'Tecnología' },
    { title: 'Literatura' },
    { title: 'Ciencia Ficción' },
    { title: 'Historia' },
    { title: 'Matemáticas' },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    let category = await prisma.category.findFirst({ where: { title: cat.title } });
    if (!category) {
      category = await prisma.category.create({ data: cat });
    }
    categories.push(category);
  }

  // 2. Authors
  const authorsData = [
    { name: 'Gabriel García Márquez', nationality: 'Colombiano', biography: 'Premio Nobel de Literatura 1982.' },
    { name: 'Robert C. Martin', nationality: 'Estadounidense', biography: 'Conocido como Uncle Bob, autor de Clean Code.' },
    { name: 'Isaac Asimov', nationality: 'Ruso-Estadounidense', biography: 'Famoso por sus obras de ciencia ficción y divulgación científica.' },
    { name: 'Miguel de Cervantes', nationality: 'Español', biography: 'Autor de Don Quijote de la Mancha.' },
    { name: 'J.K. Rowling', nationality: 'Británica', biography: 'Autora de la serie Harry Potter.' },
  ];

  const authors = [];
  for (const auth of authorsData) {
    let author = await prisma.author.findFirst({ where: { name: auth.name } });
    if (!author) {
      author = await prisma.author.create({ data: auth });
    }
    authors.push(author);
  }

  // 3. Books and Copies
  const booksData = [
    {
      title: 'Cien años de soledad',
      isbn: '978-0307474728',
      publisher: 'Editorial Sudamericana',
      publicationYear: 1967,
      language: 'Español',
      description: 'Obra maestra del realismo mágico.',
      authorName: 'Gabriel García Márquez',
      categoryTitles: ['Literatura'],
      copies: [
        { barcode: 'B001-C1', location: 'Estante L-01', status: CopyStatus.AVAILABLE, condition: CopyCondition.NEW },
        { barcode: 'B001-C2', location: 'Estante L-01', status: CopyStatus.AVAILABLE, condition: CopyCondition.GOOD },
      ]
    },
    {
      title: 'Clean Code',
      isbn: '978-0132350884',
      publisher: 'Prentice Hall',
      publicationYear: 2008,
      language: 'Inglés',
      description: 'A Handbook of Agile Software Craftsmanship.',
      authorName: 'Robert C. Martin',
      categoryTitles: ['Ingeniería', 'Tecnología'],
      copies: [
        { barcode: 'B002-C1', location: 'Estante T-05', status: CopyStatus.AVAILABLE, condition: CopyCondition.NEW },
        { barcode: 'B002-C2', location: 'Estante T-05', status: CopyStatus.LENT, condition: CopyCondition.GOOD },
      ]
    },
    {
      title: 'Yo, Robot',
      isbn: '978-8435018364',
      publisher: 'Gnome Press',
      publicationYear: 1950,
      language: 'Español',
      description: 'Colección de relatos de ciencia ficción.',
      authorName: 'Isaac Asimov',
      categoryTitles: ['Ciencia Ficción'],
      copies: [
        { barcode: 'B003-C1', location: 'Estante C-02', status: CopyStatus.AVAILABLE, condition: CopyCondition.NEW },
      ]
    },
  ];

  for (const b of booksData) {
    let book = await prisma.book.findFirst({ where: { isbn: b.isbn } });
    if (!book) {
      const author = authors.find(a => a.name === b.authorName);
      const bookCategories = categories.filter(c => b.categoryTitles.includes(c.title));

      book = await prisma.book.create({
        data: {
          title: b.title,
          isbn: b.isbn,
          publisher: b.publisher,
          publicationYear: b.publicationYear,
          language: b.language,
          description: b.description,
          authors: { connect: { authorId: author?.authorId } },
          categories: { connect: bookCategories.map(c => ({ categoryId: c.categoryId })) }
        }
      });
    }

    for (const cp of b.copies) {
      const copy = await prisma.copy.findUnique({ where: { barcode: cp.barcode } });
      if (!copy) {
        await prisma.copy.create({
          data: {
            ...cp,
            bookId: book.bookId
          }
        });
      }
    }
  }

  console.log('Library data seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
