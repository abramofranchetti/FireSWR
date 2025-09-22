
let seasonalityChart = null;

async function loadData() {
    try {
        // Carica i dati dell'oro
        const goldResponse = await fetch('csv/sp500_montly_historical.csv');
        const goldText = await goldResponse.text();
        const goldData = goldText.split('\n')
            .map(line => {
                // Gestione formato: '01/08/1978 103.30' (gg/mm/yyyy)
                const [date, price] = line.trim().split(/\s+/);
                if (date && price) {
                    const [day, month, year] = date.split('/');
                    if (day && month && year) {
                        return {
                            date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
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
        const startYearSelect = document.getElementById('startYear');
        const endYearSelect = document.getElementById('endYear');
        startYearSelect.innerHTML = '';
        endYearSelect.innerHTML = '';
        years.forEach(year => {
            startYearSelect.add(new Option(year, year));
            endYearSelect.add(new Option(year, year));
        });
        startYearSelect.value = '1990';
        endYearSelect.value = years[years.length - 1].toString();

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
        startYearSelect.addEventListener('change', () => updateChart(goldData, monthlyRates));
        endYearSelect.addEventListener('change', () => updateChart(goldData, monthlyRates));
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
    if (mode === 'absolute') {
        // Media dei prezzi assoluti
        for (let year in dataByYear) {
            for (let m = 0; m < 12; m++) {
                if (dataByYear[year][m] != null) monthlyData[m].push(dataByYear[year][m]);
            }
        }
        return monthlyData.map(prices => prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0);
    } else {
        // Media delle variazioni percentuali mese su mese
        // Per ogni anno, calcola la variazione % di ogni mese rispetto al mese precedente
        for (let year in dataByYear) {
            for (let m = 1; m < 12; m++) {
                const prev = dataByYear[year][m - 1];
                const curr = dataByYear[year][m];
                if (prev != null && curr != null && prev !== 0) {
                    const perc = ((curr - prev) / prev) * 100;
                    monthlyData[m].push(perc);
                }
            }
        }
        // Il primo mese (gennaio) non ha variazione, lo mettiamo a 0 o null
        monthlyData[0] = monthlyData[0].map(() => 0);
        return monthlyData.map(prices => prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0);
    }
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
    const monthlyAverages = calculateSeasonality(goldData, eurUsdRates, startYear, endYear, convertToEur, mode);
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
            datasets: [{
                label: label,
                data: monthlyAverages,
                borderColor: 'rgb(255, 215, 0)',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: true,
                tension: 0.4
            }]
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
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
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