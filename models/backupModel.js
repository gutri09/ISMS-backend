const fs = require('fs');
const path = require('path');
const { query, getIsPgConnected } = require('../config/db');
const recordModel = require('./recordModel');

const BACKUP_FILE = path.resolve(__dirname, '../data/database_backup.json');
const BACKUP_META_FILE = path.resolve(__dirname, '../data/backup_metadata.json');

class BackupModel {
  async getStatus() {
    if (getIsPgConnected()) {
      try {
        const res = await query('SELECT * FROM backup_snapshots ORDER BY saved_at DESC LIMIT 1');
        if (res.rows[0]) {
          return {
            exists: true,
            count: res.rows[0].record_count,
            savedAt: new Date(res.rows[0].saved_at).toISOString(),
            note: res.rows[0].note,
          };
        }
      } catch (err) {
        console.warn('[PostgreSQL Backup Status Error, using local fallback]:', err.message);
      }
    }

    if (fs.existsSync(BACKUP_FILE)) {
      let meta = { exists: true, count: 0, savedAt: null };
      if (fs.existsSync(BACKUP_META_FILE)) {
        try {
          meta = JSON.parse(fs.readFileSync(BACKUP_META_FILE, 'utf8'));
        } catch {}
      }
      if (!meta.count) {
        try {
          const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
          const parsed = JSON.parse(raw);
          meta.count = Array.isArray(parsed) ? parsed.length : 0;
        } catch {}
      }
      return { success: true, ...meta };
    }

    return { exists: false, count: 0, savedAt: null };
  }

  async saveBackup(providedRecords) {
    let currentRecords = providedRecords;
    if (!currentRecords || !Array.isArray(currentRecords) || currentRecords.length === 0) {
      currentRecords = await recordModel.getAll();
    }
    const now = new Date().toISOString();
    const backupId = `backup-${Date.now()}`;

    // 1. Save in PostgreSQL if connected
    if (getIsPgConnected()) {
      try {
        await query(
          `INSERT INTO backup_snapshots (id, saved_at, record_count, snapshot_data, note)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            backupId,
            now,
            currentRecords.length,
            JSON.stringify(currentRecords),
            'Titik Pemulihan Cadangan Sistem ISMS',
          ]
        );
      } catch (err) {
        console.warn('[PostgreSQL Save Backup Error]:', err.message);
      }
    }

    // 2. Also save to local backup file (Dual persistence)
    try {
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(currentRecords, null, 2), 'utf8');
      const meta = {
        exists: true,
        count: currentRecords.length,
        savedAt: now,
      };
      fs.writeFileSync(BACKUP_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing local backup file:', e);
    }

    return {
      success: true,
      id: backupId,
      count: currentRecords.length,
      savedAt: now,
    };
  }

  async restoreBackup() {
    let backupRecords = null;

    // 1. Try reading from PostgreSQL
    if (getIsPgConnected()) {
      try {
        const res = await query('SELECT * FROM backup_snapshots ORDER BY saved_at DESC LIMIT 1');
        if (res.rows[0]) {
          const raw = res.rows[0].snapshot_data;
          backupRecords = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
      } catch (err) {
        console.warn('[PostgreSQL Restore Backup Error]:', err.message);
      }
    }

    // 2. Fallback to local file if needed
    if (!backupRecords && fs.existsSync(BACKUP_FILE)) {
      try {
        const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
        backupRecords = JSON.parse(raw);
      } catch (e) {
        console.error('Error reading local backup file:', e);
      }
    }

    if (!Array.isArray(backupRecords)) {
      throw new Error('Tidak ada data cadangan yang valid untuk dipulihkan');
    }

    // 3. Restore into records table
    if (getIsPgConnected()) {
      try {
        await query('TRUNCATE TABLE intelligence_records');
        for (const r of backupRecords) {
          await query(
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
      } catch (err) {
        console.warn('[PostgreSQL Restore Table Error]:', err.message);
      }
    }

    // Also write back to local database.json
    const DB_FILE = path.resolve(__dirname, '../data/database.json');
    fs.writeFileSync(DB_FILE, JSON.stringify(backupRecords, null, 2), 'utf8');

    return {
      success: true,
      count: backupRecords.length,
      restoredAt: new Date().toISOString(),
      data: backupRecords,
    };
  }
}

module.exports = new BackupModel();
