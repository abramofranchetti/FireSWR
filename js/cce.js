document.addEventListener('DOMContentLoaded', function () {
    const cceForm = document.getElementById('cceForm');
    const annualCouponInput = document.getElementById('annualCoupon');
    const cceResult = document.getElementById('cceResult');
    const ctx = document.getElementById('cceChart').getContext('2d');
    let chartInstance = null;

    function calculateEffectiveCoupon(annualCoupon, purchasePrice) {
        return (annualCoupon / purchasePrice) * 100; // Convert to percentage
    }

    function renderChart(annualCoupon) {
        const purchasePrices = Array.from({ length: 101 }, (_, i) => i + 20);
        const effectiveCoupons = purchasePrices.map(price => calculateEffectiveCoupon(annualCoupon, price).toFixed(2));

        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: purchasePrices,
                datasets: [{
                    label: 'Cedola Effettiva (%)',
                    data: effectiveCoupons,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Prezzo di Acquisto (€)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cedola Effettiva (%)'
                        },
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
                                yMin: annualCoupon,
                                yMax: annualCoupon,
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: 'Cedola Nominale',
                                    enabled: true,
                                    position: 'start'
                                }
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    hover: {
                        mode: 'nearest',
                        intersect: true
                    }
                }
            }
        });
    }

    annualCouponInput.addEventListener('input', function () {
        const annualCoupon = parseFloat(annualCouponInput.value);
        if (annualCoupon >= 0) {
            renderChart(annualCoupon);
        } else {
            alert('Per favore, inserisci valori validi.');
        }
    });

    // Perform the calculation when the page loads
    const defaultAnnualCoupon = parseFloat(annualCouponInput.value);
    renderChart(defaultAnnualCoupon);
});
