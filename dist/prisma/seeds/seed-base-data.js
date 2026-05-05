"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Seeding base data (Provinces, Districts, Faculties, Schools)...');
    const faculties = [
        {
            title: 'Facultad de Ingeniería y Arquitectura',
            schools: ['Escuela de Ingeniería de Sistemas', 'Escuela de Ingeniería de Software', 'Escuela de Arquitectura'],
        },
        {
            title: 'Facultad de Ciencias de la Salud',
            schools: ['Escuela de Medicina Humana', 'Escuela de Psicología', 'Escuela de Enfermería'],
        },
    ];
    for (const f of faculties) {
        let faculty = await prisma.faculty.findFirst({ where: { title: f.title } });
        if (!faculty) {
            faculty = await prisma.faculty.create({ data: { title: f.title } });
        }
        for (const s of f.schools) {
            const school = await prisma.school.findFirst({ where: { title: s, facultyId: faculty.facultyId } });
            if (!school) {
                await prisma.school.create({ data: { title: s, facultyId: faculty.facultyId } });
            }
        }
    }
    const locations = [
        {
            province: 'Lima',
            districts: ['Miraflores', 'San Isidro', 'Santiago de Surco', 'Lima Centro'],
        },
        {
            province: 'Arequipa',
            districts: ['Yanahuara', 'Cayma', 'Cerro Colorado'],
        },
        {
            province: 'Cusco',
            districts: ['Wanchaq', 'San Sebastian', 'San Jeronimo'],
        },
    ];
    for (const l of locations) {
        let province = await prisma.province.findFirst({ where: { title: l.province } });
        if (!province) {
            province = await prisma.province.create({ data: { title: l.province } });
        }
        for (const d of l.districts) {
            const district = await prisma.district.findFirst({ where: { title: d, provinceId: province.provinceId } });
            if (!district) {
                await prisma.district.create({ data: { title: d, provinceId: province.provinceId } });
            }
        }
    }
    console.log('Base data seeded successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-base-data.js.map