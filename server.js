const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, prepare, saveDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ API VEÍCULOS ============

// Listar todos os veículos
app.get('/api/veiculos', (req, res) => {
    try {
        const veiculos = prepare('SELECT * FROM veiculos ORDER BY created_at DESC').all();
        res.json(veiculos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar veículo por ID
app.get('/api/veiculos/:id', (req, res) => {
    try {
        const veiculo = prepare('SELECT * FROM veiculos WHERE id = ?').get(parseInt(req.params.id));
        if (!veiculo) {
            return res.status(404).json({ error: 'Veículo não encontrado' });
        }
        res.json(veiculo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar veículo
app.post('/api/veiculos', (req, res) => {
    try {
        const { marca, modelo, ano, placa, cor, km_atual } = req.body;
        const result = prepare(`
      INSERT INTO veiculos (marca, modelo, ano, placa, cor, km_atual)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(marca, modelo, ano || null, placa || null, cor || null, km_atual || 0);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Veículo criado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar veículo
app.put('/api/veiculos/:id', (req, res) => {
    try {
        const { marca, modelo, ano, placa, cor, km_atual } = req.body;
        prepare(`
      UPDATE veiculos SET marca = ?, modelo = ?, ano = ?, placa = ?, cor = ?, km_atual = ?
      WHERE id = ?
    `).run(marca, modelo, ano, placa, cor, km_atual, parseInt(req.params.id));
        res.json({ message: 'Veículo atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deletar veículo
app.delete('/api/veiculos/:id', (req, res) => {
    try {
        prepare('DELETE FROM manutencoes WHERE veiculo_id = ?').run(parseInt(req.params.id));
        prepare('DELETE FROM veiculos WHERE id = ?').run(parseInt(req.params.id));
        res.json({ message: 'Veículo deletado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ API MANUTENÇÕES ============

// Listar todas as manutenções
app.get('/api/manutencoes', (req, res) => {
    try {
        const { veiculo_id } = req.query;
        let sql = `
      SELECT m.*, v.marca, v.modelo, v.placa
      FROM manutencoes m
      JOIN veiculos v ON m.veiculo_id = v.id
    `;
        if (veiculo_id) {
            sql += ` WHERE m.veiculo_id = ${parseInt(veiculo_id)}`;
        }
        sql += ' ORDER BY m.data DESC, m.created_at DESC';
        const manutencoes = prepare(sql).all();
        res.json(manutencoes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar manutenção
app.post('/api/manutencoes', (req, res) => {
    try {
        const { veiculo_id, tipo, descricao, data, km, custo, local, observacoes } = req.body;
        const result = prepare(`
      INSERT INTO manutencoes (veiculo_id, tipo, descricao, data, km, custo, local, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(veiculo_id, tipo, descricao || null, data, km || null, custo || 0, local || null, observacoes || null);

        // Atualizar km do veículo se informado
        if (km) {
            const veiculo = prepare('SELECT km_atual FROM veiculos WHERE id = ?').get(veiculo_id);
            if (veiculo && (!veiculo.km_atual || km > veiculo.km_atual)) {
                prepare('UPDATE veiculos SET km_atual = ? WHERE id = ?').run(km, veiculo_id);
            }
        }

        res.status(201).json({ id: result.lastInsertRowid, message: 'Manutenção registrada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deletar manutenção
app.delete('/api/manutencoes/:id', (req, res) => {
    try {
        prepare('DELETE FROM manutencoes WHERE id = ?').run(parseInt(req.params.id));
        res.json({ message: 'Manutenção deletada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ API DASHBOARD ============

app.get('/api/dashboard', (req, res) => {
    try {
        const totalVeiculos = prepare('SELECT COUNT(*) as count FROM veiculos').get()?.count || 0;
        const totalManutencoes = prepare('SELECT COUNT(*) as count FROM manutencoes').get()?.count || 0;
        const custoTotal = prepare('SELECT COALESCE(SUM(custo), 0) as total FROM manutencoes').get()?.total || 0;

        // Custo do mês atual
        const now = new Date();
        const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const custoMesAtual = prepare(`
      SELECT COALESCE(SUM(custo), 0) as total FROM manutencoes 
      WHERE substr(data, 1, 7) = ?
    `).get(mesAtual)?.total || 0;

        const ultimasManutencoes = prepare(`
      SELECT m.*, v.marca, v.modelo, v.placa
      FROM manutencoes m
      JOIN veiculos v ON m.veiculo_id = v.id
      ORDER BY m.data DESC, m.created_at DESC
      LIMIT 5
    `).all();

        const manutencoesPorTipo = prepare(`
      SELECT tipo, COUNT(*) as count, SUM(custo) as custo_total
      FROM manutencoes
      GROUP BY tipo
      ORDER BY count DESC
    `).all();

        res.json({
            totalVeiculos,
            totalManutencoes,
            custoTotal,
            custoMesAtual,
            ultimasManutencoes,
            manutencoesPorTipo
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Inicialização
async function startServer() {
    await initDatabase();

    app.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('🚗 ═══════════════════════════════════════════════════════════');
        console.log('   SISTEMA DE MANUTENÇÃO DE CARROS');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`   ✅ Servidor rodando na porta ${PORT}`);
        console.log('');
        console.log('   📍 Acesse pelo navegador:');
        console.log(`      • Local:      http://localhost:${PORT}`);
        console.log(`      • Rede Local: http://SEU-IP:${PORT}`);
        console.log('');
        console.log('   💡 Para descobrir seu IP, execute: ipconfig (Windows)');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
    });
}

startServer().catch(console.error);
