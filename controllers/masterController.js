const masterModel = require('../models/masterModel');

async function getConfig(req, res) {
  try {
    const config = await masterModel.getAllConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function addContinent(req, res) {
  try {
    const { name } = req.body;
    const continents = await masterModel.addContinent(name);
    res.json({ success: true, message: `Benua "${name}" berhasil ditambahkan.`, data: continents });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deleteContinent(req, res) {
  try {
    const { name } = req.params;
    const continents = await masterModel.deleteContinent(name);
    res.json({ success: true, message: `Benua "${name}" berhasil dihapus.`, data: continents });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function addCountry(req, res) {
  try {
    const countries = await masterModel.addCountry(req.body);
    res.json({ success: true, message: `Negara "${req.body.name}" berhasil ditambahkan.`, data: countries });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deleteCountry(req, res) {
  try {
    const { code } = req.params;
    const countries = await masterModel.deleteCountry(code);
    res.json({ success: true, message: `Negara dengan kode "${code}" berhasil dihapus.`, data: countries });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function addComponent(req, res) {
  try {
    const { name } = req.body;
    const components = await masterModel.addComponent(name);
    res.json({ success: true, message: `Komponen strategis "${name}" berhasil ditambahkan.`, data: components });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deleteComponent(req, res) {
  try {
    const { name } = req.params;
    const components = await masterModel.deleteComponent(name);
    res.json({ success: true, message: `Komponen strategis "${name}" berhasil dihapus.`, data: components });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function addTemplate(req, res) {
  try {
    const { type, value } = req.body;
    const list = await masterModel.addTemplate(type, value);
    res.json({ success: true, message: `Template ${type} berhasil ditambahkan.`, data: list });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deleteTemplate(req, res) {
  try {
    const { type, value } = req.params;
    const list = await masterModel.deleteTemplate(type, decodeURIComponent(value));
    res.json({ success: true, message: `Template ${type} berhasil dihapus.`, data: list });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = {
  getConfig,
  addContinent,
  deleteContinent,
  addCountry,
  deleteCountry,
  addComponent,
  deleteComponent,
  addTemplate,
  deleteTemplate,
};
