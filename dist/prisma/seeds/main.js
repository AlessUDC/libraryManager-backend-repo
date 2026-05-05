"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
async function main() {
    try {
        console.log('Starting full database seed...');
        console.log('\n--- Step 1: Base Data ---');
        (0, child_process_1.execSync)('npx ts-node prisma/seeds/seed-base-data.ts', { stdio: 'inherit' });
        console.log('\n--- Step 2: Academic Users ---');
        (0, child_process_1.execSync)('npx ts-node prisma/seeds/seed-users-academic.ts', { stdio: 'inherit' });
        console.log('\n--- Step 3: Staff Users ---');
        (0, child_process_1.execSync)('npx ts-node prisma/seeds/seed-users-staff.ts', { stdio: 'inherit' });
        console.log('\nFull database seed completed successfully!');
    }
    catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=main.js.map