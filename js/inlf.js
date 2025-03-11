document.addEventListener('DOMContentLoaded', function () {
    let italiaparsedData = { labels: [], values: [] };
    let europaparsedData = { labels: [], values: [] };
    fetch('csv/datiinflazionemediaitalia.csv')
        .then(response => response.text())
        .then(italianData => {
            italiaparsedData = parseCSV(italianData);
            italiaparsedData.labels.reverse();
            italiaparsedData.values.reverse();
            return fetch('csv/datiinflazionemediaeuropa.csv');
        })
        .then(response => response.text())
        .then(europeData => {
            europaparsedData = parseCSV(europeData);
            europaparsedData.labels.reverse();
            europaparsedData.values.reverse();
            const synchronizedData = synchronizeData(italiaparsedData, europaparsedData);
            createChart(synchronizedData.italiaData, synchronizedData.europaData);
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

    function synchronizeData(italiaData, europaData) {
        const allLabels = Array.from(new Set([...italiaData.labels, ...europaData.labels])).sort();
        const italiaValues = [];
        const europaValues = [];

        allLabels.forEach(label => {
            const italiaIndex = italiaData.labels.indexOf(label);
            const europaIndex = europaData.labels.indexOf(label);

            italiaValues.push(italiaIndex !== -1 ? italiaData.values[italiaIndex] : null);
            europaValues.push(europaIndex !== -1 ? europaData.values[europaIndex] : null);
        });

        return {
            italiaData: { labels: allLabels, values: italiaValues },
            europaData: { labels: allLabels, values: europaValues }
        };
    }

    function createChart(italiaData, europaData) {
        const ctx = document.getElementById('inflationChart').getContext('2d');
        const averageInflation = italiaData.values.reduce((a, b) => a + (b || 0), 0) / italiaData.values.filter(v => v !== null).length;
        let firstPoint = null;
        let secondPoint = null;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: italiaData.labels,
                datasets: [
                    {
                        label: 'Infl. Media Italia',
                        data: italiaData.values,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        fill: false,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Infl. Media Europa',
                        data: europaData.values,
                        borderColor: 'rgba(255, 99, 132, 0.5)',
                        borderWidth: 1,
                        fill: false,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderDash: [5, 5]
                    }
                ]
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
                            },
                            line3: {
                                type: 'line',
                                yMin: 0,
                                yMax: 0,
                                borderColor: 'black',
                                borderWidth: 1,
                                label: {
                                    content: 'Zero Inflazione',
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
                            document.getElementById('cumulativeInflation').innerText = `Primo punto selezionato: ${italiaData.labels[firstPoint]}`;
                        } else {
                            secondPoint = index;
                            const startIndex = firstPoint
                            const endIndex = secondPoint;
                            const cumulativeInflation = calculateCumulativeInflation(italiaData.values, startIndex, endIndex);
                            const svalutatedValue = Math.round(10000 / (1 + cumulativeInflation / 100));
                            document.getElementById('cumulativeInflation').innerText = `Inflazione cumulata tra ${italiaData.labels[firstPoint]} e ${italiaData.labels[secondPoint]}: ${cumulativeInflation.toFixed(2)}%
                    ${formatEuro(10000)} sarebbero diventati ${formatEuro(svalutatedValue)} con perdita del potere d'acquisto
                    del ${(((svalutatedValue / 10000) - 1 ) * -100).toFixed(2)}%`;
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
        let cumulativeFactor = 1;
        for (let i = startIndex; i <= endIndex; i++) {
            cumulativeFactor *= (1 + values[i] / 100);
        }
        return (cumulativeFactor - 1) * 100;
    }
});
