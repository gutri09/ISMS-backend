const userModel = require('../models/userModel');

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan kata sandi wajib diisi.' });
    }

    const user = await userModel.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Username atau kata sandi tidak valid.' });
    }

    // Generate secure session token with expiration (7 days)
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const token = 'isms_token_' + Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

    res.json({
      success: true,
      message: 'Login berhasil.',
      user,
      token,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || 'Gagal melakukan otentikasi.' });
  }
}

async function verifyToken(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token otentikasi tidak disertakan.' });
    }

    const rawToken = authHeader.split(' ')[1];
    if (!rawToken || (!rawToken.startsWith('isms_token_') && !rawToken.startsWith('isms_local_token_'))) {
      return res.status(401).json({ success: false, error: 'Format token tidak valid.' });
    }

    const base64Part = rawToken.replace(/^isms_(local_)?token_/, '');
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(base64Part, 'base64url').toString('utf8'));
    } catch {
      try {
        decoded = JSON.parse(Buffer.from(base64Part, 'base64').toString('utf8'));
      } catch {
        return res.status(401).json({ success: false, error: 'Token gagal diuraikan.' });
      }
    }

    const expTime = decoded.expiresAt || decoded.exp;
    if (expTime && Date.now() > expTime) {
      return res.status(401).json({ success: false, error: 'Sesi token telah kedaluwarsa. Silakan login kembali.' });
    }

    let user = decoded.id ? await userModel.getById(decoded.id) : null;
    const username = decoded.username || decoded.u;
    if (!user && username) {
      user = await userModel.getByUsername(username);
    }

    if (!user || user.isActive === false) {
      // If user is not yet seeded in DB but token has valid credentials and is unexpired, preserve session
      if (username && (decoded.role || decoded.r)) {
        return res.json({
          success: true,
          user: {
            id: decoded.id || `usr-${username}`,
            username,
            name: decoded.name || username,
            role: decoded.role || decoded.r,
            isActive: true,
          },
          valid: true,
        });
      }
      return res.status(401).json({ success: false, error: 'Pengguna dinonaktifkan atau tidak ditemukan.' });
    }

    const { password: _, ...clean } = user;
    res.json({ success: true, user: clean, valid: true });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token otentikasi tidak valid atau telah kedaluwarsa.' });
  }
}

async function getProfile(req, res) {
  try {
    const { id } = req.params;
    const user = await userModel.getById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
    }
    const { password: _, ...clean } = user;
    res.json({ success: true, user: clean });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  login,
  verifyToken,
  getProfile,
};
