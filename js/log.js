document.addEventListener('DOMContentLoaded', function () {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const normalizationToggle = document.getElementById('normalizationToggle');
    const chartCanvas = document.getElementById('chartCanvas');
    const chartContainer = document.querySelector('.chart-container');
    let chart, dataLimits;

    // Mostra un messaggio di caricamento
    const loadingMessage = document.createElement('p');
    loadingMessage.textContent = 'Caricamento dati in corso...';
    loadingMessage.style.textAlign = 'center';
    chartContainer.appendChild(loadingMessage);

    // Funzione per calcolare rendimenti cumulati
    function calculateReturns(data, startDate, endDate, normalize = true) {
        const filteredData = data.filter(item => item.Date >= startDate && item.Date <= endDate);
        const priceReturns = [];
        const percentReturns = [];
        const logReturns = [];
        let cumulativePrice = 0;
        let cumulativePercent = 0;
        let cumulativeLog = 0;

        for (let i = 1; i < filteredData.length; i++) {
            const prev = filteredData[i - 1].Close;
            const curr = filteredData[i].Close;

            cumulativePrice += curr - prev;
            cumulativePercent += ((curr - prev) / prev) * 100;
            cumulativeLog += Math.log(curr / prev);

            priceReturns.push(cumulativePrice);
            percentReturns.push(cumulativePercent);
            logReturns.push(cumulativeLog);
        }

        // Porta tutti i dati al punto zero
        const shiftToZero = (arr) => arr.map(value => value - arr[0]);

        if (normalize) {
            // Normalizza i dati tra 0 e 1000
            const normalizeData = (arr) => {
                const min = Math.min(...arr);
                const max = Math.max(...arr);
                return arr.map(value => ((value - min) / (max - min)) * 1000);
            };
            return { 
                priceReturns: normalizeData(shiftToZero(priceReturns)), 
                percentReturns: normalizeData(shiftToZero(percentReturns)), 
                logReturns: normalizeData(shiftToZero(logReturns)), 
                dates: filteredData.slice(1).map(item => item.Date) 
            };
        } else {
            return { 
                priceReturns: shiftToZero(priceReturns), 
                percentReturns: shiftToZero(percentReturns), 
                logReturns: shiftToZero(logReturns), 
                dates: filteredData.slice(1).map(item => item.Date) 
            };
        }
    }

    // Funzione per aggiornare il grafico
    function updateChart(data, startDate, endDate, normalize) {
        const { priceReturns, percentReturns, logReturns, dates } = calculateReturns(data, startDate, endDate, normalize);

        if (dates.length === 0) {
            alert('Nessun dato disponibile per l\'intervallo di date selezionato.');
            return;
        }

        if (chart) chart.destroy();

        chart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    { 
                        label: normalize ? 'Rendimento Cumulato di Prezzo (Normalizzato)' : 'Rendimento Cumulato di Prezzo', 
                        data: priceReturns, 
                        borderColor: 'blue', 
                        fill: false, 
                        borderWidth: 1, 
                        pointRadius: 0 
                    },
                    { 
                        label: normalize ? 'Rendimento Cumulato Percentuale (Normalizzato)' : 'Rendimento Cumulato Percentuale', 
                        data: percentReturns, 
                        borderColor: 'green', 
                        fill: false, 
                        borderWidth: 1, 
                        pointRadius: 0 
                    },
                    { 
                        label: normalize ? 'Rendimento Cumulato Logaritmico (Normalizzato)' : 'Rendimento Cumulato Logaritmico', 
                        data: logReturns, 
                        borderColor: 'red', 
                        fill: false, 
                        borderWidth: 1, 
                        pointRadius: 0 
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: { title: { display: true, text: 'Data' } },
                    y: { 
                        title: { display: true, text: normalize ? 'Rendimento Normalizzato' : 'Rendimento' },
                        min: normalize ? 0 : undefined,
                        max: normalize ? 1000 : undefined
                    }
                }
            }
        });
    }

    // Carica dati e aggiorna grafico
    fetch('json/sp500.json')
        .then(response => response.json())
        .then(data => {
            loadingMessage.remove(); // Rimuove il messaggio di caricamento

            // Imposta i limiti delle date
            dataLimits = {
                minDate: data[0].Date,
                maxDate: data[data.length - 1].Date
            };
            startDateInput.min = dataLimits.minDate;
            startDateInput.max = dataLimits.maxDate;
            endDateInput.min = dataLimits.minDate;
            endDateInput.max = dataLimits.maxDate;

            // Imposta i valori di default delle date
            startDateInput.value = dataLimits.minDate;
            endDateInput.value = dataLimits.maxDate;

            // Aggiorna il grafico iniziale
            updateChart(data, startDateInput.value, endDateInput.value, normalizationToggle.value === 'normalized');

            // Event listeners per aggiornare il grafico
            startDateInput.addEventListener('change', () => {
                updateChart(data, startDateInput.value, endDateInput.value, normalizationToggle.value === 'normalized');
            });

            endDateInput.addEventListener('change', () => {
                updateChart(data, startDateInput.value, endDateInput.value, normalizationToggle.value === 'normalized');
            });

            normalizationToggle.addEventListener('change', () => {
                updateChart(data, startDateInput.value, endDateInput.value, normalizationToggle.value === 'normalized');
            });
        })
        .catch(error => {
            loadingMessage.textContent = 'Errore nel caricamento dei dati.';
            console.error('Errore:', error);
        });
});