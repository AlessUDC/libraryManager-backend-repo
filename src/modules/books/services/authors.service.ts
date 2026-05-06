import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuthorDto, UpdateAuthorDto } from '../dto/author.dto';

@Injectable()
export class AuthorsService {
  constructor(private prisma: PrismaService) {}

  async create(createAuthorDto: CreateAuthorDto) {
    return this.prisma.author.create({
      data: createAuthorDto,
    });
  }

  async findAll() {
    return this.prisma.author.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(authorId: string) {
    const author = await this.prisma.author.findUnique({
      where: { authorId },
    });
    if (!author) throw new NotFoundException('Autor no encontrado');
    return author;
  }

  async update(authorId: string, updateAuthorDto: UpdateAuthorDto) {
    await this.findOne(authorId);
    return this.prisma.author.update({
      where: { authorId },
      data: updateAuthorDto,
    });
  }

  async remove(authorId: string) {
    await this.findOne(authorId);
    return this.prisma.author.update({
      where: { authorId },
      data: { activeState: false },
    });
  }
}
