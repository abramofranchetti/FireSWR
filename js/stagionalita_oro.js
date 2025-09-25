
let seasonalityChart = null;

async function loadData() {
    try {
        // Carica i dati dell'oro
        const goldResponse = await fetch('csv/gold_monthly-storico.csv');
        const goldText = await goldResponse.text();
        const goldData = goldText.split('\n')
            .map(line => {
                const [date, price] = line.trim().split(',');
                if (date && price) {
                    const [year, month] = date.split('-');
                    if (year && month) {
                        return {
                            date: new Date(parseInt(year), parseInt(month) - 1, 1),
                            price: parseFloat(price.replace(',', '.'))
                        };
                    }
                }
                return null;
            })
            .filter(item => item !== null && !isNaN(item.price));

        // Carica i tassi di cambio EUR/USD giornalieri dal file JSON
        const ratesResponse = await fetch('json/cambio_eur_usd_storico.json');
        const ratesJson = await ratesResponse.json();
        // Crea una mappa: { 'YYYY-MM': rate } usando il primo giorno disponibile del mese
        const monthlyRates = {};
        ratesJson.forEach(entry => {
            if (!entry.Date || !entry.Close) return;
            const [year, month, day] = entry.Date.split('-');
            const key = `${year}-${month}`;
            // Solo il primo giorno disponibile del mese
            if (!(key in monthlyRates) && day === '01') {
                monthlyRates[key] = parseFloat(entry.Close);
            }
        });
        // Se per qualche mese manca il giorno 01, prendi il primo valore disponibile del mese
        ratesJson.forEach(entry => {
            if (!entry.Date || !entry.Close) return;
            const [year, month] = entry.Date.split('-');
            const key = `${year}-${month}`;
            if (!(key in monthlyRates)) {
                monthlyRates[key] = parseFloat(entry.Close);
            }
        });

        // Imposta gli anni disponibili nei selettori
        const years = [...new Set(goldData.map(d => d.date.getFullYear()))].sort((a, b) => a - b);
        // Sostituisci i <select> con <input type='number'>
        const startYearInput = document.getElementById('startYear');
        const endYearInput = document.getElementById('endYear');
        startYearInput.type = 'number';
        endYearInput.type = 'number';
        startYearInput.min = years[0];
        startYearInput.max = years[years.length - 1];
        endYearInput.min = years[0];
        endYearInput.max = years[years.length - 1];
        startYearInput.value = 2010;
        endYearInput.value = 2024;

        // Opzione visualizzazione: percentuale o assoluto
        let modeSelect = document.getElementById('seasonalityMode');
        if (!modeSelect) {
            modeSelect = document.createElement('select');
            modeSelect.id = 'seasonalityMode';
            modeSelect.className = 'form-control mb-3';
            modeSelect.style.maxWidth = '300px';
            modeSelect.innerHTML = `
                <option value="percent">Media variazioni percentuali</option>
                <option value="absolute">Media prezzi assoluti</option>
            `;
            const controlsRow = document.querySelector('.row.mb-4') || document.body;
            controlsRow.appendChild(modeSelect);
        }

        // Event listeners
    startYearInput.addEventListener('change', () => updateChart(goldData, monthlyRates));
    endYearInput.addEventListener('change', () => updateChart(goldData, monthlyRates));
        document.getElementById('convertToEur').addEventListener('change', () => updateChart(goldData, monthlyRates));
        modeSelect.addEventListener('change', () => updateChart(goldData, monthlyRates));

        // Crea il grafico iniziale
        updateChart(goldData, monthlyRates);
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        alert('Errore nel caricamento dei dati.');
    }
}

function calculateSeasonality(goldData, monthlyRates, startYear, endYear, convertToEur, mode) {
    // Array per ogni mese (0=Gennaio, ..., 11=Dicembre)
    const monthlyData = Array.from({ length: 12 }, () => []);
    // Raggruppa i dati per anno
    const dataByYear = {};
    goldData.forEach(item => {
        const year = item.date.getFullYear();
        if (year >= startYear && year <= endYear) {
            if (!dataByYear[year]) dataByYear[year] = Array(12).fill(null);
            const month = item.date.getMonth();
            let price = item.price;
            if (convertToEur) {
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                let rate = 1;
                if (monthlyRates && monthlyRates[key]) {
                    rate = monthlyRates[key];
                }
                price = price / rate;
            }
            dataByYear[year][month] = price;
        }
    });
    // Funzione di supporto per media, varianza, std
    function getStats(arr) {
        if (!arr.length) return {mean: 0, variance: 0, std: 0};
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
        const std = Math.sqrt(variance);
        return {mean, variance, std};
    }
    if (mode === 'absolute') {
        for (let year in dataByYear) {
            for (let m = 0; m < 12; m++) {
                if (dataByYear[year][m] != null) monthlyData[m].push(dataByYear[year][m]);
            }
        }
    } else {
        // Per ogni anno, calcola la variazione % di ogni mese rispetto al mese precedente
        for (let yearIdx = 0; yearIdx < Object.keys(dataByYear).length; yearIdx++) {
            const year = Object.keys(dataByYear)[yearIdx];
            const prevYear = Object.keys(dataByYear)[yearIdx - 1];
            for (let m = 0; m < 12; m++) {
                if (m === 0) {
                    // Gennaio: usa dicembre dell'anno precedente se disponibile
                    if (prevYear && dataByYear[prevYear][11] != null && dataByYear[year][0] != null && dataByYear[prevYear][11] !== 0) {
                        const perc = ((dataByYear[year][0] - dataByYear[prevYear][11]) / dataByYear[prevYear][11]) * 100;
                        monthlyData[0].push(perc);
                    }
                } else {
                    const prev = dataByYear[year][m - 1];
                    const curr = dataByYear[year][m];
                    if (prev != null && curr != null && prev !== 0) {
                        const perc = ((curr - prev) / prev) * 100;
                        monthlyData[m].push(perc);
                    }
                }
            }
        }
    }
    // Calcola stats per ogni mese
    const stats = monthlyData.map(getStats);
    return stats;
}

function updateChart(goldData, eurUsdRates) {
    const startYear = parseInt(document.getElementById('startYear').value);
    const endYear = parseInt(document.getElementById('endYear').value);
    const convertToEur = document.getElementById('convertToEur').checked;
    const mode = document.getElementById('seasonalityMode')?.value || 'percent';
    if (startYear > endYear) {
        alert('L\'anno iniziale deve essere minore o uguale all\'anno finale');
        return;
    }
    const monthlyStats = calculateSeasonality(goldData, eurUsdRates, startYear, endYear, convertToEur, mode);
    const means = monthlyStats.map(s => s.mean);
    const stds = monthlyStats.map(s => s.std);
    const upper = means.map((m, i) => m + stds[i]);
    const lower = means.map((m, i) => m - stds[i]);
    const currency = convertToEur ? '€' : '$';
    const ctx = document.getElementById('seasonalityChart').getContext('2d');
    if (seasonalityChart) {
        seasonalityChart.destroy();
    }
    let label, yTitle;
    if (mode === 'absolute') {
        label = `Prezzo medio oro (${currency}/oncia)`;
        yTitle = `Prezzo (${currency}/oncia)`;
    } else {
        label = `Media variazioni % mese su mese`;
        yTitle = `Variazione % mese su mese`;
    }
    seasonalityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
            datasets: [
                {
                    label: 'Intervallo ±1σ',
                    data: upper,
                    tension: 0.4,
                    borderColor: 'rgba(100,100,255,0)',
                    backgroundColor: 'rgba(100,100,255,0.15)',
                    fill: {
                        target: '1',
                        above: 'rgba(100,100,255,0.15)',
                        below: 'rgba(100,100,255,0.15)'
                    },
                    pointRadius: 0,
                    borderWidth: 0,
                    order: 1
                },
                {
                    label: '',
                    data: lower,
                    tension: 0.4,
                    borderColor: 'rgba(100,100,255,0)',
                    backgroundColor: 'rgba(100,100,255,0.15)',
                    fill: false,
                    pointRadius: 0,
                    borderWidth: 0,
                    order: 1,                    
                },
                {
                    label: label,
                    data: means,
                    borderColor: 'rgb(255, 215, 0)',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Stagionalità Oro ${startYear}-${endYear}`,
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if(context.dataset.label === 'Intervallo ±1σ' || context.dataset.label === 'Intervallo -1σ') return null;
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                },
                legend: {
                    display: true
                },
                annotation: {
                    annotations: {
                        zeroLine: {
                            type: 'line',
                            borderColor: 'red',
                            borderWidth: 1,
                            scaleID: 'y',
                            value: 0,
                            label: {
                                display: false
                            }
                        }
                    }
                }                
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: yTitle
                    }
                }
            }
        }
    });
}

// Avvia il caricamento dati all'avvio
document.addEventListener('DOMContentLoaded', loadData);