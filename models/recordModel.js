const fs = require('fs');
const path = require('path');
const { query, getIsPgConnected } = require('../config/db');

const DB_FILE = path.resolve(__dirname, '../data/database.json');

// Local file helper
function readLocalDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading local DB:', e);
    return [];
  }
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing local DB:', e);
    return false;
  }
}

// Convert PostgreSQL snake_case row to frontend camelCase record
function formatRowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    tanggal: row.tanggal instanceof Date ? row.tanggal.toISOString().split('T')[0] : String(row.tanggal),
    benua: row.benua,
    negara: row.negara,
    negaraCode: row.negara_code || '',
    bidang: row.bidang,
    kegiatan: row.kegiatan,
    bentukKegiatan: row.bentuk_kegiatan,
    isuUtama: row.isu_utama,
    tokoh: row.tokoh || '',
    sumberUrl: row.sumber_url || '',
    attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments || [],
    statusSumber: row.status_sumber || 'lengkap',
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

class RecordModel {
  async getAll() {
    if (getIsPgConnected()) {
      try {
        const res = await query('SELECT * FROM intelligence_records ORDER BY tanggal DESC, created_at DESC');
        return res.rows.map(formatRowToRecord);
      } catch (err) {
        console.warn('[PostgreSQL Query Error, using local fallback]:', err.message);
      }
    }
    return readLocalDB();
  }

  async getById(id) {
    if (getIsPgConnected()) {
      try {
        const res = await query('SELECT * FROM intelligence_records WHERE id = $1', [id]);
        return res.rows[0] ? formatRowToRecord(res.rows[0]) : null;
      } catch (err) {
        console.warn('[PostgreSQL Query Error, using local fallback]:', err.message);
      }
    }
    const db = readLocalDB();
    return db.find((r) => r.id === id) || null;
  }

  async create(record) {
    const now = new Date().toISOString();
    const id = record.id || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const formatted = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (getIsPgConnected()) {
      try {
        await query(
          `INSERT INTO intelligence_records 
          (id, tanggal, benua, negara, negara_code, bidang, kegiatan, bentuk_kegiatan, isu_utama, tokoh, sumber_url, attachments, status_sumber, is_demo, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            id,
            record.tanggal,
            record.benua,
            record.negara,
            record.negaraCode || null,
            record.bidang,
            record.kegiatan,
            record.bentukKegiatan,
            record.isuUtama,
            record.tokoh || null,
            record.sumberUrl || null,
            JSON.stringify(record.attachments || []),
            record.statusSumber || 'lengkap',
            Boolean(record.isDemo),
            now,
            now,
          ]
        );
        // Also keep local DB in sync
        const db = readLocalDB();
        db.unshift(formatted);
        writeLocalDB(db);
        return formatted;
      } catch (err) {
        console.warn('[PostgreSQL Insert Error, using local fallback]:', err.message);
      }
    }

    const db = readLocalDB();
    db.unshift(formatted);
    writeLocalDB(db);
    return formatted;
  }

  async update(id, updates) {
    const now = new Date().toISOString();

    if (getIsPgConnected()) {
      try {
        const fields = [];
        const values = [];
        let pIdx = 1;

        if (updates.tanggal) { fields.push(`tanggal = $${pIdx++}`); values.push(updates.tanggal); }
        if (updates.benua) { fields.push(`benua = $${pIdx++}`); values.push(updates.benua); }
        if (updates.negara) { fields.push(`negara = $${pIdx++}`); values.push(updates.negara); }
        if (updates.negaraCode !== undefined) { fields.push(`negara_code = $${pIdx++}`); values.push(updates.negaraCode); }
        if (updates.bidang) { fields.push(`bidang = $${pIdx++}`); values.push(updates.bidang); }
        if (updates.kegiatan) { fields.push(`kegiatan = $${pIdx++}`); values.push(updates.kegiatan); }
        if (updates.bentukKegiatan) { fields.push(`bentuk_kegiatan = $${pIdx++}`); values.push(updates.bentukKegiatan); }
        if (updates.isuUtama) { fields.push(`isu_utama = $${pIdx++}`); values.push(updates.isuUtama); }
        if (updates.tokoh !== undefined) { fields.push(`tokoh = $${pIdx++}`); values.push(updates.tokoh); }
        if (updates.sumberUrl !== undefined) { fields.push(`sumber_url = $${pIdx++}`); values.push(updates.sumberUrl); }
        if (updates.attachments !== undefined) { fields.push(`attachments = $${pIdx++}`); values.push(JSON.stringify(updates.attachments)); }
        if (updates.statusSumber) { fields.push(`status_sumber = $${pIdx++}`); values.push(updates.statusSumber); }

        fields.push(`updated_at = $${pIdx++}`);
        values.push(now);

        values.push(id);
        const sql = `UPDATE intelligence_records SET ${fields.join(', ')} WHERE id = $${pIdx} RETURNING *`;
        const res = await query(sql, values);
        if (res.rows[0]) {
          const updated = formatRowToRecord(res.rows[0]);
          const db = readLocalDB();
          const idx = db.findIndex((r) => r.id === id);
          if (idx !== -1) { db[idx] = updated; writeLocalDB(db); }
          return updated;
        }
      } catch (err) {
        console.warn('[PostgreSQL Update Error, using local fallback]:', err.message);
      }
    }

    const db = readLocalDB();
    const idx = db.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    db[idx] = { ...db[idx], ...updates, updatedAt: now };
    writeLocalDB(db);
    return db[idx];
  }

  async delete(id) {
    if (getIsPgConnected()) {
      try {
        await query('DELETE FROM intelligence_records WHERE id = $1', [id]);
      } catch (err) {
        console.warn('[PostgreSQL Delete Error, using local fallback]:', err.message);
      }
    }
    const db = readLocalDB();
    const filtered = db.filter((r) => r.id !== id);
    writeLocalDB(filtered);
    return true;
  }

  async bulkDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    if (getIsPgConnected()) {
      try {
        await query('DELETE FROM intelligence_records WHERE id = ANY($1)', [ids]);
      } catch (err) {
        console.warn('[PostgreSQL Bulk Delete Error, using local fallback]:', err.message);
      }
    }
    const idSet = new Set(ids);
    const db = readLocalDB();
    const filtered = db.filter((r) => !idSet.has(r.id));
    const deletedCount = db.length - filtered.length;
    writeLocalDB(filtered);
    return deletedCount;
  }

  async bulkInsert(records) {
    if (!Array.isArray(records) || records.length === 0) return { inserted: 0, total: 0 };
    const now = new Date().toISOString();
    const formattedList = records.map((r, idx) => ({
      ...r,
      id: r.id || `bulk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: r.createdAt || now,
      updatedAt: now,
    }));

    if (getIsPgConnected()) {
      try {
        for (const r of formattedList) {
          await query(
            `INSERT INTO intelligence_records 
            (id, tanggal, benua, negara, negara_code, bidang, kegiatan, bentuk_kegiatan, isu_utama, tokoh, sumber_url, attachments, status_sumber, is_demo, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO UPDATE SET
              tanggal = EXCLUDED.tanggal,
              bidang = EXCLUDED.bidang,
              kegiatan = EXCLUDED.kegiatan,
              bentuk_kegiatan = EXCLUDED.bentuk_kegiatan,
              isu_utama = EXCLUDED.isu_utama,
              tokoh = EXCLUDED.tokoh,
              updated_at = EXCLUDED.updated_at`,
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
              r.createdAt,
              r.updatedAt,
            ]
          );
        }
      } catch (err) {
        console.warn('[PostgreSQL Bulk Insert Error, using local fallback]:', err.message);
      }
    }

    const db = readLocalDB();
    const updated = [...formattedList, ...db];
    writeLocalDB(updated);
    return { inserted: formattedList.length, total: updated.length };
  }

  async resetReal() {
    if (!fs.existsSync(DB_FILE)) throw new Error('database.json not found');
    const realData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

    if (getIsPgConnected()) {
      try {
        await query('TRUNCATE TABLE intelligence_records');
        for (const r of realData) {
          await query(
            `INSERT INTO intelligence_records 
            (id, tanggal, benua, negara, negara_code, bidang, kegiatan, bentuk_kegiatan, isu_utama, tokoh, sumber_url, attachments, status_sumber, is_demo, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
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
        console.warn('[PostgreSQL Reset Error, using local fallback]:', err.message);
      }
    }

    writeLocalDB(realData);
    return realData.length;
  }
}

module.exports = new RecordModel();
