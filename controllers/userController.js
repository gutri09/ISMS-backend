const userModel = require('../models/userModel');

async function getAllUsers(req, res) {
  try {
    const users = await userModel.getAll();
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getUserById(req, res) {
  try {
    const user = await userModel.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
    }
    const { password: _, ...clean } = user;
    res.json({ success: true, data: clean });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function createUser(req, res) {
  try {
    const { username, name, email, password, role } = req.body;
    if (!username || !name) {
      return res.status(400).json({ success: false, error: 'Username dan Nama wajib diisi.' });
    }

    const newUser = await userModel.create({ username, name, email, password, role });
    res.status(201).json({ success: true, message: 'Akun pengguna berhasil dibuat.', data: newUser });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updated = await userModel.update(id, req.body);
    res.json({ success: true, message: 'Akun pengguna berhasil diperbarui.', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await userModel.delete(id);
    res.json({ success: true, message: 'Akun pengguna berhasil dihapus.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
