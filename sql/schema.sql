-- ======================================================================
-- INTELLIGENCE STRATEGIC MONITORING SYSTEM (ISMS) - POSTGRESQL SCHEMA
-- Subdirektorat Pemantauan Strategis Kawasan Amerika dan Eropa
-- ======================================================================

-- 1. Users & RBAC Authentication Table (admin, analis, pimpinan)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'analis', 'pimpinan')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Main Intelligence Records Table
CREATE TABLE IF NOT EXISTS intelligence_records (
    id VARCHAR(100) PRIMARY KEY,
    tanggal DATE NOT NULL,
    benua VARCHAR(50) NOT NULL,
    negara VARCHAR(100) NOT NULL,
    negara_code VARCHAR(10),
    bidang VARCHAR(100) NOT NULL,
    kegiatan VARCHAR(255) NOT NULL,
    bentuk_kegiatan VARCHAR(255) NOT NULL,
    isu_utama TEXT NOT NULL,
    tokoh TEXT,
    sumber_url TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    status_sumber VARCHAR(50) DEFAULT 'lengkap',
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Analytical & Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_records_tanggal ON intelligence_records(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_records_benua ON intelligence_records(benua);
CREATE INDEX IF NOT EXISTS idx_records_negara ON intelligence_records(negara);
CREATE INDEX IF NOT EXISTS idx_records_bidang ON intelligence_records(bidang);
CREATE INDEX IF NOT EXISTS idx_records_kegiatan ON intelligence_records(kegiatan);
CREATE INDEX IF NOT EXISTS idx_records_bentuk_kegiatan ON intelligence_records(bentuk_kegiatan);

-- 3. Backup Snapshots Table (Point-in-Time Recovery for Bulk Imports)
CREATE TABLE IF NOT EXISTS backup_snapshots (
    id VARCHAR(100) PRIMARY KEY,
    saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    record_count INT NOT NULL,
    snapshot_data JSONB NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Master Data & Application Configurations (Benua, Negara, Bidang, dll.)
CREATE TABLE IF NOT EXISTS master_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Seed Default User Accounts if not exists
INSERT INTO users (id, username, name, email, password, role)
VALUES 
    ('usr-admin-01', 'admin', 'Superadmin Pengendali Sistem', 'admin@kemhan.mil.id', 'admin123', 'admin'),
    ('usr-analis-01', 'analis', 'Letda Lek Gutri Rahmad Zuwa', 'gutri.analis@kemhan.mil.id', 'analis123', 'analis'),
    ('usr-pimpinan-01', 'pimpinan', 'Direktur Pemantauan Strategis', 'pimpinan@kemhan.mil.id', 'pimpinan123', 'pimpinan')
ON CONFLICT (username) DO NOTHING;
