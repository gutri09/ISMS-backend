const recordModel = require('../models/recordModel');
const { getIsPgConnected } = require('../config/db');

exports.getHealth = async (req, res) => {
  const records = await recordModel.getAll();
  res.json({
    status: 'ONLINE',
    system: 'ISMS Enterprise Intelligence API',
    scope: 'Amerika & Eropa',
    databaseEngine: getIsPgConnected() ? 'PostgreSQL 16' : 'Hybrid Local Storage (JSON Fallback)',
    isPostgresConnected: getIsPgConnected(),
    recordsCount: records.length,
    timestamp: new Date().toISOString(),
  });
};

exports.getAllRecords = async (req, res) => {
  try {
    const records = await recordModel.getAll();
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getRecordById = async (req, res) => {
  try {
    const record = await recordModel.getById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Rekaman tidak ditemukan' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createRecord = async (req, res) => {
  try {
    const { tanggal, negara, bidang, isuUtama } = req.body;
    if (!tanggal || !negara || !bidang || !isuUtama) {
      return res.status(400).json({
        success: false,
        error: 'Data tidak lengkap. Field tanggal, negara, bidang, dan isu utama wajib diisi.',
      });
    }
    const newRecord = await recordModel.create(req.body);
    res.status(201).json({ success: true, data: newRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const updated = await recordModel.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Rekaman tidak ditemukan' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    await recordModel.delete(req.params.id);
    res.json({ success: true, message: 'Rekaman berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.bulkDeleteRecords = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Array IDs kosong atau tidak valid' });
    }
    const deletedCount = await recordModel.bulkDelete(ids);
    const all = await recordModel.getAll();
    res.json({ success: true, deleted: deletedCount, remaining: all.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.bulkImportRecords = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Array rekaman kosong atau tidak valid' });
    }
    const result = await recordModel.bulkInsert(records);
    res.json({ success: true, inserted: result.inserted, total: result.total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.resetRealDataset = async (req, res) => {
  try {
    const count = await recordModel.resetReal();
    res.json({
      success: true,
      message: 'Database berhasil direset ke 407 Rekaman Riil Pentabelan Amerop 2026',
      count,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
