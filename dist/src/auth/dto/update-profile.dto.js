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
exports.UpdateProfileDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateProfileDto {
    mobilePhone;
    landlinePhone;
    maritalStatus;
    districtId;
    address;
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== ''),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{9}$/, { message: 'El teléfono móvil debe tener exactamente 9 dígitos' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "mobilePhone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== ''),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{9}$/, { message: 'El teléfono fijo debe tener exactamente 9 dígitos' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "landlinePhone", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El estado civil es obligatorio' }),
    (0, class_validator_1.IsString)({ message: 'El estado civil debe ser una cadena de texto' }),
    (0, class_validator_1.IsIn)(['S', 'C', 'V', 'D'], { message: 'El estado civil debe ser S, C, V o D' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "maritalStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'El distrito debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El distrito es obligatorio' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "districtId", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'La dirección debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'La dirección es obligatoria' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "address", void 0);
//# sourceMappingURL=update-profile.dto.js.map