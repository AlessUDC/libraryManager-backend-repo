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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataController = void 0;
const common_1 = require("@nestjs/common");
const metadata_service_1 = require("./metadata.service");
let MetadataController = class MetadataController {
    metadataService;
    constructor(metadataService) {
        this.metadataService = metadataService;
    }
    getProvinces() {
        return this.metadataService.getProvinces();
    }
    getDistricts(provinceId) {
        return this.metadataService.getDistricts(provinceId);
    }
    getFaculties() {
        return this.metadataService.getFaculties();
    }
    getSchools(facultyId) {
        return this.metadataService.getSchools(facultyId);
    }
    getMaritalStatuses() {
        return this.metadataService.getMaritalStatuses();
    }
};
exports.MetadataController = MetadataController;
__decorate([
    (0, common_1.Get)('provinces'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetadataController.prototype, "getProvinces", null);
__decorate([
    (0, common_1.Get)('districts/:provinceId'),
    __param(0, (0, common_1.Param)('provinceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MetadataController.prototype, "getDistricts", null);
__decorate([
    (0, common_1.Get)('faculties'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetadataController.prototype, "getFaculties", null);
__decorate([
    (0, common_1.Get)('schools/:facultyId'),
    __param(0, (0, common_1.Param)('facultyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MetadataController.prototype, "getSchools", null);
__decorate([
    (0, common_1.Get)('marital-statuses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetadataController.prototype, "getMaritalStatuses", null);
exports.MetadataController = MetadataController = __decorate([
    (0, common_1.Controller)('metadata'),
    __metadata("design:paramtypes", [metadata_service_1.MetadataService])
], MetadataController);
//# sourceMappingURL=metadata.controller.js.map