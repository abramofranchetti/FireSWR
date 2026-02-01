let btcEurData = [];
let foiData = [];
let eurUsdData = [];
let goldData = [];
let sp500Data = [];
let rawSp500Data = [];
let eurUsdChangeData = [];
let charts = {};

async function loadData() {
    try {
        const [eurResponse, sp500DailyResponse, eurUsdDailyResponse, foiResponse, eurUsdResponse, goldResponse] = await Promise.all([
            fetch('json/btc-eur.json'),
            fetch('json/sp500.json'),
            fetch('json/cambio_eur_usd_storico.json'),
            fetch('csv/foi.csv'),
            fetch('csv/eur_usd.csv'),
            fetch('csv/gold_monthly-storico_benner.csv'),
        ]);

        btcEurData = await eurResponse.json();
        eurUsdChangeData = await eurUsdDailyResponse.json();
        rawSp500Data = await sp500DailyResponse.json();

        // Convert SP500 values from USD to EUR
        sp500Data = rawSp500Data.map(item => {
            const exchangeRate = eurUsdChangeData.find(rate =>
                rate.Date.substring(0, 10) === item.Date.substring(0, 10))?.Close;

            return {
                ...item,
                Close: exchangeRate ? item.Close / parseFloat(exchangeRate) : item.Close
            };
        });

        foiData = await parseCSV(await foiResponse.text());
        // dopo parseCSV
        foiData = foiData.map(f => ({
            date: f.date,
            value: f.value * 10  // moltiplica per 10 per ottenere il valore del paniere
        }));

        eurUsdData = await parseCSV(await eurUsdResponse.text());
        goldData = await parseGoldCSV(await goldResponse.text());


        initializeDateFilters();
        createCharts();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function parseCSV(data) {
    const lines = data.split('\n');
    const result = [];
    lines.forEach((line, index) => {
        if (index > 0 && line.trim()) {  // salta l'header
            const [date, value] = line.split(';');
            result.push({
                date: date.trim(),
                value: parseFloat(value.replace(',', '.').replace('%', ''))
            });
        }
    });
    return result;
}

//funzione per il parsing del CSV dell'oro
function parseGoldCSV(data) {
    const lines = data.split('\n');
    const result = [];

    lines.forEach(line => {
        if (!line.trim()) return;

        const [ym, value] = line.split(',');
        const year = parseInt(ym.substring(0, 4), 10);

        // solo dati dal 2000 in poi
        if (year < 2000) return;

        result.push({
            date: `${ym}-01`, // YYYY-MM-01
            value: parseFloat(value)
        });
    });

    return result;
}

function initializeDateFilters() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    // Set initial dates from data
    const firstDate = btcEurData[0].Date.slice(0, 10);
    const lastDate = btcEurData[btcEurData.length - 1].Date.slice(0, 10);

    startDate.min = firstDate;
    startDate.max = lastDate;
    endDate.min = firstDate;
    endDate.max = lastDate;

    startDate.value = firstDate;
    endDate.value = lastDate;

    // Add event listeners
    startDate.addEventListener('change', updateChart);
    endDate.addEventListener('change', updateChart);
}

function createCharts() {
    // Grafico principale BTC
    const ctxBtc = document.getElementById('btcChart').getContext('2d');
    charts.mainChart = new Chart(ctxBtc, {
        type: 'line',
        data: {
            datasets: [{
                label: 'BTC/EUR',
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                pointRadius: 0,
                hidden: false,
            }, {
                label: 'Media Mobile',
                borderColor: 'rgb(255, 206, 86)',
                borderDash: [5, 5],
                tension: 0.1,
                pointRadius: 0,
                hidden: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    adapters: {
                        date: {
                            locale: 'it'
                        }
                    }
                }
            }
        }
    });

    // Grafico FOI
    const ctxFoi = document.getElementById('foiChart').getContext('2d');
    charts.foiChart = new Chart(ctxFoi, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Panieri FOI acquistabili con 1 BTC',
                borderColor: 'rgb(153, 51, 255)',
                tension: 0.1,
                pointRadius: 0,
            }, {
                label: 'Panieri FOI acquistabili con 10k EUR',
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                pointRadius: 0,
                borderDash: [5, 5]
            }, {
                label: 'Panieri FOI acquistabili con 10k USD',
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                pointRadius: 0,
                borderDash: [5, 5]
            }, {
                label: 'Panieri FOI acquistabili con 0.5 Kg Oro',
                borderColor: 'rgb(255, 215, 0)',
                tension: 0.1,
                pointRadius: 0,
            }, {
                label: 'Panieri FOI acquistabili con 10 S&P500',
                borderColor: 'rgb(128, 128, 128)',
                tension: 0.1,
                pointRadius: 0,
                borderDash: [3, 3]
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    adapters: {
                        date: {
                            locale: 'it'
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Numero di panieri FOI (x 100)'
                    }
                }
            }
        }
    });

    updateChart();
}

function updateChart() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const filteredEurData = filterData(btcEurData, startDate, endDate);

    // Calcola la media del periodo
    const avgValue = filteredEurData.reduce((sum, d) => sum + d.Close, 0) / filteredEurData.length;

    // Crea array di punti per la linea media
    const avgLine = filteredEurData.map(d => ({
        x: d.Date,
        y: avgValue
    }));

    // Calcola il potere d'acquisto in termini di paniere FOI
    const foiPurchasingPower = calculateFoiPurchasingPower(filteredEurData);

    // Calcola i panieri acquistabili con valuta fissa
    const fixedEurPanieri = calculateFixedCurrencyFoiPower(filteredEurData, 10000, true);
    const fixedUsdPanieri = calculateFixedCurrencyFoiPower(filteredEurData, 10000, false);

    // Calcola i panieri acquistabili con 1kg di oro
    const goldFoiPower = calculateGoldFoiPower(filteredEurData, 0.5);

    // Calcola i panieri acquistabili con 10 unità di SP500
    const sp500FoiPower = calculateSP500FoiPower(filteredEurData, 5);

    charts.mainChart.data.datasets[0].data = filteredEurData.map(d => ({
        x: d.Date,
        y: d.Close
    }));

    charts.mainChart.data.datasets[1].data = avgLine;

    charts.foiChart.data.datasets[0].data = foiPurchasingPower.map(d => ({
        x: d.date,
        y: d.value * 100
    }));

    charts.foiChart.data.datasets[1].data = fixedEurPanieri.map(d => ({
        x: d.date,
        y: d.value * 100
    }));

    charts.foiChart.data.datasets[2].data = fixedUsdPanieri.map(d => ({
        x: d.date,
        y: d.value * 100
    }));

    charts.foiChart.data.datasets[3].data = goldFoiPower.map(d => ({
        x: d.date,
        y: d.value * 100
    }));

    charts.foiChart.data.datasets[4].data = sp500FoiPower.map(d => ({
        x: d.date,
        y: d.value * 100
    }));

    charts.mainChart.update();
    charts.foiChart.update();
}

function filterData(data, startDate, endDate) {
    return data.filter(d => {
        const date = d.Date.slice(0, 10);
        return date >= startDate && date <= endDate;
    });
}

function calculateRealValue(btcData, inflationData) {
    // Ordina i dati dell'inflazione dal più vecchio al più recente
    const sortedInflation = [...inflationData].sort((a, b) => b.date.localeCompare(a.date));

    // Trova l'anno più vecchio nei dati BTC
    const oldestBtcYear = Math.min(...btcData.map(d => new Date(d.Date).getFullYear()));

    return btcData.map(d => {
        const currentYear = new Date(d.Date).getFullYear();

        // Calcola l'inflazione cumulativa dall'anno del dato fino all'anno più vecchio
        let cumulativeInflation = 1;
        for (const yearData of sortedInflation) {
            const year = parseInt(yearData.date);
            if (year > currentYear) continue;
            if (year < oldestBtcYear) break;
            cumulativeInflation *= (1 + (yearData.value / 100));
        }

        return {
            date: d.Date,
            value: d.Close / cumulativeInflation
        };
    });
}

function calculateFoiPurchasingPower(btcData) {
    return btcData.map(d => {
        const year = new Date(d.Date).getFullYear().toString();
        const foiValue = foiData.find(f => f.date === year)?.value || 0;

        if (foiValue === 0) return { date: d.Date, value: 0 };

        // Calcola quanti panieri FOI si possono comprare con 1 BTC
        const numPanieri = d.Close / foiValue;

        return {
            date: d.Date,
            value: numPanieri
        };
    });
}

function calculateFixedCurrencyFoiPower(btcData, amount, isEuro) {
    return btcData.map(d => {
        const year = new Date(d.Date).getFullYear().toString();
        const foiValue = foiData.find(f => f.date === year)?.value || 0;
        const exchangeRate = eurUsdData.find(f => f.date === year)?.value || 1;

        if (foiValue === 0) return { date: d.Date, value: 0 };

        // Se USD, converti prima in EUR
        const eurAmount = isEuro ? amount : amount / exchangeRate;
        const numPanieri = eurAmount / foiValue;

        return {
            date: d.Date,
            value: numPanieri
        };
    });
}

function calculateGoldFoiPower(btcData, kgAmount) {
    const OZ_PER_KG = 32.1507466;

    return btcData.map(d => {
        const date = d.Date.substring(0, 10);
        const year = date.substring(0, 4);
        const month = date.substring(0, 7); // YYYY-MM

        // Oro mensile in USD/oncia
        const goldUsdOz = goldData.find(g => g.date.startsWith(month))?.value || 0;

        // Cambio EUR/USD annuale
        const eurUsd = eurUsdData.find(e => e.date === year)?.value || 0;

        // FOI annuale
        const foiValue = foiData.find(f => f.date === year)?.value || 0;

        if (goldUsdOz === 0 || eurUsd === 0 || foiValue === 0) {
            return { date: d.Date, value: 0 };
        }

        // USD/oz → EUR/kg
        const goldEurKg = (goldUsdOz / eurUsd) * OZ_PER_KG;

        return {
            date: d.Date,
            value: (goldEurKg * kgAmount) / foiValue
        };
    });
}


function calculateSP500FoiPower(btcData, amount) {
    let toReturn = [];
    btcData.map(d => {
        const date = new Date(d.Date);
        const year = date.getFullYear().toString();
        const lastValue = toReturn.length > 0 ? toReturn[toReturn.length - 1].value : 0;

        // Trova il valore SP500 per la data esatta
        const sp500Value = sp500Data.find(g => g.Date.substring(0, 10) === d.Date.substring(0, 10))?.Close;
        const foiValue = foiData.find(f => f.date === year)?.value || (lastValue || 0);

        if (!sp500Value || foiValue === 0) {
            toReturn.push({ date: d.Date, value: (lastValue || 0) });
            return;
        }

        // Calcola quanti panieri FOI si possono comprare con amount unità di SP500
        const numPanieri = (parseFloat(sp500Value) * amount) / foiValue;
        toReturn.push({ date: d.Date, value: numPanieri });
    });
    return toReturn;
}

document.addEventListener('DOMContentLoaded', loadData);
