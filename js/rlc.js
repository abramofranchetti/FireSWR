document.addEventListener('DOMContentLoaded', function() {
    const lossSlider = document.getElementById('lossSlider');
    const lossValue = document.getElementById('lossValue');
    const lossDisplay = document.getElementById('lossDisplay');
    const lossDisplay2 = document.getElementById('lossDisplay2');
    const gainNeeded = document.getElementById('gainNeeded');
    const gainNeeded2 = document.getElementById('gainNeeded2');
    const afterLossEuro = document.getElementById('afterLossEuro');
    const afterLossEuro2 = document.getElementById('afterLossEuro2');
    const ctx = document.getElementById('gainLossChart').getContext('2d');

    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Guadagno necessario (%)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Perdita (%)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Guadagno necessario (%)'
                    }
                }
            }
        }
    });

    function calculateGainNeeded(loss) {
        return ((1 / (1 - loss/100) - 1) * 100).toFixed(2);
    }

    function updateChart() {
        const labels = [];
        const data = [];
        for(let i = 0; i <= 100; i += 5) {
            labels.push(i);
            data.push(calculateGainNeeded(i));
        }
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }

    function updateDisplay() {
        const loss = parseFloat(lossSlider.value);
        const gain = calculateGainNeeded(loss);
        const initialAmount = 10000;
        
        const afterLossAmount = initialAmount * (1 - loss/100);

        // Aggiorno tutti i valori
        lossValue.textContent = loss;
        lossDisplay.textContent = loss;
        lossDisplay2.textContent = loss;
        gainNeeded.textContent = gain;
        gainNeeded2.textContent = gain;
        afterLossEuro.textContent = afterLossAmount.toFixed(0);
        afterLossEuro2.textContent = afterLossAmount.toFixed(0);
    }

    lossSlider.addEventListener('input', function() {
        updateDisplay();
    });

    // Initial update
    updateDisplay();
    updateChart();
});
