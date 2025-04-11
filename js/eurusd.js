$(document).ready(function () {
    let chartInstance = null;
    let mergedData = [];
    let updateTimeout = null;
    let minDate = null;
    let maxDate = null;
    let firstPoint = null;
    let secondPoint = null;

    function mergeData(historicalData, updatedData) {
        const mergedData = [...historicalData];
        updatedData.forEach(updatedItem => {
            const existingItemIndex = mergedData.findIndex(item => item.Date === updatedItem.Date);
            if (existingItemIndex !== -1) {
                mergedData[existingItemIndex] = updatedItem;
            } else {
                mergedData.push(updatedItem);
            }
        });

        return mergedData;
    }

    function filterDataByDate(data, startDate, endDate) {
        return data.filter(item => {
            const date = new Date(item.Date);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    }

    function calculateAverage(data) {
        const sum = data.reduce((acc, item) => acc + item, 0);
        return sum / data.length;
    }

    function calculatePercentageChange(start, end) {
        return ((end - start) / start) * 100;
    }

    function updateChart(data) {
        const dates = [];
        const exchangeRates = [];

        const sampleRate = 10; // Sample every X data points
        data.forEach((item, index) => {
            const year = new Date(item.Date).getFullYear();
            if (year <= 2000) { // sample data before 2000
            if (index % sampleRate === 0) {
                dates.push(item.Date);
                exchangeRates.push(parseFloat(item.Close));
            }
            } else {
            dates.push(item.Date);
            exchangeRates.push(parseFloat(item.Close));
            }
        });

        const averageRate = calculateAverage(exchangeRates);

        const ctx = document.getElementById('chartCanvas').getContext('2d');
        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Cambio Euro/Dollaro',
                        data: exchangeRates,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0
                    },
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                    annotation: {
                        annotations: {
                            line0: {
                                type: 'line',
                                yMin: 1,
                                yMax: 1,
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: 'Parità di cambio',
                                    enabled: true,
                                    position: 'start'
                                }
                            },
                            line1: {
                                type: 'line',
                                yMin: averageRate,
                                yMax: averageRate,
                                borderColor: 'blue',
                                borderWidth: 1,
                                label: {
                                    content: 'Media ' + averageRate.toFixed(4),
                                    enabled: true,
                                    position: 'start'
                                }
                            }
                        }
                    },
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
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            tooltipFormat: 'yyyy-MM-dd'
                        },
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
                        beginAtZero: false,
                        suggestedMax: Math.max(...exchangeRates) * 1.1,
                        title: {
                            display: true,
                            text: 'Cambio Euro/Dollaro'
                        }
                    }
                },
                onClick: function (event, elements) {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const value = exchangeRates[index];
                        const date = dates[index];
                        if (!firstPoint) {
                            firstPoint = { value, date };
                            $('#percentageChange').text('Primo punto selezionato: ' + value);
                            chartInstance.options.plugins.annotation.annotations.firstPointLine = {
                                type: 'line',
                                scaleID: 'x',
                                value: date,
                                borderColor: 'green',
                                borderWidth: 2,
                                label: {
                                    content: 'Primo punto' + firstPoint.value.toFixed(4),
                                    enabled: true,
                                    position: 'start'
                                }
                            };
                            chartInstance.update();
                        } else {
                            secondPoint = { value, date };
                            const percentageChange = calculatePercentageChange(firstPoint.value, secondPoint.value);
                            const initialAmount = 1000;
                            const dollarsAtFirstPoint = initialAmount * firstPoint.value;
                            const eurosAtSecondPoint = dollarsAtFirstPoint / secondPoint.value;
                            const difference = eurosAtSecondPoint - initialAmount;
                            $('#percentageChange').html(
                                'Cambio al primo punto: ' + firstPoint.value.toFixed(4) + ' dollari per un euro <br>' +
                                'Cambio al secondo punto: ' + secondPoint.value.toFixed(4) + ' dollari per un euro<br>' +
                                'Variazione percentuale: ' + percentageChange.toFixed(2) + '%<br>' +
                                'Comprando 1000€ avresti ottenuto ' + dollarsAtFirstPoint.toFixed(2) + '$ al primo cambio.<br>' +
                                'Vendendo quei dollari al secondo cambio avresti ottenuto ' + eurosAtSecondPoint.toFixed(2) + '€.<br>' +
                                (difference > 0 ? ('Guadagno:') : ('Perdita:')) + difference.toFixed(2) + '€' + ' (' + (difference > 0 ? '+' : '') + (difference / initialAmount * 100).toFixed(2) + '% dell\'investimento iniziale)'
                            );
                            chartInstance.options.plugins.annotation.annotations.secondPointLine = {
                                type: 'line',
                                scaleID: 'x',
                                value: date,
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: 'Secondo punto' + secondPoint.value.toFixed(4),
                                    enabled: true,
                                    position: 'start'
                                }
                            };
                            chartInstance.options.plugins.annotation.annotations.areaBetweenPoints = {
                                type: 'box',
                                xMin: firstPoint.date,
                                xMax: secondPoint.date,
                                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                borderColor: 'rgba(0, 255, 0, 0.25)',
                                borderWidth: 1
                            };
                            chartInstance.update();
                            firstPoint = null;
                            secondPoint = null;
                        }
                    }
                }
            }
        });
    }

    Promise.all([
        fetch('json/cambio_eur_usd_storico.json').then(response => {
            if (!response.ok) {
                throw new Error("Errore nel caricamento del dataset storico: " + response.statusText);
            }
            return response.json();
        }),
        fetch('json/cambio_eur_usd_updated.json').then(response => {
            if (!response.ok) {
                throw new Error("Errore nel caricamento del dataset aggiornato: " + response.statusText);
            }
            return response.json();
        })
    ])
        .then(([historicalData, updatedData]) => {
            mergedData = mergeData(historicalData, updatedData);

            minDate = new Date(Math.min(...mergedData.map(item => new Date(item.Date))));
            maxDate = new Date(Math.max(...mergedData.map(item => new Date(item.Date))));

            $('#startDate').val(minDate.toISOString().split('T')[0]);
            $('#endDate').val(maxDate.toISOString().split('T')[0]);
            $('#startDate').attr('min', minDate.toISOString().split('T')[0]);
            $('#startDate').attr('max', maxDate.toISOString().split('T')[0]);
            $('#endDate').attr('min', minDate.toISOString().split('T')[0]);
            $('#endDate').attr('max', maxDate.toISOString().split('T')[0]);

            updateChart(mergedData);
        })
        .catch(error => {
            console.error("Errore durante il caricamento dei dataset:", error);
        });

    $('#startDate, #endDate').change(function () {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            const startDate = $('#startDate').val();
            const endDate = $('#endDate').val();

            if (new Date(startDate) < minDate || new Date(endDate) > maxDate || startDate == '' || endDate == '') {
                alert('Le date selezionate devono essere comprese tra ' + minDate.toISOString().split('T')[0] + ' e ' + maxDate.toISOString().split('T')[0]);
                $('#startDate').val(minDate.toISOString().split('T')[0]);
                $('#endDate').val(maxDate.toISOString().split('T')[0]);
                return;
            }
            const filteredData = filterDataByDate(mergedData, startDate, endDate);
            updateChart(filteredData);
        }, 500);
    });

    $('#resetZoomButton').click(function () {
        if (chartInstance) {
            chartInstance.resetZoom();
            // Reset delle annotazioni e delle variabili dei punti selezionati
            chartInstance.options.plugins.annotation.annotations.firstPointLine = null;
            chartInstance.options.plugins.annotation.annotations.secondPointLine = null;
            chartInstance.options.plugins.annotation.annotations.areaBetweenPoints = null;
            chartInstance.update();
            firstPoint = null;
            secondPoint = null;
            $('#percentageChange').text('Clicca su un punto e poi su un altro per calcolare la variazione %');
        }
    });
});