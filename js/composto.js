let chart = null;

function calcolaDifferenza(C, r, t) {
    const composto = C * (Math.pow(1 + r, t) - 1);
    const semplice = C * r * t;
    return composto - semplice;
}

function updateChart() {
    const C = parseFloat(document.getElementById('capitale').value);
    const r = parseFloat(document.getElementById('tasso').value);
    const t = parseInt(document.getElementById('anni').value);

    const labels = Array.from({length: t + 1}, (_, i) => i);
    const dataComposto = labels.map(x => C * (Math.pow(1 + r, x) - 1));
    const dataSemplice = labels.map(x => C * r * x);
    const dataDifferenza = labels.map(x => calcolaDifferenza(C, r, x));

    // Calcolo i punti dove la differenza supera le soglie percentuali
    const soglie = [10, 20, 30, 40, 50];
    const annotationLines = {};
    soglie.forEach(soglia => {
        for (let i = 1; i < labels.length; i++) {
            const semplice = C * r * labels[i];
            if (semplice === 0) continue;
            const perc = (dataDifferenza[i] / semplice) * 100;
            if (perc >= soglia && !annotationLines[soglia]) {
                annotationLines[soglia] = labels[i];
                break;
            }
        }
    });

    if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('grafico').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Interesse Composto',
                data: dataComposto,
                borderColor: 'rgba(0, 123, 255, 1)',
                fill: false
            }, {
                label: 'Interesse Semplice',
                data: dataSemplice,
                borderColor: 'rgba(220, 53, 69, 1)',
                fill: false
            }, {
                label: 'Differenza',
                data: dataDifferenza,
                borderColor: 'rgba(40, 167, 69, 1)',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                annotation: {
                    annotations: Object.entries(annotationLines).map(([soglia, xValue]) => ({
                        type: 'line',
                        xMin: xValue,
                        xMax: xValue,
                        borderColor: 'rgba(255, 193, 7, 0.8)',
                        borderWidth: 2,
                        label: {
                            content: `${soglia}%`,
                            enabled: true,
                            position: 'start',
                            backgroundColor: 'rgba(255, 193, 7, 0.8)',
                            color: '#000',
                            font: { weight: 'bold' }
                        }
                    }))
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Event listeners
document.querySelectorAll('input[type="range"]').forEach(input => {
    input.addEventListener('input', function() {
        if (this.id === 'tasso') {
            document.getElementById('tassoValue').textContent = (parseFloat(this.value) * 100).toFixed(2) + '%';
        } else {
            document.getElementById(this.id + 'Value').textContent = this.value;
        }
        updateChart();
    });
});

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    // Imposta il valore iniziale del tasso in percentuale
    const tasso = document.getElementById('tasso');
    document.getElementById('tassoValue').textContent = (parseFloat(tasso.value) * 100).toFixed(2) + '%';
    // Imposta gli altri valori iniziali
    ['capitale', 'anni'].forEach(id => {
        document.getElementById(id + 'Value').textContent = document.getElementById(id).value;
    });
    updateChart();
});
document.addEventListener('DOMContentLoaded', updateChart);
