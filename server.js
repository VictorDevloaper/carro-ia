const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, query } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ API VEÍCULOS ============

// Listar todos os veículos
app.get('/api/veiculos', async (req, res) => {
    try {
        const result = await query('SELECT * FROM veiculos ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar veículo por ID
app.get('/api/veiculos/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM veiculos WHERE id = $1', [parseInt(req.params.id)]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Veículo não encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar veículo
app.post('/api/veiculos', async (req, res) => {
    try {
        const { marca, modelo, ano, placa, cor, km_atual } = req.body;
        const result = await query(
            `INSERT INTO veiculos (marca, modelo, ano, placa, cor, km_atual)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [marca, modelo, ano || null, placa || null, cor || null, km_atual || 0]
        );
        res.status(201).json({ id: result.rows[0].id, message: 'Veículo criado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar veículo
app.put('/api/veiculos/:id', async (req, res) => {
    try {
        const { marca, modelo, ano, placa, cor, km_atual } = req.body;
        await query(
            `UPDATE veiculos SET marca = $1, modelo = $2, ano = $3, placa = $4, cor = $5, km_atual = $6
             WHERE id = $7`,
            [marca, modelo, ano, placa, cor, km_atual, parseInt(req.params.id)]
        );
        res.json({ message: 'Veículo atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deletar veículo
app.delete('/api/veiculos/:id', async (req, res) => {
    try {
        await query('DELETE FROM manutencoes WHERE veiculo_id = $1', [parseInt(req.params.id)]);
        await query('DELETE FROM veiculos WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ message: 'Veículo deletado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ API MANUTENÇÕES ============

// Listar todas as manutenções
app.get('/api/manutencoes', async (req, res) => {
    try {
        const { veiculo_id, mes, ano, tipo } = req.query;
        let sql = `
            SELECT m.*, v.marca, v.modelo, v.placa
            FROM manutencoes m
            JOIN veiculos v ON m.veiculo_id = v.id
        `;
        const params = [];
        const conditions = [];

        if (veiculo_id) {
            params.push(parseInt(veiculo_id));
            conditions.push(`m.veiculo_id = $${params.length}`);
        }

        if (tipo) {
            params.push(tipo);
            conditions.push(`m.tipo = $${params.length}`);
        }

        if (mes && ano) {
            const competencia = `${ano}-${mes}`;
            params.push(competencia);
            conditions.push(`TO_CHAR(m.data, 'YYYY-MM') = $${params.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY m.data DESC, m.created_at DESC';
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar manutenção
app.post('/api/manutencoes', async (req, res) => {
    try {
        const { veiculo_id, tipo, titulo, subtitulo, descricao, data, km, custo, local, observacoes, proximo_km, proxima_data, marca_peca } = req.body;

        // Converter custo de string formatada para número
        let custoNumero = 0;
        if (custo) {
            custoNumero = parseFloat(String(custo).replace(',', '.')) || 0;
        }

        // Converter km de string para número
        let kmNumero = null;
        if (km) {
            kmNumero = parseInt(String(km).replace(/\D/g, '')) || null;
        }

        // Converter proximo_km de string para número
        let proximoKmNumero = null;
        if (proximo_km) {
            proximoKmNumero = parseInt(String(proximo_km).replace(/\D/g, '')) || null;
        }

        const result = await query(
            `INSERT INTO manutencoes (veiculo_id, tipo, titulo, subtitulo, descricao, data, km, custo, local, observacoes, proximo_km, proxima_data, marca_peca)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
            [veiculo_id, tipo, titulo || null, subtitulo || null, descricao || null, data, kmNumero, custoNumero, local || null, observacoes || null, proximoKmNumero, proxima_data || null, marca_peca || null]
        );

        // Atualizar km do veículo se informado
        if (kmNumero) {
            const veiculoResult = await query('SELECT km_atual FROM veiculos WHERE id = $1', [veiculo_id]);
            const veiculo = veiculoResult.rows[0];
            if (veiculo && (!veiculo.km_atual || kmNumero > veiculo.km_atual)) {
                await query('UPDATE veiculos SET km_atual = $1 WHERE id = $2', [kmNumero, veiculo_id]);
            }
        }

        res.status(201).json({ id: result.rows[0].id, message: 'Manutenção registrada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar manutenção
app.put('/api/manutencoes/:id', async (req, res) => {
    try {
        const { veiculo_id, tipo, titulo, subtitulo, descricao, data, km, custo, local, observacoes, proximo_km, proxima_data, marca_peca } = req.body;

        // Converter custo de string formatada para número
        let custoNumero = 0;
        if (custo) {
            custoNumero = parseFloat(String(custo).replace(',', '.')) || 0;
        }

        // Converter km de string para número
        let kmNumero = null;
        if (km) {
            kmNumero = parseInt(String(km).replace(/\D/g, '')) || null;
        }

        // Converter proximo_km de string para número
        let proximoKmNumero = null;
        if (proximo_km) {
            proximoKmNumero = parseInt(String(proximo_km).replace(/\D/g, '')) || null;
        }

        await query(
            `UPDATE manutencoes SET 
                veiculo_id = $1, tipo = $2, titulo = $3, subtitulo = $4, descricao = $5, data = $6, 
                km = $7, custo = $8, local = $9, observacoes = $10,
                proximo_km = $11, proxima_data = $12, marca_peca = $13
             WHERE id = $14`,
            [veiculo_id, tipo, titulo || null, subtitulo || null, descricao || null, data, kmNumero, custoNumero, local || null, observacoes || null, proximoKmNumero, proxima_data || null, marca_peca || null, parseInt(req.params.id)]
        );

        // Atualizar km do veículo se informado
        if (kmNumero) {
            const veiculoResult = await query('SELECT km_atual FROM veiculos WHERE id = $1', [veiculo_id]);
            const veiculo = veiculoResult.rows[0];
            if (veiculo && (!veiculo.km_atual || kmNumero > veiculo.km_atual)) {
                await query('UPDATE veiculos SET km_atual = $1 WHERE id = $2', [kmNumero, veiculo_id]);
            }
        }

        res.json({ message: 'Manutenção atualizada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deletar manutenção
app.delete('/api/manutencoes/:id', async (req, res) => {
    try {
        await query('DELETE FROM manutencoes WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ message: 'Manutenção deletada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ API DASHBOARD ============

app.get('/api/dashboard', async (req, res) => {
    try {
        const totalVeiculosResult = await query('SELECT COUNT(*) as count FROM veiculos');
        const totalVeiculos = parseInt(totalVeiculosResult.rows[0]?.count) || 0;

        const totalManutencoesResult = await query('SELECT COUNT(*) as count FROM manutencoes');
        const totalManutencoes = parseInt(totalManutencoesResult.rows[0]?.count) || 0;

        const custoTotalResult = await query('SELECT COALESCE(SUM(custo), 0) as total FROM manutencoes');
        const custoTotal = parseFloat(custoTotalResult.rows[0]?.total) || 0;

        // Custo do mês atual
        const now = new Date();
        const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const custoMesAtualResult = await query(
            `SELECT COALESCE(SUM(custo), 0) as total FROM manutencoes 
             WHERE TO_CHAR(data, 'YYYY-MM') = $1`,
            [mesAtual]
        );
        const custoMesAtual = parseFloat(custoMesAtualResult.rows[0]?.total) || 0;

        const ultimasManutencoesResult = await query(`
            SELECT m.*, v.marca, v.modelo, v.placa
            FROM manutencoes m
            JOIN veiculos v ON m.veiculo_id = v.id
            ORDER BY m.data DESC, m.created_at DESC
            LIMIT 5
        `);

        const manutencoesPorTipoResult = await query(`
            SELECT tipo, COUNT(*) as count, SUM(custo) as custo_total
            FROM manutencoes
            GROUP BY tipo
            ORDER BY count DESC
        `);

        res.json({
            totalVeiculos,
            totalManutencoes,
            custoTotal,
            custoMesAtual,
            ultimasManutencoes: ultimasManutencoesResult.rows,
            manutencoesPorTipo: manutencoesPorTipoResult.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ API BACKUP & RESTORE ============

// Backup (Exportar dados)
app.get('/api/backup', async (req, res) => {
    try {
        const veiculos = await query('SELECT * FROM veiculos ORDER BY id');
        const manutencoes = await query('SELECT * FROM manutencoes ORDER BY id');

        const backupData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
                veiculos: veiculos.rows,
                manutencoes: manutencoes.rows
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=backup-carroia-${new Date().toISOString().slice(0, 10)}.json`);
        res.json(backupData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restore (Importar dados)
app.post('/api/restore', async (req, res) => {
    const client = await initDatabase();
    // Nota: initDatabase retorna undefined, precisamos expor o pool ou usar query direta com transação.
    // O helper query() não suporta transação facilmente pois faz pool.query direto.
    // Vamos importar o pool de database.js ou ajustar o import.
    // Verificando imports... const { initDatabase, query } = require('./database');
    // O arquivo database.js exporta pool também. Vamos precisar ajustar o require no topo ou usar querys individuais (perigoso sem transação).

    // Melhor abordagem: Ajustar o topo do arquivo para importar pool também. 
    // Mas para evitar editar o topo agora, vamos assumir que o usuário aceita um "soft" restore ou vou usar o require aqui dentro se necessário, 
    // MAS espere, eu vi o database.js: module.exports = { initDatabase, query, prepare, pool };
    // Então posso requerer o pool aqui se eu mudar o require lá em cima, ou apenas fazer:
    const { pool } = require('./database');

    const clientTransaction = await pool.connect();

    try {
        const { data } = req.body;
        if (!data || !data.veiculos || !data.manutencoes) {
            throw new Error('Formato de backup inválido');
        }

        await clientTransaction.query('BEGIN');

        // 1. Limpar tabelas existentes (ordem importa por causa da FK)
        await clientTransaction.query('DELETE FROM manutencoes');
        await clientTransaction.query('DELETE FROM veiculos');

        // 2. Inserir Veículos
        if (data.veiculos.length > 0) {
            for (const v of data.veiculos) {
                await clientTransaction.query(
                    `INSERT INTO veiculos (id, marca, modelo, ano, placa, cor, km_atual, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [v.id, v.marca, v.modelo, v.ano, v.placa, v.cor, v.km_atual, v.created_at]
                );
            }
            // Ajustar sequência do ID dos veículos
            const maxIdResult = await clientTransaction.query('SELECT MAX(id) as max_id FROM veiculos');
            const maxId = maxIdResult.rows[0].max_id || 0;
            await clientTransaction.query(`SELECT setval('veiculos_id_seq', $1)`, [maxId]);
        }

        // 3. Inserir Manutenções
        if (data.manutencoes.length > 0) {
            for (const m of data.manutencoes) {
                await clientTransaction.query(
                    `INSERT INTO manutencoes (id, veiculo_id, tipo, titulo, subtitulo, descricao, data, km, custo, local, observacoes, proximo_km, proxima_data, marca_peca, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                    [m.id, m.veiculo_id, m.tipo, m.titulo, m.subtitulo, m.descricao, m.data, m.km, m.custo, m.local, m.observacoes, m.proximo_km, m.proxima_data, m.marca_peca, m.created_at]
                );
            }
            // Ajustar sequência do ID das manutenções
            const maxIdResult = await clientTransaction.query('SELECT MAX(id) as max_id FROM manutencoes');
            const maxId = maxIdResult.rows[0].max_id || 0;
            await clientTransaction.query(`SELECT setval('manutencoes_id_seq', $1)`, [maxId]);
        }

        await clientTransaction.query('COMMIT');
        res.json({ message: 'Restauração concluída com sucesso! Recarregue a página.' });
    } catch (error) {
        await clientTransaction.query('ROLLBACK');
        console.error('Erro no restore:', error);
        res.status(500).json({ error: 'Falha na restauração: ' + error.message });
    } finally {
        clientTransaction.release();
    }
});
async function startServer() {
    await initDatabase();

    app.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('🚗 ═══════════════════════════════════════════════════════════');
        console.log('   SISTEMA DE MANUTENÇÃO DE CARROS');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`   ✅ Servidor rodando na porta ${PORT}`);
        console.log('   🐘 Conectado ao PostgreSQL');
        console.log('');
        console.log('   📍 Acesse pelo navegador:');
        console.log(`      • Local:      http://localhost:${PORT}`);
        console.log(`      • Rede Local: http://SEU-IP:${PORT}`);
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
    });
}

startServer().catch(console.error);
