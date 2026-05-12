import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuthorDto, UpdateAuthorDto } from '../dto/author.dto';
import { generateSlug } from 'src/common/utils/slug';

@Injectable()
export class AuthorsService {
  constructor(private prisma: PrismaService) {}

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.author.findUnique({
        where: { slug }
      });

      if (!existing) return slug;
      
      // If exists, append counter or random string
      slug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 10) {
        // Fallback to random string if many collisions
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        return slug;
      }
    }
  }

  async create(createAuthorDto: CreateAuthorDto) {
    const slug = await this.generateUniqueSlug(createAuthorDto.name);
    
    try {
      return await this.prisma.author.create({
        data: {
          ...createAuthorDto,
          slug,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe un autor con un slug similar, por favor intenta de nuevo');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.author.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(idOrSlug: string) {
    const author = await this.prisma.author.findFirst({
      where: {
        OR: [
          { authorId: idOrSlug },
          { slug: idOrSlug }
        ]
      },
    });
    if (!author) throw new NotFoundException('Autor no encontrado');
    return author;
  }

  async update(authorId: string, updateAuthorDto: UpdateAuthorDto) {
    const author = await this.findOne(authorId);
    
    let slug = undefined;
    if (updateAuthorDto.name && updateAuthorDto.name !== author.name) {
      slug = await this.generateUniqueSlug(updateAuthorDto.name);
    }

    return this.prisma.author.update({
      where: { authorId: author.authorId },
      data: {
        ...updateAuthorDto,
        ...(slug ? { slug } : {})
      },
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
