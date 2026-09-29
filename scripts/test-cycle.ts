import { runAutonomousDisasterCycle } from '../lib/server-daemon';

async function test() {
  console.log('Running test cycle of autonomous server daemon...');
  await runAutonomousDisasterCycle();
  console.log('Test cycle finished successfully!');
  process.exit(0);
}

test().catch(err => {
  console.error('Fatal in test cycle:', err);
  process.exit(1);
});
