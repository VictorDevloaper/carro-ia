// Utility Functions

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatDate(dateString) {
    if (!dateString) return '';

    // Se já é um objeto Date ou string de data válida
    let date;

    // Tenta parsear diferentes formatos
    if (typeof dateString === 'string') {
        // Remove qualquer parte de timezone se existir
        const cleanDate = dateString.split('T')[0];
        // Formato YYYY-MM-DD
        if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(cleanDate + 'T00:00:00');
        } else {
            date = new Date(dateString);
        }
    } else if (dateString instanceof Date) {
        date = dateString;
    } else {
        date = new Date(dateString);
    }

    // Verifica se a data é válida
    if (isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getTipoIcon(tipo) {
    const icons = {
        'Troca de Óleo': '🛢️',
        'Revisão': '🔍',
        'Pneus': '🛞',
        'Freios': '🛑',
        'Filtros': '🌀',
        'Bateria': '🔋',
        'Suspensão': '🔩',
        'Outro': '⚙️'
    };
    return icons[tipo] || '🔧';
}

function getTipoColor(tipo) {
    const colors = {
        'Troca de Óleo': 'bg-amber-500/20 text-amber-400',
        'Revisão': 'bg-blue-500/20 text-blue-400',
        'Pneus': 'bg-slate-500/20 text-slate-400',
        'Freios': 'bg-red-500/20 text-red-400',
        'Filtros': 'bg-cyan-500/20 text-cyan-400',
        'Bateria': 'bg-green-500/20 text-green-400',
        'Suspensão': 'bg-purple-500/20 text-purple-400',
        'Outro': 'bg-gray-500/20 text-gray-400'
    };
    return colors[tipo] || 'bg-sky-500/20 text-sky-400';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Page transition effect
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('page-loaded');

    // Add click animation to all buttons
    document.querySelectorAll('button, .btn-primary, a').forEach(el => {
        el.addEventListener('click', function (e) {
            // Ripple effect
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);

            const rect = this.getBoundingClientRect();
            ripple.style.left = (e.clientX - rect.left) + 'px';
            ripple.style.top = (e.clientY - rect.top) + 'px';

            setTimeout(() => ripple.remove(), 600);
        });
    });
});

// Intersection Observer for scroll animations
const observeElements = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
};

// Run after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeElements);
} else {
    observeElements();
}
