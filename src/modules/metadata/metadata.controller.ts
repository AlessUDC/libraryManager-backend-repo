import { Controller, Get, Param } from '@nestjs/common';
import { MetadataService } from './metadata.service';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Get('provinces')
  getProvinces() {
    return this.metadataService.getProvinces();
  }

  @Get('districts/:provinceId')
  getDistricts(@Param('provinceId') provinceId: string) {
    return this.metadataService.getDistricts(provinceId);
  }

  @Get('faculties')
  getFaculties() {
    return this.metadataService.getFaculties();
  }

  @Get('schools/:facultyId')
  getSchools(@Param('facultyId') facultyId: string) {
    return this.metadataService.getSchools(facultyId);
  }

  @Get('marital-statuses')
  getMaritalStatuses() {
    return this.metadataService.getMaritalStatuses();
  }
}
