import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookDto, UpdateBookDto } from '../dto/book.dto';
import { CreateCopyDto, UpdateCopyDto } from '../dto/copy.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  // Book methods
  async createBook(createBookDto: CreateBookDto) {
    const { categoryIds, authorIds, ...bookData } = createBookDto;
    
    return this.prisma.book.create({
      data: {
        ...bookData,
        categories: categoryIds ? {
          connect: categoryIds.map(id => ({ categoryId: id }))
        } : undefined,
        authors: authorIds ? {
          connect: authorIds.map(id => ({ authorId: id }))
        } : undefined,
      },
      include: {
        categories: true,
        authors: true,
        copies: true
      }
    });
  }

  async findAllBooks() {
    return this.prisma.book.findMany({
      include: {
        categories: true,
        authors: true,
        _count: {
          select: { copies: true }
        }
      },
      orderBy: { title: 'asc' }
    });
  }

  async findOneBook(bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { bookId },
      include: {
        categories: true,
        authors: true,
        copies: true
      }
    });
    if (!book) throw new NotFoundException('Libro no encontrado');
    return book;
  }

  async updateBook(bookId: string, updateBookDto: UpdateBookDto) {
    const { categoryIds, authorIds, ...bookData } = updateBookDto;
    
    await this.findOneBook(bookId);

    return this.prisma.book.update({
      where: { bookId },
      data: {
        ...bookData,
        categories: categoryIds ? {
          set: categoryIds.map(id => ({ categoryId: id }))
        } : undefined,
        authors: authorIds ? {
          set: authorIds.map(id => ({ authorId: id }))
        } : undefined,
      },
      include: {
        categories: true,
        authors: true
      }
    });
  }

  async removeBook(bookId: string) {
    await this.findOneBook(bookId);
    return this.prisma.book.update({
      where: { bookId },
      data: { activeState: false }
    });
  }

  // Copy methods
  async createCopy(createCopyDto: CreateCopyDto) {
    return this.prisma.copy.create({
      data: createCopyDto
    });
  }

  async findCopiesByBook(bookId: string) {
    return this.prisma.copy.findMany({
      where: { bookId },
      orderBy: { barcode: 'asc' }
    });
  }

  async updateCopy(copyId: string, updateCopyDto: UpdateCopyDto) {
    const copy = await this.prisma.copy.findUnique({ where: { copyId } });
    if (!copy) throw new NotFoundException('Ejemplar no encontrado');

    return this.prisma.copy.update({
      where: { copyId },
      data: updateCopyDto
    });
  }

  async removeCopy(copyId: string) {
    const copy = await this.prisma.copy.findUnique({ where: { copyId } });
    if (!copy) throw new NotFoundException('Ejemplar no encontrado');

    return this.prisma.copy.update({
      where: { copyId },
      data: { activeState: false }
    });
  }
}
