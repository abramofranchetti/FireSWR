document.addEventListener('DOMContentLoaded', function () {
    const ytmForm = document.getElementById('ytmForm');
    const ytmResult = document.getElementById('ytmResult');
    const ctx = document.getElementById('ytmChart').getContext('2d');
    let chartInstance = null;

    function calculateYTM(marketPrice, annualCoupon, faceValue, yearsToMaturity) {
        const ytm = (annualCoupon + (faceValue - marketPrice) / yearsToMaturity) / ((faceValue + marketPrice) / 2);
        return ytm * 100; // Convert to percentage
    }

    function renderChart(ytmValues) {
        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ytmValues.map((_, index) => `Year ${index + 1}`),
                datasets: [{
                    label: 'Yield to Maturity (%)',
                    data: ytmValues,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    function performCalculation() {
        const marketPrice = parseFloat(document.getElementById('marketPrice').value);
        const annualCoupon = parseFloat(document.getElementById('annualCoupon').value);
        const faceValue = parseFloat(document.getElementById('faceValue').value);
        const yearsToMaturity = parseInt(document.getElementById('yearsToMaturity').value);

        if (marketPrice > 0 && annualCoupon >= 0 && faceValue > 0 && yearsToMaturity > 0) {
            const ytm = calculateYTM(marketPrice, annualCoupon, faceValue, yearsToMaturity).toFixed(2);
            ytmResult.textContent = `${ytm}%`;

            const ytmValues = Array.from({ length: yearsToMaturity }, (_, i) => calculateYTM(marketPrice, annualCoupon, faceValue, i + 1).toFixed(2));
            renderChart(ytmValues);
        } else {
            alert('Per favore, inserisci valori validi.');
        }
    }

    ytmForm.addEventListener('submit', function (event) {
        event.preventDefault();
        performCalculation();
    });

    // Perform the calculation when the page loads
    performCalculation();
});
