let monthlyChart = null;
let dailyChart = null;
let pctDailyChart = null;
let exchangeRates = [];
let inflationData = {};
let exchangeRatesMap = {};
let GC_F = []; // Aggiungo variabile globale per i dati giornalieri

// Funzione per caricare i dati dell'inflazione
function loadInflationData() {
    return fetch('csv/datiinflazionemediaitalia.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n');
            rows.forEach(row => {
                const [year, inflation] = row.split(';');
                if (year && inflation) {
                    inflationData[year.trim()] = parseFloat(inflation.replace('%', '').replace(',', '.')) / 100;
                }
            });
        });
}

// Funzione per caricare il dataset del cambio EUR/USD
function loadExchangeRates() {
    return Promise.all([
        fetch('json/cambio_eur_usd_storico.json').then(response => response.json()),
        fetch('json/cambio_eur_usd_updated.json').then(response => response.json())
    ])
    .then(([historicalData, updatedData]) => {
        // Unisce i dati e crea un oggetto con la data come chiave
        const mergedData = mergeData(historicalData, updatedData);
        mergedData.forEach(item => {
            if (item.Date && item.Close) {
                exchangeRatesMap[item.Date] = item.Close;
            }
        });
    });
}

// Funzione per unire i dati storici e aggiornati
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
    return mergedData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
}

// Funzione corretta per calcolare i valori reali al netto dell'inflazione
function adjustForInflationCumulative(values, dates, inflationData) {
    if (dates.length === 0 || values.length === 0) return [];
    
    // Calcoliamo il fattore di deflazione cumulativo dall'anno di partenza
    const startYear = new Date(dates[0]).getFullYear();
    let cumulativeDeflator = 1;

    return values.map((value, index) => {
        const currentYear = new Date(dates[index]).getFullYear();
        
        // Aggiorniamo il deflatore solo se cambiamo anno
        if (index === 0 || currentYear > new Date(dates[index-1]).getFullYear()) {
            // Reset del deflatore per ogni nuovo valore da calcolare
            cumulativeDeflator = 1;
            // Calcoliamo l'inflazione cumulativa dall'anno di partenza all'anno corrente
            for (let y = startYear; y < currentYear; y++) {
                if (inflationData[y]) {
                    cumulativeDeflator *= (1 + inflationData[y]);
                }
            }
        }
        // Dividiamo per il deflatore cumulativo per ottenere il valore reale
        return value / cumulativeDeflator;
    });
}

// Funzione per ottenere il tasso di cambio usando un oggetto di lookup
function getExchangeRate(date) {
    return exchangeRatesMap[date] || null;
}

// Modifica la funzione createMonthlyChart per includere i dati in euro
function createMonthlyChart(data) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChart) monthlyChart.destroy();
    
    const startDate = document.getElementById('monthlyStartDate').value;
    const endDate = document.getElementById('monthlyEndDate').value;
    
    const filteredData = data.filter(item => 
        item.date >= startDate && item.date <= endDate
    );

    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredData.map(item => item.date),
            datasets: [{
                label: 'Prezzo Oro (USD)',
                data: filteredData.map(item => item.price),
                borderColor: 'gold',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: true,
                pointRadius: 0,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Prezzo Oro - Storico Mensile'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Prezzo (USD)'
                    }
                }
            }
        }
    });
}

// Modifica createDailyChart per includere i dati in euro
function createDailyChart(data) {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    if (dailyChart) dailyChart.destroy();
    
    const startDate = document.getElementById('dailyStartDate').value;
    const endDate = document.getElementById('dailyEndDate').value;
    
    const filteredData = data.filter(item => 
        item.Date >= startDate && 
        item.Date <= endDate && 
        item.Close !== null
    );

    // Ottiene i tassi di cambio corretti per ogni data
    const eurValues = filteredData.map(item => {
        const exchangeRate = getExchangeRate(item.Date);
        return exchangeRate ? item.Close / exchangeRate : null;
    }).filter(value => value !== null);
    
    // Aggiusta per inflazione usando la funzione adjustForInflationCumulative
    const inflationAdjustedEurValues = adjustForInflationCumulative(
        eurValues,
        filteredData.map(item => item.Date),
        inflationData
    );

    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredData.map(item => item.Date),
            datasets: [
                {
                    label: 'Prezzo Oro (USD)',
                    data: filteredData.map(item => item.Close),
                    borderColor: 'gold',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 1
                },
                {
                    label: 'Prezzo Oro (EUR)',
                    data: eurValues,
                    borderColor: 'blue',
                    backgroundColor: 'rgba(0, 0, 255, 0.1)',
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 1
                },
                {
                    label: 'Prezzo Oro (EUR) Italian Infl. Adj. (FOI)',
                    data: inflationAdjustedEurValues,
                    borderColor: 'green',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Prezzo Oro - Storico Giornaliero'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Prezzo'
                    }
                }
            }
        }
    });
}

function calculatePercentageChanges(values, startValue) {
    return values.map(value => ((value / startValue) - 1) * 100);
}

function createPctDailyChart(data) {
    const ctx = document.getElementById('pctDailyChart').getContext('2d');
    if (pctDailyChart) pctDailyChart.destroy();
    
    const startDate = document.getElementById('pctStartDate').value;
    const endDate = document.getElementById('pctEndDate').value;
    
    const filteredData = data.filter(item => 
        item.Date >= startDate && 
        item.Date <= endDate && 
        item.Close !== null
    );

    if (filteredData.length === 0) return;

    const startUsdPrice = filteredData[0].Close;
    const usdValues = calculatePercentageChanges(
        filteredData.map(item => item.Close),
        startUsdPrice
    );

    // Calcola valori EUR
    const eurValues = filteredData.map((item, i) => {
        const exchangeRate = getExchangeRate(item.Date);
        return item.Close / exchangeRate;
    });
    const startEurPrice = eurValues[0];
    const eurPctValues = calculatePercentageChanges(eurValues, startEurPrice);

    // Calcola valori EUR aggiustati per inflazione
    const inflationAdjustedEurValues = adjustForInflationCumulative(
        eurValues,
        filteredData.map(item => item.Date),
        inflationData
    );
    const startAdjPrice = inflationAdjustedEurValues[0];
    const adjPctValues = calculatePercentageChanges(inflationAdjustedEurValues, startAdjPrice);

    pctDailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredData.map(item => item.Date),
            datasets: [
                {
                    label: 'Variazione % USD',
                    data: usdValues,
                    borderColor: 'gold',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 1
                },
                {
                    label: 'Variazione % EUR',
                    data: eurPctValues,
                    borderColor: 'blue',
                    backgroundColor: 'rgba(0, 0, 255, 0.1)',
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 1
                },
                {
                    label: 'Variazione % EUR Italian Infl. Adj. (FOI)',
                    data: adjPctValues,
                    borderColor: 'green',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Variazioni % dal prezzo iniziale'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Variazione %'
                    }
                }
            }
        }
    });
}

// Modifica la funzione di caricamento principale per includere i nuovi dati
document.addEventListener('DOMContentLoaded', function() {
    Promise.all([
        fetch('json/GC=F.json').then(response => response.json()),
        loadExchangeRates(),
        loadInflationData()
    ])
    .then(([dailyData]) => {
        GC_F = dailyData; // Salvo i dati in variabile globale
        // Inizializza e crea prima il grafico giornaliero
        initializeDailyDateInputs(dailyData);
        createDailyChart(dailyData);

        document.getElementById('dailyStartDate').addEventListener('change', () => updateDailyChart(dailyData));
        document.getElementById('dailyEndDate').addEventListener('change', () => updateDailyChart(dailyData));
        
        document.getElementById('pctStartDate').value = document.getElementById('dailyStartDate').value;
        document.getElementById('pctEndDate').value = document.getElementById('dailyEndDate').value;
        createPctDailyChart(dailyData);

        document.getElementById('pctStartDate').addEventListener('change', () => updatePctDailyChart(dailyData));
        document.getElementById('pctEndDate').addEventListener('change', () => updatePctDailyChart(dailyData));

        // Poi carica i dati mensili
        return fetch('csv/gold_monthly-storico.csv')
            .then(response => response.text())
            .then(monthlyData => {
                const parsedMonthlyData = parseMonthlyData(monthlyData);
                initializeMonthleDateInputs(parsedMonthlyData);
                createMonthlyChart(parsedMonthlyData);

                document.getElementById('monthlyStartDate').addEventListener('change', () => updateMonthlyChart(parsedMonthlyData));
                document.getElementById('monthlyEndDate').addEventListener('change', () => updateMonthlyChart(parsedMonthlyData));
            });
    })
    .catch(error => {
        console.error("Errore durante il caricamento dei dati:", error);
    });
});

function parseMonthlyData(csv) {
    const lines = csv.split('\n');
    const monthlyData = lines.map(line => {
        const [date, price] = line.split(',');
        return {
            date: date,
            price: parseFloat(price)
        };
    }).filter(item => item.price && !isNaN(item.price));

    // Aggiungi le medie mensili dal 2025-03 in poi
    const lastMonthlyData = new Date(monthlyData[monthlyData.length-1].date);
    const currentDate = new Date();
    
    // Se abbiamo superato marzo 2025 e abbiamo dati giornalieri
    if (currentDate > new Date('2025-03-01') && GC_F && GC_F.length > 0) {
        // Organizziamo i prezzi giornalieri per mese
        const monthlyAverages = {};
        GC_F.forEach(item => {
            const date = new Date(item.Date);
            if (date >= new Date('2025-03-01')) {
                const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
                if (!monthlyAverages[monthKey]) {
                    monthlyAverages[monthKey] = [];
                }
                if (item.Close) {
                    monthlyAverages[monthKey].push(item.Close);
                }
            }
        });

        // Calcoliamo le medie mensili e le aggiungiamo al dataset
        Object.keys(monthlyAverages).forEach(monthKey => {
            const prices = monthlyAverages[monthKey];
            if (prices.length > 0) {
                const average = prices.reduce((a, b) => a + b, 0) / prices.length;
                monthlyData.push({
                    date: monthKey,
                    price: average
                });
            }
        });

        // Ordiniamo i dati per data
        monthlyData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return monthlyData;
}

function initializeMonthleDateInputs(data) {
    const startInput = document.getElementById('monthlyStartDate');
    const endInput = document.getElementById('monthlyEndDate');
    
    startInput.min = data[0].date;
    startInput.max = data[data.length - 1].date;
    startInput.value = data[0].date;
    
    endInput.min = data[0].date;
    endInput.max = data[data.length - 1].date;
    endInput.value = data[data.length - 1].date;
}

function initializeDailyDateInputs(data) {
    const startInput = document.getElementById('dailyStartDate');
    const endInput = document.getElementById('dailyEndDate');
    
    const validDates = data.filter(item => item.Close !== null)
                          .map(item => item.Date);
    
    startInput.min = validDates[0];
    startInput.max = validDates[validDates.length - 1];
    startInput.value = validDates[0];
    
    endInput.min = validDates[0];
    endInput.max = validDates[validDates.length - 1];
    endInput.value = validDates[validDates.length - 1];
}

function updateMonthlyChart(data) {
    createMonthlyChart(data);
}

function updateDailyChart(data) {
    createDailyChart(data);
}

function updatePctDailyChart(data) {
    createPctDailyChart(data);
}
