const { Pool } = require('pg');

// Configuração do banco de dados
// Usa DATABASE_URL do Render em produção, ou conexão local para desenvolvimento
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/carros';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    // Criar tabela de veículos
    await client.query(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        ano INTEGER,
        placa TEXT UNIQUE,
        cor TEXT,
        km_atual INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de manutenções
    await client.query(`
      CREATE TABLE IF NOT EXISTS manutencoes (
        id SERIAL PRIMARY KEY,
        veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        descricao TEXT,
        data DATE NOT NULL,
        km INTEGER,
        custo REAL DEFAULT 0,
        local TEXT,
        observacoes TEXT,
        proximo_km INTEGER,
        proxima_data DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Banco de dados inicializado com sucesso!');
  } finally {
    client.release();
  }
}

// Helper para executar queries
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}

// Funções auxiliares para manter compatibilidade
function prepare(sql) {
  return {
    run: async (...params) => {
      const result = await pool.query(sql, params);
      return { lastInsertRowid: result.rows[0]?.id };
    },
    get: async (...params) => {
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    },
    all: async (...params) => {
      const result = await pool.query(sql, params);
      return result.rows;
    }
  };
}

module.exports = { initDatabase, query, prepare, pool };
