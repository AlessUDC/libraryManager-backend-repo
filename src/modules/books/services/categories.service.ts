import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { title: 'asc' },
    });
  }

  async findOne(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async update(categoryId: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(categoryId);
    return this.prisma.category.update({
      where: { categoryId },
      data: updateCategoryDto,
    });
  }

  async remove(categoryId: string) {
    await this.findOne(categoryId);
    return this.prisma.category.update({
      where: { categoryId },
      data: { activeState: false },
    });
  }
}
