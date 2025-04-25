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
        const filteredSP500 = normalizeData(allData.sp500, startDate)
            .filter(item => item.date <= endDate);

        // Calcola il rapporto petrolio/oro e la sua variazione percentuale
        const oilGoldRatio = allData.oil.map(oilItem => {
            const goldItem = allData.gold.find(g =>
                g.date.getFullYear() === oilItem.date.getFullYear() &&
                g.date.getMonth() === oilItem.date.getMonth()
            );
            if (!goldItem) return null;
            return {
                date: oilItem.date,
                price: (oilItem.price / goldItem.price) * 100, // Barili per oncia * 100 per leggibilità
                percentage: 0 // Verrà calcolato dopo
            };
        }).filter(item => item !== null);

        // Calcola le variazioni percentuali
        const baseValue = oilGoldRatio[0].price;
        oilGoldRatio.forEach(item => {
            item.percentage = ((item.price - baseValue) / baseValue) * 100;
        });

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

        // Calcola le variazioni percentuali per SP500/oro
        const baseSP500Value = sp500GoldRatio[0].price;
        sp500GoldRatio.forEach(item => {
            item.percentage = ((item.price - baseSP500Value) / baseSP500Value) * 100;
        });

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

        // Calcola le variazioni percentuali per SP500 no TR/oro
        const baseSP500NoTRValue = sp500NoTRGoldRatio[0].price;
        sp500NoTRGoldRatio.forEach(item => {
            item.percentage = ((item.price - baseSP500NoTRValue) / baseSP500NoTRValue) * 100;
        });

        // Filtra i dati per data
        const filteredSP500NoTRGoldRatio = sp500NoTRGoldRatio
            .filter(item => item.date >= startDate && item.date <= endDate);

        // Calcola le medie dei rapporti (sia assolute che percentuali)
        const oilGoldAverage = filteredOilGoldRatio.reduce((sum, item) => sum + item.price, 0) / filteredOilGoldRatio.length;
        const oilGoldPercentageAverage = filteredOilGoldRatio.reduce((sum, item) => sum + item.percentage, 0) / filteredOilGoldRatio.length;
        const sp500GoldAverage = filteredSP500GoldRatio.reduce((sum, item) => sum + item.price, 0) / filteredSP500GoldRatio.length;
        const sp500GoldPercentageAverage = filteredSP500GoldRatio.reduce((sum, item) => sum + item.percentage, 0) / filteredSP500GoldRatio.length;
        const sp500NoTRGoldAverage = filteredSP500NoTRGoldRatio.reduce((sum, item) => sum + item.price, 0) / filteredSP500NoTRGoldRatio.length;
        const sp500NoTRGoldPercentageAverage = filteredSP500NoTRGoldRatio.reduce((sum, item) => sum + item.percentage, 0) / filteredSP500NoTRGoldRatio.length;

        // Primo grafico con scala logaritmica opzionale
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

        // Secondo grafico (petrolio/oro) - sempre scala lineare
        const viewType = document.getElementById('oilGoldViewType').value;
        const oilGoldConfig = {
            type: 'line',
            data: {
                datasets: [{
                    label: viewType === 'absolute' ? 'Barili di petrolio per oncia d\'oro (x100)' : 'Variazione % rispetto al 1971',
                    data: filteredOilGoldRatio.map(item => ({
                        x: item.date,
                        y: viewType === 'absolute' ? item.price : item.percentage
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
                        y: viewType === 'absolute' ? oilGoldAverage : oilGoldPercentageAverage
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
                        type: 'linear',
                        title: {
                            display: true,
                            text: viewType === 'absolute' ? 'Barili di petrolio per oncia d\'oro (x100)' : 'Variazione percentuale (%)'
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

        // Terzo grafico (SP500/oro) - sempre scala lineare
        const sp500ViewType = document.getElementById('sp500GoldViewType').value;
        const sp500GoldConfig = {
            type: 'line',
            data: {
                datasets: [{
                    label: sp500ViewType === 'absolute' ? 'SP500 TR per oncia d\'oro (x100)' : 'Variazione % rispetto al 1971',
                    data: filteredSP500GoldRatio.map(item => ({
                        x: item.date,
                        y: sp500ViewType === 'absolute' ? item.price : item.percentage
                    })),
                    borderColor: '#6a0dad',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Media del periodo',
                    data: filteredSP500GoldRatio.map(item => ({
                        x: item.date,
                        y: sp500ViewType === 'absolute' ? sp500GoldAverage : sp500GoldPercentageAverage
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
                        type: 'linear',
                        title: {
                            display: true,
                            text: sp500ViewType === 'absolute' ? 'SP500 TR per oncia d\'oro (x100)' : 'Variazione percentuale (%)'
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

        // Quarto grafico (SP500 normale/oro) - sempre scala lineare
        const sp500NoTRViewType = document.getElementById('sp500NoTRGoldViewType').value;
        const sp500NoTRGoldConfig = {
            type: 'line',
            data: {
                datasets: [{
                    label: sp500NoTRViewType === 'absolute' ? 'SP500 per oncia d\'oro (x100)' : 'Variazione % rispetto al 1971',
                    data: filteredSP500NoTRGoldRatio.map(item => ({
                        x: item.date,
                        y: sp500NoTRViewType === 'absolute' ? item.price : item.percentage
                    })),
                    borderColor: '#4169E1',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Media del periodo',
                    data: filteredSP500NoTRGoldRatio.map(item => ({
                        x: item.date,
                        y: sp500NoTRViewType === 'absolute' ? sp500NoTRGoldAverage : sp500NoTRGoldPercentageAverage
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
                        type: 'linear',
                        title: {
                            display: true,
                            text: sp500NoTRViewType === 'absolute' ? 'SP500 per oncia d\'oro (x100)' : 'Variazione percentuale (%)'
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
    document.getElementById('oilGoldViewType').addEventListener('change', createOrUpdateCharts);
    document.getElementById('sp500GoldViewType').addEventListener('change', createOrUpdateCharts);
    document.getElementById('sp500NoTRGoldViewType').addEventListener('change', createOrUpdateCharts);

    // Creazione grafici iniziali
    createOrUpdateCharts();
}

document.addEventListener('DOMContentLoaded', createChart);
