
// Funções de Backup e Restore

async function downloadBackup() {
    try {
        const btn = document.getElementById('btn-backup-export');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Baixando...';
        btn.disabled = true;

        const response = await fetch('/api/backup');
        if (!response.ok) throw new Error('Erro ao gerar backup');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Pega o nome do arquivo do header ou gera um padrão
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'backup-carroia.json';
        if (contentDisposition && contentDisposition.includes('filename=')) {
            fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
        } else {
            fileName = `backup-carroia-${new Date().toISOString().slice(0, 10)}.json`;
        }

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        showToast('Backup baixado com sucesso!', 'success');
    } catch (error) {
        console.error(error);
        showToast('Erro ao baixar backup: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('btn-backup-export');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function uploadBackup() {
    const fileInput = document.getElementById('backup-file-input');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Selecione um arquivo de backup (.json)', 'error');
        return;
    }

    if (!confirm('ATENÇÃO: Isso irá APAGAR TODOS os dados atuais e substituir pelo backup. Tem certeza?')) {
        return;
    }

    try {
        const btn = document.getElementById('btn-backup-restore');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Restaurando...';
        btn.disabled = true;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);

                const response = await fetch('/api/restore', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(jsonContent)
                });

                const result = await response.json();

                if (!response.ok) throw new Error(result.error || 'Erro na restauração');

                showToast('Dados restaurados com sucesso! Recarregando...', 'success');
                setTimeout(() => window.location.reload(), 2000);

            } catch (err) {
                showToast('Erro ao processar arquivo: ' + err.message, 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        };
        reader.readAsText(file);

    } catch (error) {
        console.error(error);
        showToast('Erro: ' + error.message, 'error');
    }
}

function showBackupModal() {
    const modal = document.getElementById('modal-backup');
    const overlay = document.getElementById('modal-backup-overlay');
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    // Pequeno delay para animação se houver
    setTimeout(() => {
        modal.classList.add('opacity-100', 'scale-100');
        modal.classList.remove('opacity-0', 'scale-95');
        overlay.classList.add('opacity-100');
        overlay.classList.remove('opacity-0');
    }, 10);

    // Fechar sidebar se estiver aberta (mobile)
    if (document.getElementById('sidebar').classList.contains('open')) {
        toggleSidebar();
    }
}

function closeBackupModal() {
    const modal = document.getElementById('modal-backup');
    const overlay = document.getElementById('modal-backup-overlay');

    modal.classList.remove('opacity-100', 'scale-100');
    modal.classList.add('opacity-0', 'scale-95');
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
        overlay.classList.add('hidden');
        document.getElementById('backup-file-input').value = ''; // Limpar input
    }, 300);
}
