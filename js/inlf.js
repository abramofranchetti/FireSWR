document.addEventListener('DOMContentLoaded', function () {
    fetch('csv/datiinflazionemediaitalia.csv')
        .then(response => response.text())
        .then(data => {
            const parsedData = parseCSV(data);
            parsedData.labels.reverse(); 
            parsedData.values.reverse(); 
            createChart(parsedData);
        });

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
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Inflazione Media',
                    data: data.values,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    fill: false
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
                            label: function(context) {
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
                }
            }
        });

        document.getElementById('resetZoom').addEventListener('click', function () {
            chart.resetZoom();
        });
    }
});
