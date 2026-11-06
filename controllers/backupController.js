const backupModel = require('../models/backupModel');

exports.getBackupStatus = async (req, res) => {
  try {
    const status = await backupModel.getStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.saveBackup = async (req, res) => {
  try {
    const providedRecords = req.body && Array.isArray(req.body.records) ? req.body.records : null;
    const result = await backupModel.saveBackup(providedRecords);
    res.json({
      success: true,
      message: 'Cadangan berhasil disimpan (menggantikan cadangan sebelumnya)',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const result = await backupModel.restoreBackup();
    res.json({
      success: true,
      message: 'Data berhasil dipulihkan dari cadangan',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
