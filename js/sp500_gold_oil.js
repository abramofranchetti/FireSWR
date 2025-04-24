async function loadCSVData(url) {
    const response = await fetch(url);
    const data = await response.text();
    return data;
}

async function createChart() {
    // Carica i dati
    const goldData = await loadCSVData('csv/xau_usd_montly.csv');
    const oilData = await loadCSVData('csv/WTI_montly.csv');
    const sp500TRData = await loadCSVData('csv/sp500tr_shiller_1971.csv');
    const sp500Data = await loadCSVData('csv/sp500_montly_historical.csv');

    // Parsing dei dati
    const goldPrices = goldData.split('\n')
        .map(line => {
            const [date, price] = line.split('\t');
            const [day, month, year] = date.split('/');
            return {
                date: new Date(Date.UTC(year, month, day)),
                price: parseFloat(price)
            };
        })
        .filter(item => !isNaN(item.price) && item.date >= new Date('1971-08-01'));

    const oilPrices = oilData.split('\n')
        .map(line => {
            const [date, price] = line.split('\t');
            return {
                date: new Date(date),
                price: parseFloat(price)
            };
        })
        .filter(item => !isNaN(item.price) && item.date >= new Date('1971-08-01'));

    const sp500TRPrices = sp500TRData.split('\n')
        .map(line => {
            const [date, price] = line.split(' ');
            const [day, month, year] = date.split('/');
            return {
                date: new Date(Date.UTC(year, month, day)),
                price: parseFloat(price)
            };
        })
        .filter(item => !isNaN(item.price) && item.date >= new Date('1971-08-01'));

    const sp500Prices = sp500Data.split('\n')
        .map(line => {
            const [date, price] = line.split(' ');
            const [day, month, year] = date.split('/');
            return {
                date: new Date(Date.UTC(year, month, day)),
                price: parseFloat(price)
            };
        })
        .filter(item => !isNaN(item.price) && item.date >= new Date('1971-08-01'));

    // Normalizza i prezzi (base 100 al primo valore)
    const normalizeData = (data, startDate) => {
        const filteredData = data.filter(item =>
            (!startDate || item.date >= startDate)
        );
        if (filteredData.length === 0) return [];

        const basePrice = filteredData[0].price;
        return filteredData.map(item => ({
            date: item.date,
            price: (item.price / basePrice) * 100
        }));
    };

    let chart = null;
    let oilGoldChart = null;
    let sp500GoldChart = null;
    let sp500NoTRGoldChart = null;
    let allData = {
        gold: goldPrices,
        oil: oilPrices,
        sp500TR: sp500TRPrices,
        sp500: sp500Prices
    };

    function createOrUpdateCharts() {
        const scaleType = document.getElementById('scaleType').value;
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        endDate.setMonth(endDate.getMonth() + 1, 0); // Ultimo giorno del mese

        const filteredGold = normalizeData(allData.gold, startDate)
            .filter(item => item.date <= endDate);
        const filteredOil = normalizeData(allData.oil, startDate)
            .filter(item => item.date <= endDate);
        const filteredSP500TR = normalizeData(allData.sp500TR, startDate)
            .filter(item => item.date <= endDate);
        const filteredSP500 = normalizeData(sp500Prices, startDate)
            .filter(item => item.date <= endDate);

        // Calcola il rapporto petrolio/oro
        const oilGoldRatio = allData.oil.map(oilItem => {
            const goldItem = allData.gold.find(g =>
                g.date.getFullYear() === oilItem.date.getFullYear() &&
                g.date.getMonth() === oilItem.date.getMonth()
            );
            if (!goldItem) return null;
            return {
                date: oilItem.date,
                price: (oilItem.price / goldItem.price) * 100 // Barili per oncia * 100 per leggibilità
            };
        }).filter(item => item !== null);

        // Filtra i dati per data
        const filteredOilGoldRatio = oilGoldRatio
            .filter(item => item.date >= startDate && item.date <= endDate);

        // Calcola il rapporto SP500/oro
        const sp500GoldRatio = allData.sp500TR.map(sp500Item => {
            const goldItem = allData.gold.find(g =>
                g.date.getFullYear() === sp500Item.date.getFullYear() &&
                g.date.getMonth() === sp500Item.date.getMonth()
            );
            if (!goldItem) return null;
            return {
                date: sp500Item.date,
                price: (sp500Item.price / goldItem.price) * 100 // SP500 per oncia * 100 per leggibilità
            };
        }).filter(item => item !== null);

        // Filtra i dati per data
        const filteredSP500GoldRatio = sp500GoldRatio
            .filter(item => item.date >= startDate && item.date <= endDate);

        // Calcola il rapporto SP500 normale/oro
        const sp500NoTRGoldRatio = allData.sp500.map(sp500Item => {
            const goldItem = allData.gold.find(g =>
                g.date.getFullYear() === sp500Item.date.getFullYear() &&
                g.date.getMonth() === sp500Item.date.getMonth()
            );
            if (!goldItem) return null;
            return {
                date: sp500Item.date,
                price: (sp500Item.price / goldItem.price) * 100 // SP500 per oncia * 100 per leggibilità
            };
        }).filter(item => item !== null);

        // Filtra i dati per data
        const filteredSP500NoTRGoldRatio = sp500NoTRGoldRatio
            .filter(item => item.date >= startDate && item.date <= endDate);

        // Calcola la media dei rapporti
        const oilGoldAverage = filteredOilGoldRatio.reduce((sum, item) => sum + item.price, 0) / filteredOilGoldRatio.length;
        const sp500GoldAverage = filteredSP500GoldRatio.reduce((sum, item) => sum + item.price, 0) / filteredSP500GoldRatio.length;
        const sp500NoTRGoldAverage = filteredSP500NoTRGoldRatio.reduce((sum, item) => sum + item.price, 0) / filteredSP500NoTRGoldRatio.length;

        // Primo grafico (esistente)
        const ctx = document.getElementById('mainChart').getContext('2d');

        const config = {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Oro',
                    data: filteredGold.map(item => ({
                        x: item.date,
                        y: item.price
                    })),
                    borderColor: 'gold',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'SP500 TR (con dividendi)',
                    data: filteredSP500TR.map(item => ({
                        x: item.date,
                        y: item.price
                    })),
                    borderColor: 'blue',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    hidden: true  // Nasconde inizialmente questa serie
                },
                {
                    label: 'SP500 (senza dividendi)',
                    data: filteredSP500.map(item => ({
                        x: item.date,
                        y: item.price
                    })),
                    borderColor: 'lightblue',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Petrolio WTI',
                    data: filteredOil.map(item => ({
                        x: item.date,
                        y: item.price
                    })),
                    borderColor: 'black',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Data'
                        },
                        ticks: {
                            maxRotation: 45,
                            autoSkip: true,
                            autoSkipPadding: 15
                        }
                    },
                    y: {
                        type: scaleType === 'logaritmica' ? 'logarithmic' : 'linear',
                        title: {
                            display: true,
                            text: scaleType === 'logaritmica' ? 'Performance relativa (scala log)' : 'Performance relativa (Base 100)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance relativa dal 1971'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        };

        if (chart) {
            chart.destroy();
        }
        chart = new Chart(ctx, config);

        // Secondo grafico (petrolio/oro)
        const oilGoldConfig = {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Barili di petrolio per oncia d\'oro (x100)',
                    data: filteredOilGoldRatio.map(item => ({
                        x: item.date,
                        y: item.price
                    })),
                    borderColor: '#8B4513',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Media del periodo',
                    data: filteredOilGoldRatio.map(item => ({
                        x: item.date,
                        y: oilGoldAverage
                    })),
                    borderColor: 'red',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Data'
                        },
                        ticks: {
                            maxRotation: 45,
                            autoSkip: true,
                            autoSkipPadding: 15
                        }
                    },
                    y: {
                        type: scaleType === 'logaritmica' ? 'logarithmic' : 'linear',
                        title: {
                            display: true,
                            text: 'Barili di petrolio per oncia d\'oro (x100)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        };

        if (oilGoldChart) {
            oilGoldChart.destroy();
        }
        const oilGoldCtx = document.getElementById('oilGoldChart').getContext('2d');
        oilGoldChart = new Chart(oilGoldCtx, oilGoldConfig);

        // Terzo grafico (SP500/oro)
        const sp500GoldConfig = {
            type: 'line',
            data: {
                datasets: [{
                    label: 'SP500 per oncia d\'oro (x100)',
                    data: filteredSP500GoldRatio.map(item => ({
                        x: item.date,
                        y: item.price
                    })),
                    borderColor: '#6a0dad', // Viola
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Media del periodo',
                    data: filteredSP500GoldRatio.map(item => ({
                        x: item.date,
                        y: sp500GoldAverage
                    })),
                    borderColor: 'red',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Data'
                        },
                        ticks: {
                            maxRotation: 45,
                            autoSkip: true,
                            autoSkipPadding: 15
                        }
                    },
                    y: {
                        type: scaleType === 'logaritmica' ? 'logarithmic' : 'linear',
                        title: {
                            display: true,
                            text: 'SP500 per oncia d\'oro (x100)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        };

        if (sp500GoldChart) {
            sp500GoldChart.destroy();
        }
        const sp500GoldCtx = document.getElementById('sp500GoldChart').getContext('2d');
        sp500GoldChart = new Chart(sp500GoldCtx, sp500GoldConfig);

        // Quarto grafico (SP500 normale/oro)
        const sp500NoTRGoldConfig = {
            type: 'line',
            data: {
                datasets: [{
                    label: 'SP500 (senza dividendi) per oncia d\'oro (x100)',
                    data: filteredSP500NoTRGoldRatio.map(item => ({
                        x: item.date,
                        y: item.price
                    })),
                    borderColor: '#4169E1', // Royal Blue
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Media del periodo',
                    data: filteredSP500NoTRGoldRatio.map(item => ({
                        x: item.date,
                        y: sp500NoTRGoldAverage
                    })),
                    borderColor: 'red',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Data'
                        },
                        ticks: {
                            maxRotation: 45,
                            autoSkip: true,
                            autoSkipPadding: 15
                        }
                    },
                    y: {
                        type: scaleType === 'logaritmica' ? 'logarithmic' : 'linear',
                        title: {
                            display: true,
                            text: 'SP500 per oncia d\'oro (x100)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        };

        if (sp500NoTRGoldChart) {
            sp500NoTRGoldChart.destroy();
        }
        const sp500NoTRGoldCtx = document.getElementById('sp500NoTRGoldChart').getContext('2d');
        sp500NoTRGoldChart = new Chart(sp500NoTRGoldCtx, sp500NoTRGoldConfig);
    }

    // Inizializzazione date
    document.getElementById('startDate').value = '1971-08';
    document.getElementById('endDate').value = '2025-03';

    // Event listeners
    document.getElementById('scaleType').addEventListener('change', createOrUpdateCharts);
    document.getElementById('startDate').addEventListener('change', createOrUpdateCharts);
    document.getElementById('endDate').addEventListener('change', createOrUpdateCharts);

    // Creazione grafici iniziali
    createOrUpdateCharts();
}

document.addEventListener('DOMContentLoaded', createChart);
