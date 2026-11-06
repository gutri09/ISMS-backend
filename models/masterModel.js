const fs = require('fs');
const path = require('path');
const { query, getIsPgConnected } = require('../config/db');

const CONFIG_FILE = path.resolve(__dirname, '../data/master_config.json');

const DEFAULT_CONFIG = {
  continents: [
    'Amerika',
    'Eropa',
    'Asia',
    'Afrika',
    'Australia & Pasifik',
    'Timur Tengah',
    'Global / Multilateral',
  ],
  components: [
    'Ekonomi',
    'Angkatan Bersenjata',
    'Ilmu Pengetahuan dan Teknologi',
    'Sosial',
    'Politik',
    'Geografi',
    'Demografi',
    'Transportasi dan Telekomunikasi',
    'Pertahanan & Keamanan',
    'Hukum & HAM',
  ],
  countries: [
    // Amerika
    { code: 'US', name: 'Amerika Serikat', continent: 'Amerika', subRegion: 'Amerika Utara' },
    { code: 'CA', name: 'Kanada', continent: 'Amerika', subRegion: 'Amerika Utara' },
    { code: 'MX', name: 'Meksiko', continent: 'Amerika', subRegion: 'Amerika Utara' },
    { code: 'BR', name: 'Brasil', continent: 'Amerika', subRegion: 'Amerika Selatan' },
    { code: 'AR', name: 'Argentina', continent: 'Amerika', subRegion: 'Amerika Selatan' },
    { code: 'CL', name: 'Chili', continent: 'Amerika', subRegion: 'Amerika Selatan' },
    { code: 'CO', name: 'Kolombia', continent: 'Amerika', subRegion: 'Amerika Selatan' },
    { code: 'PE', name: 'Peru', continent: 'Amerika', subRegion: 'Amerika Selatan' },
    { code: 'VE', name: 'Venezuela', continent: 'Amerika', subRegion: 'Amerika Selatan' },
    { code: 'CU', name: 'Kuba', continent: 'Amerika', subRegion: 'Karibia' },
    { code: 'PA', name: 'Panama', continent: 'Amerika', subRegion: 'Amerika Tengah' },
    // Eropa
    { code: 'GB', name: 'Inggris', continent: 'Eropa', subRegion: 'Eropa Barat' },
    { code: 'FR', name: 'Prancis', continent: 'Eropa', subRegion: 'Eropa Barat' },
    { code: 'DE', name: 'Jerman', continent: 'Eropa', subRegion: 'Eropa Barat' },
    { code: 'RU', name: 'Rusia', continent: 'Eropa', subRegion: 'Eropa Timur' },
    { code: 'UA', name: 'Ukraina', continent: 'Eropa', subRegion: 'Eropa Timur' },
    { code: 'IT', name: 'Italia', continent: 'Eropa', subRegion: 'Eropa Selatan' },
    { code: 'ES', name: 'Spanyol', continent: 'Eropa', subRegion: 'Eropa Selatan' },
    { code: 'NL', name: 'Belanda', continent: 'Eropa', subRegion: 'Eropa Barat' },
    { code: 'PL', name: 'Polandia', continent: 'Eropa', subRegion: 'Eropa Timur' },
    { code: 'TR', name: 'Turki', continent: 'Eropa', subRegion: 'Eropa Selatan' },
    { code: 'CH', name: 'Swiss', continent: 'Eropa', subRegion: 'Eropa Barat' },
    { code: 'SE', name: 'Swedia', continent: 'Eropa', subRegion: 'Eropa Utara' },
    { code: 'NO', name: 'Norwegia', continent: 'Eropa', subRegion: 'Eropa Utara' },
    { code: 'FI', name: 'Finlandia', continent: 'Eropa', subRegion: 'Eropa Utara' },
    { code: 'DK', name: 'Denmark', continent: 'Eropa', subRegion: 'Eropa Utara' },
    { code: 'BE', name: 'Belgia', continent: 'Eropa', subRegion: 'Eropa Barat' },
    { code: 'AT', name: 'Austria', continent: 'Eropa', subRegion: 'Eropa Barat' },
    { code: 'GR', name: 'Yunani', continent: 'Eropa', subRegion: 'Eropa Selatan' },
    { code: 'PT', name: 'Portugal', continent: 'Eropa', subRegion: 'Eropa Selatan' },
    // Asia (tambahan dinamis)
    { code: 'CN', name: 'Tiongkok', continent: 'Asia', subRegion: 'Asia Timur' },
    { code: 'JP', name: 'Jepang', continent: 'Asia', subRegion: 'Asia Timur' },
    { code: 'KR', name: 'Korea Selatan', continent: 'Asia', subRegion: 'Asia Timur' },
    { code: 'IN', name: 'India', continent: 'Asia', subRegion: 'Asia Selatan' },
    { code: 'ID', name: 'Indonesia', continent: 'Asia', subRegion: 'Asia Tenggara' },
    { code: 'SG', name: 'Singapura', continent: 'Asia', subRegion: 'Asia Tenggara' },
  ],
  kegiatanTemplates: [
    'Kunjungan Kenegaraan',
    'Pertemuan Bilateral',
    'Latihan Militer Bersama',
    'Perjanjian Pertahanan & Keamanan',
    'Krisis Diplomatik & Pengusiran Staf',
    'Penjatuhan Sanksi Ekonomi & Dagang',
    'Konflik Bersenjata & Manuver Pasukan',
    'Uji Coba Senjata Strategis & Rudal',
    'KTT Internasional & Pakta Multilateral',
    'Kerja Sama Riset Teknologi & Kedirgantaraan',
    'Spionase & Operasi Siber Antarnegara',
  ],
  bentukKegiatanTemplates: [
    'Pertemuan Bilateral',
    'Penandatanganan MoU / Traktat',
    'KTT / Konferensi Tingkat Tinggi',
    'Latihan Manuver Gabungan',
    'Deklarasi Pernyataan Resmi Bersama',
    'Pemberian Paket Bantuan Militer',
    'Operasi Khusus / Intelijen',
    'Uji Coba Rudal Balistik Antarbenua',
    'Sidang Dewan Keamanan PBB',
    'Pembekuan Aset & Embargo Perdagangan',
  ],
};

function readLocalConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
      return DEFAULT_CONFIG;
    }
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return { ...DEFAULT_CONFIG, ...data };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function writeLocalConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing master config file:', err);
    return false;
  }
}

class MasterModel {
  async getAllConfig() {
    let fullConfig = readLocalConfig();

    if (getIsPgConnected()) {
      try {
        const res = await query('SELECT key, value FROM master_config');
        if (res.rows.length > 0) {
          const pgConfig = {};
          for (const row of res.rows) {
            pgConfig[row.key] = row.value;
          }
          fullConfig = { ...fullConfig, ...pgConfig };
        } else {
          // Seed pg with defaults
          for (const [key, value] of Object.entries(fullConfig)) {
            await query(
              'INSERT INTO master_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
              [key, JSON.stringify(value)]
            );
          }
        }
      } catch (err) {
        console.warn('[PostgreSQL Master Config Error, using fallback]:', err.message);
      }
    }

    return fullConfig;
  }

  async setConfigKey(key, value) {
    const current = readLocalConfig();
    current[key] = value;
    writeLocalConfig(current);

    if (getIsPgConnected()) {
      try {
        await query(
          `INSERT INTO master_config (key, value, updated_at) 
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
          [key, JSON.stringify(value)]
        );
      } catch (err) {
        console.warn('[PostgreSQL setConfigKey Error]:', err.message);
      }
    }

    return current;
  }

  async addContinent(name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nama benua tidak boleh kosong.');
    const cfg = await this.getAllConfig();
    const continents = cfg.continents || [];
    if (continents.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Benua "${trimmed}" sudah terdaftar.`);
    }
    continents.push(trimmed);
    await this.setConfigKey('continents', continents);
    return continents;
  }

  async deleteContinent(name) {
    const cfg = await this.getAllConfig();
    const continents = (cfg.continents || []).filter((c) => c.toLowerCase() !== name.toLowerCase());
    await this.setConfigKey('continents', continents);
    return continents;
  }

  async addCountry(countryObj) {
    if (!countryObj.name || !countryObj.code) {
      throw new Error('Nama dan Kode ISO negara wajib diisi.');
    }
    const cfg = await this.getAllConfig();
    const countries = cfg.countries || [];
    const exists = countries.find(
      (c) => c.code.toLowerCase() === countryObj.code.toLowerCase() || c.name.toLowerCase() === countryObj.name.toLowerCase()
    );
    if (exists) {
      throw new Error(`Negara dengan kode "${countryObj.code}" atau nama "${countryObj.name}" sudah ada.`);
    }
    const newCountry = {
      code: countryObj.code.trim().toUpperCase(),
      name: countryObj.name.trim(),
      continent: countryObj.continent || 'Lainnya',
      subRegion: (countryObj.subRegion || '').trim(),
    };
    countries.push(newCountry);
    await this.setConfigKey('countries', countries);
    return countries;
  }

  async deleteCountry(code) {
    const cfg = await this.getAllConfig();
    const countries = (cfg.countries || []).filter((c) => c.code.toUpperCase() !== code.toUpperCase());
    await this.setConfigKey('countries', countries);
    return countries;
  }

  async addComponent(name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nama komponen strategis / bidang tidak boleh kosong.');
    const cfg = await this.getAllConfig();
    const components = cfg.components || [];
    if (components.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Bidang "${trimmed}" sudah ada.`);
    }
    components.push(trimmed);
    await this.setConfigKey('components', components);
    return components;
  }

  async deleteComponent(name) {
    const cfg = await this.getAllConfig();
    const components = (cfg.components || []).filter((c) => c.toLowerCase() !== name.toLowerCase());
    await this.setConfigKey('components', components);
    return components;
  }

  async addTemplate(type, value) {
    const key = type === 'kegiatan' ? 'kegiatanTemplates' : 'bentukKegiatanTemplates';
    const trimmed = value.trim();
    if (!trimmed) throw new Error('Template tidak boleh kosong.');
    const cfg = await this.getAllConfig();
    const list = cfg[key] || [];
    if (list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Template "${trimmed}" sudah ada.`);
    }
    list.push(trimmed);
    await this.setConfigKey(key, list);
    return list;
  }

  async deleteTemplate(type, value) {
    const key = type === 'kegiatan' ? 'kegiatanTemplates' : 'bentukKegiatanTemplates';
    const cfg = await this.getAllConfig();
    const list = (cfg[key] || []).filter((item) => item.toLowerCase() !== value.toLowerCase());
    await this.setConfigKey(key, list);
    return list;
  }
}

module.exports = new MasterModel();
