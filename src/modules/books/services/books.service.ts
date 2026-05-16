import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { CreateCopyDto, UpdateCopyDto } from '../dto/copy.dto';
import { generateSlug } from '../../../common/utils/slug';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  // Book methods
  async createBook(createBookDto: CreateBookDto) {
    const { categoryIds, authorIds, ...bookData } = createBookDto;
    const slug = generateSlug(bookData.title);

    return this.prisma.book.create({
      data: {
        ...bookData,
        slug,
        categories: categoryIds
          ? {
              connect: categoryIds.map((id) => ({ categoryId: id })),
            }
          : undefined,
        authors: authorIds
          ? {
              connect: authorIds.map((id) => ({ authorId: id })),
            }
          : undefined,
      },
      include: {
        categories: true,
        authors: true,
        copies: true,
      },
    });
  }

  async findAllBooks() {
    const books = await this.prisma.book.findMany({
      where: { activeState: true },
      include: {
        categories: true,
        authors: true,
        copies: {
          where: { activeState: true },
          select: { status: true },
        },
      },
      orderBy: { title: 'asc' },
    });

    return books.map((book) => {
      const { copies, ...rest } = book;
      return {
        ...rest,
        totalCopies: copies.length,
        availableCopies: copies.filter((c) => c.status === 'AVAILABLE').length,
      };
    });
  }

  async findOneBook(idOrSlug: string) {
    const book = await this.prisma.book.findFirst({
      where: {
        OR: [{ bookId: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        categories: true,
        authors: true,
        copies: true,
      },
    });
    if (!book) throw new NotFoundException('Libro no encontrado');
    return book;
  }

  async updateBook(bookId: string, updateBookDto: UpdateBookDto) {
    const { categoryIds, authorIds, ...bookData } = updateBookDto;

    await this.findOneBook(bookId);

    const slug = bookData.title ? generateSlug(bookData.title) : undefined;

    return this.prisma.book.update({
      where: { bookId },
      data: {
        ...bookData,
        ...(slug ? { slug } : {}),
        categories: categoryIds
          ? {
              set: categoryIds.map((id) => ({ categoryId: id })),
            }
          : undefined,
        authors: authorIds
          ? {
              set: authorIds.map((id) => ({ authorId: id })),
            }
          : undefined,
      },
      include: {
        categories: true,
        authors: true,
      },
    });
  }

  async removeBook(bookId: string) {
    await this.findOneBook(bookId);
    return this.prisma.book.update({
      where: { bookId },
      data: { activeState: false },
    });
  }

  // Copy methods
  async createCopy(createCopyDto: CreateCopyDto & { quantity?: number }) {
    const { quantity = 1, ...data } = createCopyDto;
    const createdCopies = [];

    for (let i = 0; i < quantity; i++) {
      let barcode = data.barcode;

      // If quantity > 1 or barcode is empty, generate one
      if (quantity > 1 || !barcode) {
        barcode = `LIB-${Date.now().toString().slice(-6)}-${Math.floor(
          Math.random() * 10000,
        )
          .toString()
          .padStart(4, '0')}`;
        // Brief delay to ensure Date.now() uniqueness if needed, but the random part helps
      }

      const existingCopy = await this.prisma.copy.findUnique({
        where: { barcode },
      });

      if (existingCopy) {
        // If it was manual and exists, throw error
        if (data.barcode) {
          throw new ConflictException(
            `El código de barras '${data.barcode}' ya está en uso.`,
          );
        }
        // If it was auto-generated and exists (rare), retry once with different random
        i--;
        continue;
      }

      const copy = await this.prisma.copy.create({
        data: { ...data, barcode },
      });
      createdCopies.push(copy);
    }

    return createdCopies.length === 1 ? createdCopies[0] : createdCopies;
  }

  async findCopiesByBook(idOrSlug: string) {
    const book = await this.findOneBook(idOrSlug);
    return this.prisma.copy.findMany({
      where: {
        bookId: book.bookId,
        activeState: true,
      },
      orderBy: { barcode: 'asc' },
    });
  }

  async updateCopy(copyId: string, updateCopyDto: UpdateCopyDto) {
    const copy = await this.prisma.copy.findUnique({ where: { copyId } });
    if (!copy) throw new NotFoundException('Ejemplar no encontrado');

    if (updateCopyDto.barcode && updateCopyDto.barcode !== copy.barcode) {
      const existingCopy = await this.prisma.copy.findUnique({
        where: { barcode: updateCopyDto.barcode },
      });
      if (existingCopy) {
        throw new ConflictException(
          `El código de barras '${updateCopyDto.barcode}' ya está en uso.`,
        );
      }
    }

    return this.prisma.copy.update({
      where: { copyId },
      data: updateCopyDto,
    });
  }

  async removeCopy(copyId: string) {
    const copy = await this.prisma.copy.findUnique({ where: { copyId } });
    if (!copy) throw new NotFoundException('Ejemplar no encontrado');

    return this.prisma.copy.update({
      where: { copyId },
      data: { activeState: false },
    });
  }

  async autocomplete(text: string, type: 'title' | 'author' | 'category') {
    if (!text) return [];

    switch (type) {
      case 'title':
        const books = await this.prisma.book.findMany({
          where: {
            title: { contains: text, mode: 'insensitive' },
            activeState: true,
          },
          select: { bookId: true, title: true },
          take: 10,
        });
        return books.map((b) => ({ id: b.bookId, label: b.title }));

      case 'author':
        const authors = await this.prisma.author.findMany({
          where: {
            name: { contains: text, mode: 'insensitive' },
            activeState: true,
          },
          select: { authorId: true, name: true },
          take: 10,
        });
        return authors.map((a) => ({ id: a.authorId, label: a.name }));

      case 'category':
        const categories = await this.prisma.category.findMany({
          where: {
            title: { contains: text, mode: 'insensitive' },
            activeState: true,
          },
          select: { categoryId: true, title: true },
          take: 10,
        });
        return categories.map((c) => ({ id: c.categoryId, label: c.title }));

      default:
        return [];
    }
  }
}
