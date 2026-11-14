import { seedDemoData } from '../src/lib/demoSeeder';

async function main() {
  console.log('--- STARTING DEMO DATA SEEDING TO CLOUD FIRESTORE ---');
  const startTime = Date.now();

  try {
    const report = await seedDemoData((stage, percent) => {
      console.log(`[${percent}%] ${stage}`);
    });

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== SEEDING COMPLETED IN ${elapsedSec}s ===`);
    console.log('Seeded Status Report:');
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (error: any) {
    console.error('\n*** SEEDING FAILED ***');
    console.error(error);
    process.exit(1);
  }
}

main();
