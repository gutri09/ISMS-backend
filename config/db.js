const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool = null;
let isPgConnected = false;

// PostgreSQL Connection Options
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'isms_intelligence_db',
    };

function getPool() {
  if (!pool) {
    pool = new Pool({
      ...connectionConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });

    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Warning]', err.message);
    });
  }
  return pool;
}

// Execute query with fallback safety
async function query(text, params = []) {
  if (!isPgConnected) {
    throw new Error('PostgreSQL is not connected');
  }
  const p = getPool();
  return p.query(text, params);
}

// Initialize PostgreSQL Schema & Baseline Data
async function initDatabase() {
  const p = getPool();
  try {
    const client = await p.connect();
    console.log('✅ [PostgreSQL] Connected to database server successfully!');
    isPgConnected = true;

    // 1. Run Schema DDL
    const schemaPath = path.resolve(__dirname, '../sql/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ [PostgreSQL] Tables & indexes initialized (intelligence_records, backup_snapshots, app_metadata).');
    }

    // 2. Check if records table is empty; if so, auto-seed from database.json
    const countRes = await client.query('SELECT COUNT(*) FROM intelligence_records');
    const currentCount = parseInt(countRes.rows[0].count, 10);

    const dbDataPath = path.resolve(__dirname, '../data/database.json');
    if (currentCount === 0 && fs.existsSync(dbDataPath)) {
      console.log('📦 [PostgreSQL] Seeding primary database records into PostgreSQL...');
      const dbRecords = JSON.parse(fs.readFileSync(dbDataPath, 'utf8'));

      for (const r of dbRecords) {
        await client.query(
          `INSERT INTO intelligence_records 
          (id, tanggal, benua, negara, negara_code, bidang, kegiatan, bentuk_kegiatan, isu_utama, tokoh, sumber_url, attachments, status_sumber, is_demo, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO NOTHING`,
          [
            r.id,
            r.tanggal,
            r.benua,
            r.negara,
            r.negaraCode || null,
            r.bidang,
            r.kegiatan,
            r.bentukKegiatan,
            r.isuUtama,
            r.tokoh || null,
            r.sumberUrl || null,
            JSON.stringify(r.attachments || []),
            r.statusSumber || 'lengkap',
            Boolean(r.isDemo),
            r.createdAt || new Date().toISOString(),
            r.updatedAt || new Date().toISOString(),
          ]
        );
      }
      console.log(`✅ [PostgreSQL] Successfully seeded ${dbRecords.length} records into intelligence_records table!`);
    } else {
      console.log(`ℹ️ [PostgreSQL] intelligence_records table contains ${currentCount} records.`);
    }

    // 3. Ensure baseline backup exists in PostgreSQL
    const backupCountRes = await client.query('SELECT COUNT(*) FROM backup_snapshots');
    if (parseInt(backupCountRes.rows[0].count, 10) === 0 && fs.existsSync(dbDataPath)) {
      const dbRecords = JSON.parse(fs.readFileSync(dbDataPath, 'utf8'));
      await client.query(
        `INSERT INTO backup_snapshots (id, saved_at, record_count, snapshot_data, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'backup-baseline',
          new Date().toISOString(),
          dbRecords.length,
          JSON.stringify(dbRecords.slice(0, 100)),
          'Titik Cadangan Awal (Baseline Database ISMS)',
        ]
      );
      console.log('✅ [PostgreSQL] Baseline backup snapshot registered in backup_snapshots table.');
    }

    client.release();
    return true;
  } catch (err) {
    isPgConnected = false;
    console.warn(`⚠️ [PostgreSQL] Connection to PostgreSQL failed (${err.message}).`);
    console.log('🔄 [PostgreSQL Fallback] Active mode: HYBRID LOCAL FALLBACK ENGINE.');
    console.log('   Sistem tetap berfungsi 100% menggunakan basis data lokal terverifikasi.');
    console.log('   Jalankan PostgreSQL lokal atau "docker compose up -d" untuk mengaktifkan koneksi server.');
    return false;
  }
}

module.exports = {
  getPool,
  query,
  getIsPgConnected: () => isPgConnected,
  initDatabase,
};
