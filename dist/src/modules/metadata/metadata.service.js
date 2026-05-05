"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MetadataService = class MetadataService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProvinces() {
        return this.prisma.province.findMany({
            orderBy: { title: 'asc' },
        });
    }
    async getDistricts(provinceId) {
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
    async getSchools(facultyId) {
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
};
exports.MetadataService = MetadataService;
exports.MetadataService = MetadataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MetadataService);
//# sourceMappingURL=metadata.service.js.map