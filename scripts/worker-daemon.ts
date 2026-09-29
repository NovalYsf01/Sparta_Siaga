import { startServerDaemon } from '../lib/server-daemon';

console.log('Starting standalone SPARTA Sentinel Worker Daemon...');
startServerDaemon();

// Keep process alive indefinitely
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down worker daemon...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nTerminating worker daemon...');
  process.exit(0);
});
