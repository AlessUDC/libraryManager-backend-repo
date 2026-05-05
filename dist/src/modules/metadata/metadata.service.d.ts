import { PrismaService } from '../prisma/prisma.service';
export declare class MetadataService {
    private prisma;
    constructor(prisma: PrismaService);
    getProvinces(): Promise<{
        title: string;
        provinceId: string;
    }[]>;
    getDistricts(provinceId: string): Promise<{
        title: string;
        provinceId: string;
        districtId: string;
    }[]>;
    getFaculties(): Promise<{
        facultyId: string;
        title: string;
    }[]>;
    getSchools(facultyId: string): Promise<{
        facultyId: string;
        title: string;
        schoolId: string;
    }[]>;
    getMaritalStatuses(): {
        id: string;
        title: string;
    }[];
}
