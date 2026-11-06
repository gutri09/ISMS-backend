const fs = require('fs');
const path = require('path');
const { query, getIsPgConnected } = require('../config/db');

const USERS_FILE = path.resolve(__dirname, '../data/users.json');

const DEFAULT_USERS = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    name: 'Superadmin Pengendali Sistem',
    email: 'admin@kemhan.mil.id',
    password: 'admin123',
    role: 'admin',
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'usr-analis-01',
    username: 'analis',
    name: 'Letda Lek Gutri Rahmad Zuwa',
    email: 'gutri.analis@kemhan.mil.id',
    password: 'analis123',
    role: 'analis',
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'usr-pimpinan-01',
    username: 'pimpinan',
    name: 'Direktur Pemantauan Strategis',
    email: 'pimpinan@kemhan.mil.id',
    password: 'pimpinan123',
    role: 'pimpinan',
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
];

function readLocalUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf8');
      return DEFAULT_USERS;
    }
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (!Array.isArray(data) || data.length === 0) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf8');
      return DEFAULT_USERS;
    }
    return data;
  } catch {
    return DEFAULT_USERS;
  }
}

function writeLocalUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing users file:', err);
    return false;
  }
}

function formatRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email || '',
    password: row.password,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

class UserModel {
  async getAll() {
    if (getIsPgConnected()) {
      try {
        const res = await query('SELECT * FROM users ORDER BY created_at ASC');
        return res.rows.map(formatRowToUser).map(({ password, ...u }) => u);
      } catch (err) {
        console.warn('[PostgreSQL Users Error, using local fallback]:', err.message);
      }
    }
    const users = readLocalUsers();
    return users.map(({ password, ...u }) => u);
  }

  async getById(id) {
    if (getIsPgConnected()) {
      try {
        const res = await query('SELECT * FROM users WHERE id = $1', [id]);
        return res.rows[0] ? formatRowToUser(res.rows[0]) : null;
      } catch (err) {
        console.warn('[PostgreSQL Users Error, using local fallback]:', err.message);
      }
    }
    const users = readLocalUsers();
    return users.find((u) => u.id === id) || null;
  }

  async getByUsername(username) {
    const q = username.trim().toLowerCase();
    if (getIsPgConnected()) {
      try {
        const res = await query('SELECT * FROM users WHERE LOWER(username) = $1', [q]);
        return res.rows[0] ? formatRowToUser(res.rows[0]) : null;
      } catch (err) {
        console.warn('[PostgreSQL Users Error, using local fallback]:', err.message);
      }
    }
    const users = readLocalUsers();
    return users.find((u) => u.username.toLowerCase() === q) || null;
  }

  async authenticate(username, password) {
    const user = await this.getByUsername(username);
    if (!user) return null;
    if (user.password !== password) return null;
    if (!user.isActive) throw new Error('Akun dinonaktifkan oleh Administrator');

    const { password: _, ...cleanUser } = user;
    return cleanUser;
  }

  async create({ username, name, email, password, role }) {
    const existing = await this.getByUsername(username);
    if (existing) throw new Error(`Username "${username}" sudah digunakan.`);

    const now = new Date().toISOString();
    const id = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newUser = {
      id,
      username: username.trim().toLowerCase(),
      name: name.trim(),
      email: (email || '').trim(),
      password: password || '123456',
      role: ['admin', 'analis', 'pimpinan'].includes(role) ? role : 'analis',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    if (getIsPgConnected()) {
      try {
        await query(
          `INSERT INTO users (id, username, name, email, password, role, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newUser.id,
            newUser.username,
            newUser.name,
            newUser.email,
            newUser.password,
            newUser.role,
            newUser.isActive,
            now,
            now,
          ]
        );
      } catch (err) {
        console.warn('[PostgreSQL Create User Error]:', err.message);
      }
    }

    const users = readLocalUsers();
    users.push(newUser);
    writeLocalUsers(users);

    const { password: _, ...clean } = newUser;
    return clean;
  }

  async update(id, updates) {
    const now = new Date().toISOString();
    const users = readLocalUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Akun pengguna tidak ditemukan.');

    if (getIsPgConnected()) {
      try {
        const fields = [];
        const values = [];
        let pIdx = 1;

        if (updates.name) { fields.push(`name = $${pIdx++}`); values.push(updates.name); }
        if (updates.email !== undefined) { fields.push(`email = $${pIdx++}`); values.push(updates.email); }
        if (updates.role) { fields.push(`role = $${pIdx++}`); values.push(updates.role); }
        if (updates.password) { fields.push(`password = $${pIdx++}`); values.push(updates.password); }
        if (updates.isActive !== undefined) { fields.push(`is_active = $${pIdx++}`); values.push(updates.isActive); }

        fields.push(`updated_at = $${pIdx++}`);
        values.push(now);

        values.push(id);
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${pIdx} RETURNING *`;
        const res = await query(sql, values);
        if (res.rows[0]) {
          const updated = formatRowToUser(res.rows[0]);
          users[idx] = updated;
          writeLocalUsers(users);
          const { password: _, ...clean } = updated;
          return clean;
        }
      } catch (err) {
        console.warn('[PostgreSQL Update User Error]:', err.message);
      }
    }

    users[idx] = { ...users[idx], ...updates, updatedAt: now };
    writeLocalUsers(users);
    const { password: _, ...clean } = users[idx];
    return clean;
  }

  async delete(id) {
    const user = await this.getById(id);
    if (!user) throw new Error('Pengguna tidak ditemukan.');
    if (user.username === 'admin') throw new Error('Akun superadmin utama tidak dapat dihapus.');

    if (getIsPgConnected()) {
      try {
        await query('DELETE FROM users WHERE id = $1', [id]);
      } catch (err) {
        console.warn('[PostgreSQL Delete User Error]:', err.message);
      }
    }

    const users = readLocalUsers().filter((u) => u.id !== id);
    writeLocalUsers(users);
    return true;
  }
}

module.exports = new UserModel();
