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
exports.CreateAccountDto = exports.IsMinBirthDateConstraint = exports.IsDocumentNumberValidConstraint = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
let IsDocumentNumberValidConstraint = class IsDocumentNumberValidConstraint {
    validate(text, args) {
        if (!text || typeof text !== 'string')
            return false;
        const object = args.object;
        if (object.documentType === 'DNI') {
            return /^[0-9]{8}$/.test(text);
        }
        if (object.documentType === 'CE') {
            return /^[0-9]{9}$/.test(text);
        }
        return false;
    }
    defaultMessage(args) {
        const object = args.object;
        if (object.documentType === 'DNI') {
            return 'El DNI debe tener exactamente 8 dígitos numéricos';
        }
        if (object.documentType === 'CE') {
            return 'El Carnet de Extranjería debe tener exactamente 9 dígitos numéricos';
        }
        return 'Número de documento inválido';
    }
};
exports.IsDocumentNumberValidConstraint = IsDocumentNumberValidConstraint;
exports.IsDocumentNumberValidConstraint = IsDocumentNumberValidConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isDocumentNumberValid', async: false })
], IsDocumentNumberValidConstraint);
let IsMinBirthDateConstraint = class IsMinBirthDateConstraint {
    validate(birthdate) {
        if (!birthdate)
            return false;
        const date = new Date(birthdate);
        return !isNaN(date.getTime()) && date.getFullYear() >= 1940;
    }
    defaultMessage() {
        return 'La fecha de nacimiento debe ser a partir del año 1940';
    }
};
exports.IsMinBirthDateConstraint = IsMinBirthDateConstraint;
exports.IsMinBirthDateConstraint = IsMinBirthDateConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isMinBirthDate', async: false })
], IsMinBirthDateConstraint);
class CreateAccountDto {
    code;
    password;
    role;
    name;
    paternalSurname;
    maternalSurname;
    documentType;
    documentNumber;
    maritalStatus;
    gender;
    birthdate;
    mobilePhone;
    landlinePhone;
    email;
    provinceId;
    districtId;
    address;
    schoolId;
    facultyId;
    cycle;
}
exports.CreateAccountDto = CreateAccountDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'El código debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El código es obligatorio' }),
    (0, class_validator_1.Length)(10, 10, { message: 'El código debe tener exactamente 10 dígitos' }),
    (0, class_validator_1.Matches)(/^[0-9]+$/, { message: 'El código solo debe contener números' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'La contraseña debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'La contraseña es obligatoria' }),
    (0, class_validator_1.MinLength)(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.Role, { message: 'Rol no válido' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'El nombre debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El nombre es obligatorio' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'El apellido paterno debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El apellido paterno es obligatorio' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "paternalSurname", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'El apellido materno debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El apellido materno es obligatorio' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "maternalSurname", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'El tipo de documento debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El tipo de documento es obligatorio' }),
    (0, class_validator_1.IsIn)(['DNI', 'CE'], { message: 'El tipo de documento debe ser DNI o CE' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "documentType", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'El número de documento debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El número de documento es obligatorio' }),
    (0, class_validator_1.Validate)(IsDocumentNumberValidConstraint),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "documentNumber", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El estado civil es obligatorio' }),
    (0, class_validator_1.IsString)({ message: 'El estado civil debe ser una cadena de texto' }),
    (0, class_validator_1.IsIn)(['S', 'C', 'V', 'D'], { message: 'El estado civil debe ser S, C, V o D' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "maritalStatus", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El género es obligatorio' }),
    (0, class_validator_1.IsString)({ message: 'El género debe ser una cadena de texto' }),
    (0, class_validator_1.IsIn)(['F', 'M', 'O'], { message: 'El género debe ser F, M o O' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'La fecha de nacimiento debe tener un formato válido' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'La fecha de nacimiento es obligatoria' }),
    (0, class_validator_1.Validate)(IsMinBirthDateConstraint),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "birthdate", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El teléfono móvil es obligatorio' }),
    (0, class_validator_1.IsString)({ message: 'El teléfono móvil debe ser una cadena de texto' }),
    (0, class_validator_1.Matches)(/^\d{9}$/, { message: 'El teléfono móvil debe tener exactamente 9 dígitos' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "mobilePhone", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El teléfono fijo es obligatorio' }),
    (0, class_validator_1.IsString)({ message: 'El teléfono fijo debe ser una cadena de texto' }),
    (0, class_validator_1.Matches)(/^\d{9}$/, { message: 'El teléfono fijo debe tener exactamente 9 dígitos' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "landlinePhone", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'El formato del email no es válido' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El email es obligatorio' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'La provincia debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'La provincia es obligatoria' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "provinceId", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'El distrito debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El distrito es obligatorio' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "districtId", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'La dirección debe ser una cadena de texto' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'La dirección es obligatoria' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.role === client_1.Role.STUDENT),
    (0, class_validator_1.IsNotEmpty)({ message: 'La escuela es obligatoria' }),
    (0, class_validator_1.IsString)({ message: 'La escuela debe ser una cadena de texto' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "schoolId", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.role === client_1.Role.TEACHER || o.role === client_1.Role.STUDENT),
    (0, class_validator_1.IsNotEmpty)({ message: 'La facultad es obligatoria' }),
    (0, class_validator_1.IsString)({ message: 'La facultad debe ser una cadena de texto' }),
    __metadata("design:type", String)
], CreateAccountDto.prototype, "facultyId", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.role === client_1.Role.STUDENT),
    (0, class_validator_1.IsNotEmpty)({ message: 'El ciclo es obligatorio para estudiantes' }),
    (0, class_validator_1.IsInt)({ message: 'El ciclo debe ser un número entero' }),
    (0, class_validator_1.Min)(1, { message: 'El ciclo mínimo es 1' }),
    (0, class_validator_1.Max)(10, { message: 'El ciclo máximo es 10' }),
    __metadata("design:type", Number)
], CreateAccountDto.prototype, "cycle", void 0);
//# sourceMappingURL=create-account.dto.js.map