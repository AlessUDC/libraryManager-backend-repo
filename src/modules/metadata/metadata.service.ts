import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetadataService {
  constructor(private prisma: PrismaService) {}

  async getProvinces() {
    return this.prisma.province.findMany({
      orderBy: { title: 'asc' },
    });
  }

  async getDistricts(provinceId: string) {
    return this.prisma.district.findMany({
      where: { provinceId },
      orderBy: { title: 'asc' },
    });
  }

  async getFaculties() {
    return this.prisma.faculty.findMany({
      orderBy: { title: 'asc' },
    });
  }

  async getSchools(facultyId: string) {
    return this.prisma.school.findMany({
      where: { facultyId },
      orderBy: { title: 'asc' },
    });
  }

  getMaritalStatuses() {
    return [
      { id: '1', title: 'Soltero(a)' },
      { id: '2', title: 'Casado(a)' },
      { id: '3', title: 'Divorciado(a)' },
      { id: '4', title: 'Viudo(a)' },
    ];
  }
}
