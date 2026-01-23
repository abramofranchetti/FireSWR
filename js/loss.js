document.addEventListener('DOMContentLoaded', function() {
    const gainSlider = document.getElementById('gainSlider');
    const gainValue = document.getElementById('gainValue');
    const gainDisplay = document.getElementById('gainDisplay');
    const gainDisplay2 = document.getElementById('gainDisplay2');
    const lossNeeded = document.getElementById('lossNeeded');
    const lossNeeded2 = document.getElementById('lossNeeded2');
    const afterGainEuro = document.getElementById('afterGainEuro');
    const afterGainEuro2 = document.getElementById('afterGainEuro2');
    const ctx = document.getElementById('gainLossChart').getContext('2d');

    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Perdita necessaria (%)',
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
                        text: 'Guadagno (%)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Perdita necessaria (%)'
                    }
                }
            }
        }
    });

    function calculateLossNeeded(gain) {
        return ((1 - (1 / (1 + gain/100))) * 100).toFixed(2);
    }

    function updateChart() {
        const labels = [];
        const data = [];
        for(let i = 0; i <= 100; i += 5) {
            labels.push(i);
            data.push(calculateLossNeeded(i));
        }
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }

    function updateDisplay() {
        const gain = parseFloat(gainSlider.value);
        const loss = calculateLossNeeded(gain);
        const initialAmount = 10000;
        
        const afterGainAmount = initialAmount * (1 + gain/100);

        // Aggiorno tutti i valori
        gainValue.textContent = gain;
        gainDisplay.textContent = gain;
        gainDisplay2.textContent = gain;
        lossNeeded.textContent = loss;
        lossNeeded2.textContent = loss;
        afterGainEuro.textContent = formateuro(afterGainAmount.toFixed(0));
        afterGainEuro2.textContent = formateuro(afterGainAmount.toFixed(0));
    }

    function formateuro(value) {
        return parseFloat(value).toLocaleString('it-IT', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0});   
    }

    gainSlider.addEventListener('input', function() {
        updateDisplay();
    });

    // Initial update
    updateDisplay();
    updateChart();
});
