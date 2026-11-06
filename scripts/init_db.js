const { initDatabase, getIsPgConnected } = require('../config/db');

async function main() {
  console.log('🔄 Running manual PostgreSQL Initialization & Seeding...');
  const success = await initDatabase();
  if (success && getIsPgConnected()) {
    console.log('🎉 PostgreSQL initialization completed successfully!');
    process.exit(0);
  } else {
    console.log('⚠️ Could not connect to PostgreSQL. Please ensure PostgreSQL server is running.');
    process.exit(1);
  }
}

main();
