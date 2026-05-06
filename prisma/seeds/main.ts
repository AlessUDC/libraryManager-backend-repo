import { execSync } from 'child_process';

async function main() {
  try {
    console.log('Starting full database seed...');
    
    console.log('\n--- Step 1: Base Data ---');
    execSync('npx ts-node prisma/seeds/seed-base-data.ts', { stdio: 'inherit' });

    console.log('\n--- Step 2: Library Data ---');
    execSync('npx ts-node prisma/seeds/seed-library-data.ts', { stdio: 'inherit' });

    console.log('\n--- Step 3: Academic Users ---');
    execSync('npx ts-node prisma/seeds/seed-users-academic.ts', { stdio: 'inherit' });

    console.log('\n--- Step 4: Staff Users ---');
    execSync('npx ts-node prisma/seeds/seed-users-staff.ts', { stdio: 'inherit' });

    console.log('\nFull database seed completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

main();
