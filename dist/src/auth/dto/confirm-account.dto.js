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
exports.ConfirmAccountDto = void 0;
const class_validator_1 = require("class-validator");
class ConfirmAccountDto {
    email;
    token;
}
exports.ConfirmAccountDto = ConfirmAccountDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'El formato del email no es válido' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'El email es obligatorio' }),
    __metadata("design:type", String)
], ConfirmAccountDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'El código de confirmación es obligatorio' }),
    (0, class_validator_1.Length)(6, 6, { message: 'El código debe tener exactamente 6 dígitos' }),
    (0, class_validator_1.Matches)(/^[0-9]+$/, { message: 'El código solo debe contener números' }),
    __metadata("design:type", String)
], ConfirmAccountDto.prototype, "token", void 0);
//# sourceMappingURL=confirm-account.dto.js.map