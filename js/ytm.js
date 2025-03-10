document.addEventListener('DOMContentLoaded', function () {
    const ytmForm = document.getElementById('ytmForm');
    const ytmResult = document.getElementById('ytmResult');
    const ctx = document.getElementById('ytmChart').getContext('2d');
    const marketPriceRange = document.getElementById('marketPriceRange');
    const annualCouponInput = document.getElementById('annualCoupon');
    const faceValueInput = document.getElementById('faceValue');
    const yearsToMaturityInput = document.getElementById('yearsToMaturity');
    let chartInstance = null;

    function calculateYTM(marketPrice, annualCoupon, faceValue, yearsToMaturity) {
        let ytm = 0.05; // Initial guess
        const maxIterations = 100;
        const tolerance = 1e-6;

        for (let i = 0; i < maxIterations; i++) {
            const f = marketPrice - (annualCoupon * (1 - Math.pow(1 + ytm, -yearsToMaturity)) / ytm + faceValue * Math.pow(1 + ytm, -yearsToMaturity));
            const fPrime = annualCoupon * (Math.pow(1 + ytm, -yearsToMaturity) * (yearsToMaturity / ytm + 1) - 1) / (ytm * ytm) - faceValue * yearsToMaturity * Math.pow(1 + ytm, -yearsToMaturity - 1);
            const newYTM = ytm - f / fPrime;

            if (Math.abs(newYTM - ytm) < tolerance) {
                ytm = newYTM;
                break;
            }
            ytm = newYTM;
        }

        return ytm * 100; // Convert to percentage
    }

    function renderChart(ytmValues, selectedYTM, selectedMarketPrice) {
        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ytmValues.map((_, index) => `€${20 + index}`),
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
                },
                plugins: {
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: selectedYTM,
                                yMax: selectedYTM,
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: `${selectedYTM}%`,
                                    enabled: true,
                                    position: 'top'
                                }
                            },
                            line2: {
                                type: 'line',
                                xMin: selectedMarketPrice,
                                xMax: selectedMarketPrice,
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: `${selectedMarketPrice + 20}€`,
                                    enabled: true,
                                    position: 'top'
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    function performCalculation() {
        const annualCoupon = parseFloat(annualCouponInput.value);
        const faceValue = parseFloat(faceValueInput.value);
        const yearsToMaturity = parseInt(yearsToMaturityInput.value);
        const selectedMarketPrice = parseInt(marketPriceRange.value);

        if (annualCoupon >= 0 && faceValue > 0 && yearsToMaturity > 0) {
            const ytmValues = [];
            for (let marketPrice = 20; marketPrice <= 120; marketPrice++) {
                const ytm = calculateYTM(marketPrice, annualCoupon, faceValue, yearsToMaturity).toFixed(2);
                ytmValues.push(ytm);
            }
            const selectedYTM = ytmValues[selectedMarketPrice - 20];
            ytmResult.textContent = `${selectedYTM}%`;
            renderChart(ytmValues, selectedYTM, selectedMarketPrice - 20);
        } else {
            alert('Per favore, inserisci valori validi.');
        }
    }

    marketPriceRange.addEventListener('input', performCalculation);
    annualCouponInput.addEventListener('input', performCalculation);
    faceValueInput.addEventListener('input', performCalculation);
    yearsToMaturityInput.addEventListener('input', performCalculation);

    // Perform the calculation when the page loads
    performCalculation();
});
