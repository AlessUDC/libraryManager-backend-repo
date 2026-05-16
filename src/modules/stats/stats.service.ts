import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalBooks,
      totalCopies,
      availableCopies,
      categoriesCount,
      booksByCategory,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userData.count({ where: { activeState: true } }),
      this.prisma.book.count({ where: { activeState: true } }),
      this.prisma.copy.count({ where: { activeState: true } }),
      this.prisma.copy.count({
        where: { activeState: true, status: 'AVAILABLE' },
      }),
      this.prisma.category.count({ where: { activeState: true } }),
      this.prisma.category.findMany({
        where: { activeState: true },
        select: {
          title: true,
          _count: {
            select: { books: true },
          },
        },
        take: 5,
        orderBy: {
          books: { _count: 'desc' },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      library: {
        totalTitles: totalBooks,
        totalCopies: totalCopies,
        availableCopies: availableCopies,
        categories: categoriesCount,
      },
      distribution: booksByCategory.map((cat) => ({
        name: cat.title,
        value: cat._count.books,
      })),
    };
  }
}
