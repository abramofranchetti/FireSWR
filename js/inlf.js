document.addEventListener('DOMContentLoaded', function () {
    fetch('csv/datiinflazionemediaitalia.csv')
        .then(response => response.text())
        .then(data => {
            const parsedData = parseCSV(data);
            parsedData.labels.reverse();
            parsedData.values.reverse();
            createChart(parsedData);
        });

    // Funzione per formattare i numeri in euro con separatore delle migliaia
    function formatEuro(value) {
        return new Intl.NumberFormat('it-IT',
            {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
    }

    function parseCSV(data) {
        const lines = data.split('\n');
        const labels = [];
        const values = [];
        lines.forEach(line => {
            const [year, value] = line.split(';');
            if (year && value) {
                labels.push(year);
                values.push(parseFloat(value.replace('%', '').replace(',', '.')));
            }
        });
        return { labels, values };
    }

    function createChart(data) {
        const ctx = document.getElementById('inflationChart').getContext('2d');
        const averageInflation = data.values.reduce((a, b) => a + b, 0) / data.values.length;
        let firstPoint = null;
        let secondPoint = null;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Inflazione Media',
                    data: data.values,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false,
                    pointRadius: 5, // Aumenta la dimensione dei punti
                    pointHoverRadius: 7 // Aumenta la dimensione dei punti al passaggio del mouse
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x'
                        },
                        zoom: {
                            wheel: {
                                enabled: false,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                            drag: {
                                enabled: true,
                                backgroundColor: 'rgba(0,0,0,0.3)',
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.raw + '%';
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: averageInflation,
                                yMax: averageInflation,
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: 'Media Storica ' + averageInflation.toFixed(2) + '%',
                                    enabled: true,
                                    position: 'start'
                                }
                            },
                            line2: {
                                type: 'line',
                                yMin: 2,
                                yMax: 2,
                                borderColor: 'green',
                                borderWidth: 2,
                                label: {
                                    content: 'Target BCE 2%',
                                    enabled: true,
                                    position: 'center'
                                }
                            }

                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Anno'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Inflazione Media (%)'
                        }
                    }
                },
                onClick: function (evt) {
                    const activeElements = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        if (!firstPoint) {
                            firstPoint = index;
                            document.getElementById('cumulativeInflation').innerText = `Primo punto selezionato: ${data.labels[firstPoint]}`;
                        } else {
                            secondPoint = index;
                            const startIndex = firstPoint
                            const endIndex = secondPoint;
                            const cumulativeInflation = calculateCumulativeInflation(data.values, startIndex, endIndex);
                            document.getElementById('cumulativeInflation').innerText = `Inflazione cumulata tra ${data.labels[firstPoint]} e ${data.labels[secondPoint]}: ${cumulativeInflation.toFixed(2)}%
                            ${formatEuro(10000)} sarebbero diventati ${formatEuro(Math.round(10000 / (1 + cumulativeInflation / 100)))}`;
                            firstPoint = null;
                            secondPoint = null;
                        }
                    }
                }
            }
        });

        document.getElementById('resetZoom').addEventListener('click', function () {
            chart.resetZoom();
        });
    }

    function calculateCumulativeInflation(values, startIndex, endIndex) {
        let cumulativeInflation = 0;
        for (let i = startIndex; i <= endIndex; i++) {
            cumulativeInflation += values[i];
        }
        return cumulativeInflation;
    }
});
