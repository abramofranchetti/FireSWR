// Variabile globale per contenere il dataset
let indexDatasetValues = [];

// Variabile globale per contenere il dataset del cambio EUR/USD
let exchangeRates = [];

// Variabile per la Chart.js (per aggiornare il grafico se necessario)
let chartInstance = null;
let percentageChartInstance = null;
let drawdownChartInstance = null;
let drawdownValueChartInstance = null;

let minDate = new Date("2000-01-01");
let maxDate = new Date("2025-01-01");

// Variabile globale per contenere i dati dell'inflazione
let inflationData = {};

// Funzione per convertire una stringa data ("YYYY-MM-DD") in oggetto Date
function parseDate(dateStr) {
    return new Date(dateStr);
}

// Funzione per unire i dati storici e i dati aggiornati
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

// Funzione per calcolare il drawdown giornaliero
function calcolaDrawdownGiornaliero(valori) {
    if (!valori || valori.length === 0) return [];

    let maxValore = valori[0];
    return valori.map(valore => {
        if (valore > maxValore) {
            maxValore = valore;
        }
        return (maxValore - valore) / maxValore;
    });
}

// Carica il dataset dal file
function loadDataset() {
    const selectedIndex = $('#indexSelect').val();
    const datasetFile = 'json/' + selectedIndex + '.json';

    return fetch(datasetFile)
        .then(response => {
            if (!response.ok) {
                throw new Error("Errore nel caricamento del dataset: " + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Assumiamo che data sia un array di oggetti con campi "Date" e "Close"
            // Ordiniamo il dataset per data (crescente)
            indexDatasetValues = data.sort((a, b) => new Date(a.Date) - new Date(b.Date));

            // Impostiamo i limiti min e max dei campi data in base al dataset
            if (indexDatasetValues.length > 0) {
                minDate = indexDatasetValues[0].Date;
                maxDate = indexDatasetValues[indexDatasetValues.length - 1].Date;
                $('#startDate').attr('min', minDate);
                $('#startDate').attr('max', maxDate);
                $('#endDate').attr('min', minDate);
                $('#endDate').attr('max', maxDate);
            }

            // Verifica se le date di inizio e fine sono valide
            const startDateVal = $('#startDate').val();
            const endDateVal = $('#endDate').val();
            if (startDateVal && endDateVal) {
                const startDate = parseDate(startDateVal);
                const endDate = parseDate(endDateVal);
                // Filtra il dataset per il range di date selezionato
                indexDatasetValues = indexDatasetValues.filter(item => {
                    const itemDate = parseDate(item.Date);
                    return itemDate >= startDate && itemDate <= endDate;
                });
            }
        })
        .then(() => {
            return loadExchangeRates();
        })
        .catch(error => {
            console.error("Errore durante il caricamento del dataset:", error);
        });
}

// Carica il dataset del cambio EUR/USD dal file
function loadExchangeRates() {
    return Promise.all([
        fetch('json/cambio_eur_usd_storico.json').then(response => {
            if (!response.ok) {
                throw new Error("Errore nel caricamento del dataset storico del cambio: " + response.statusText);
            }
            return response.json();
        }),
        fetch('json/cambio_eur_usd_updated.json').then(response => {
            if (!response.ok) {
                throw new Error("Errore nel caricamento del dataset aggiornato del cambio: " + response.statusText);
            }
            return response.json();
        })
    ])
        .then(([historicalData, updatedData]) => {
            const mergedData = mergeData(historicalData, updatedData);

            // Ordiniamo il dataset per data (crescente)
            var sortedData = mergedData.sort((a, b) => new Date(a.Date) - new Date(b.Date))
                .filter(item => {
                    return item.Date >= minDate && item.Date <= maxDate;
                });

            exchangeRates = indexDatasetValues.map(item => {
                const exchangeRate = sortedData.find(rate => rate.Date === item.Date);
                return exchangeRate ? parseFloat(exchangeRate.Close) : null;
            });

            // Verifica se ci sono date senza tasso di cambio corrispondente
            if (exchangeRates.includes(null)) {
                throw new Error("Errore: alcune date nel dataset dell'indice non hanno un tasso di cambio corrispondente.");
            }
        })
        .catch(error => {
            console.error("Errore durante il caricamento del dataset del cambio:", error);
        });
}

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
        })
        .catch(error => {
            console.error("Errore durante il caricamento dei dati dell'inflazione:", error);
        });
}

// Funzione per calcolare i valori reali al netto dell'inflazione
function adjustForInflation(values, dates) {
    return values.map((value, index) => {
        const year = new Date(dates[index]).getFullYear();
        let adjustedValue = value;
        for (let y = year; y >= Math.min(...Object.keys(inflationData)); y--) {
            if (inflationData[y]) {
                adjustedValue /= (1 + inflationData[y]);
            }
        }
        return adjustedValue;
    });
}

function adjustForInflationCumulative(values, dates, inflationData) {
    return values.map((value, index) => {
        const startYear = new Date(dates[0]).getFullYear();
        const currentYear = new Date(dates[index]).getFullYear();
        let adjustedValue = value;

        for (let year = startYear; year <= currentYear; year++) {
            if (inflationData[year]) {
                adjustedValue /= (1 + inflationData[year]);
            }
        }

        return adjustedValue;
    });
}

// Carica il dataset all'avvio
$(document).ready(function () {
    Promise.all([loadDataset(), loadInflationData()])
        .then(() => {
            $('#startDate').val(minDate);
            $('#endDate').val(maxDate);
            runSimulation();
        })
        .catch(error => {
            console.error("Errore durante il caricamento dei dati:", error);
        });
});

function createMoneryValueChart(dates, grossValuesDollar, netValuesDollar, nettissimoValuesDollar, totalDepositsDollar, grossValuesEur, netValuesEur, nettissimoValuesEur, totalDepositsEur, adjustedNettissimoValuesEur) {
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
                    label: 'Lordo ($)',
                    data: grossValuesDollar,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    hidden: true
                },
                {
                    label: 'Netto ($)',
                    data: netValuesDollar,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    hidden: true
                },
                {
                    label: 'Nettissimo ($)',
                    data: nettissimoValuesDollar,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Totale Versato ($)',
                    data: totalDepositsDollar,
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    fill: false,
                    tension: 1,
                    stepped: 'before',
                    pointRadius: 0,
                    hidden: true
                },
                {
                    label: 'Lordo (€)',
                    data: grossValuesEur,
                    borderColor: 'rgba(75, 192, 192, 0.6)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    hidden: true
                },
                {
                    label: 'Netto (€)',
                    data: netValuesEur,
                    borderColor: 'rgba(255, 99, 132, 0.6)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    hidden: true
                },
                {
                    label: 'Nettissimo (€)',
                    data: nettissimoValuesEur,
                    borderColor: 'rgba(54, 162, 235, 0.6)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Totale Versato (€)',
                    data: totalDepositsEur,
                    borderColor: 'rgba(255, 206, 86, 0.6)',
                    backgroundColor: 'rgba(255, 206, 86, 0.1)',
                    fill: false,
                    tension: 1,
                    stepped: 'before',
                    pointRadius: 0
                },
                {
                    label: 'Nettissimo Infl Adjusted (€)',
                    data: adjustedNettissimoValuesEur,
                    borderColor: 'rgba(128, 0, 128, 0.6)',
                    backgroundColor: 'rgba(128, 0, 128, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }
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
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: false,
                        },
                        pinch: {
                            enabled: false
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
                    title: {
                        display: true,
                        text: 'Valore'
                    }
                }
            }
        }
    });
}


// Funzione per creare il grafico del drawdown
function createDrawdownChart(dates, drawdownNetEur, drawdownNetDollar) {
    const ctx = document.getElementById('drawdownChartCanvas').getContext('2d');
    if (drawdownChartInstance) {
        drawdownChartInstance.destroy();
    }
    drawdownChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Drawdown Nettissimo (€)',
                    data: drawdownNetEur.map(value => value * -100),
                    borderColor: 'rgba(255, 99, 132, 0.6)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Drawdown Nettissimo ($)',
                    data: drawdownNetDollar.map(value => value * -100),
                    borderColor: 'rgba(54, 162, 235, 0.6)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    hidden: true
                }
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
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: false,
                        },
                        pinch: {
                            enabled: false
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
                    title: {
                        display: true,
                        text: 'Drawdown (%)'
                    },
                    ticks: {
                        callback: function (value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Funzione per creare il grafico del drawdown
function createDrawdownValueChart(dates, drawdownNetEur, drawdownNetDollar) {
    const ctx = document.getElementById('drawdownValueChartCanvas').getContext('2d');
    if (drawdownValueChartInstance) {
        drawdownValueChartInstance.destroy();
    }
    drawdownValueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Drawdown Nettissimo (€)',
                    data: drawdownNetEur.map(value => value * -1),
                    borderColor: 'rgba(255, 99, 132, 0.6)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Drawdown Nettissimo ($)',
                    data: drawdownNetDollar.map(value => value * -1),
                    borderColor: 'rgba(54, 162, 235, 0.6)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    hidden: true
                }
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
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: false,
                        },
                        pinch: {
                            enabled: false
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
                    title: {
                        display: true,
                        text: 'Drawdown (Valore)'
                    },
                    ticks: {
                        callback: function (value) {
                            return value;
                        }
                    }
                }
            }
        }
    });
}

// Funzione per creare il grafico percentuale
function createPercentageChart(dates, netValuesEur, realNettissimoValuesEur, netValuesDollar) {
    const ctx = document.getElementById('percentageChartCanvas').getContext('2d');
    if (percentageChartInstance) {
        percentageChartInstance.destroy();
    }

    const firstNonZeroEur = netValuesEur.find(value => value > 0) || 1;
    const firstNonZeroRealEur = realNettissimoValuesEur.find(value => value > 0) || 1;
    const firstNonZeroDollar = netValuesDollar.find(value => value > 0) || 1;

    percentageChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Nettissimo (€)',
                    data: netValuesEur.map((value, index) => ((value / firstNonZeroEur) - 1) * 100),
                    borderColor: 'rgba(255, 99, 132, 0.6)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Nettissimo Infl. Adjusted (€)',
                    data: realNettissimoValuesEur.map((value, index) => ((value / firstNonZeroRealEur) - 1) * 100),
                    borderColor: 'rgba(107, 248, 107, 0.6)',
                    backgroundColor: 'rgba(107, 248, 107, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Nettissimo ($)',
                    data: netValuesDollar.map((value, index) => ((value / firstNonZeroDollar) - 1) * 100),
                    borderColor: 'rgba(54, 162, 235, 0.6)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                annotation: {
                    annotations: {
                        zeroLine: {
                            type: 'line',
                            borderColor: 'red',
                            borderWidth: 1,
                            scaleID: 'y',
                            value: 0
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: false,
                        },
                        pinch: {
                            enabled: false
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
                    title: {
                        display: true,
                        text: 'Percentuale'
                    },
                    ticks: {
                        callback: function (value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Funzione per eseguire la simulazione
function runSimulation() {
    // Array per memorizzare i drawdown giornalieri
    const drawdownNettissimoDollar = [];
    const drawdownNettissimoEur = [];
    const drawdownNettissimoEurValore = [];
    const drawdownNettissimoDollarValore = [];
    // Legge i parametri di input
    let initialCapitalEur = parseFloat($('#initialCapitalEur').val());
    
    const monthlyDepositEur = parseFloat($('#monthlyDepositEur').val());
    const terFee = parseFloat($('#terFee').val()); // espresso in percentuale
    const startDate = new Date($('#startDate').val());
    const endDate = new Date($('#endDate').val());
    const initialCapitalDollar = initialCapitalEur * exchangeRates[0];

    // Filtra il dataset per il range di date selezionato
    const simData = indexDatasetValues.filter(item => {
        const itemDate = parseDate(item.Date);
        return itemDate >= startDate && itemDate <= endDate;
    });

    if (simData.length < 2) {
        alert("Non ci sono abbastanza dati nel range selezionato.");
        return;
    }

    // Array per memorizzare le date e i valori simulati
    const dates = [];
    const grossValuesDollar = [];
    const netValuesDollar = [];
    const nettissimoValuesDollar = [];
    const totalDepositsDollar = [];
    const grossValuesEur = [];
    const netValuesEur = [];
    const nettissimoValuesEur = [];
    const totalDepositsEur = [];

    // Per il calcolo delle plusvalenze, memorizziamo i contributi cumulativi
    let cumulativeContributionsDollar = initialCapitalEur * exchangeRates[0];
    let cumulativeContributionsEur = initialCapitalEur;

    // Per applicare il TER su base giornaliera (si assume 252 giorni di trading/anno)
    const terDaily = (terFee / 100) / 252;

    // Inizializziamo la simulazione con il primo giorno disponibile
    let currentGrossDollar = initialCapitalEur * exchangeRates[0];
    let currentNetDollar = initialCapitalEur * exchangeRates[0];
    let currentGrossEur = initialCapitalEur;
    let currentNetEur = initialCapitalEur;
    dates.push(simData[0].Date);
    grossValuesDollar.push(currentGrossDollar);
    netValuesDollar.push(currentNetDollar);
    totalDepositsDollar.push(currentGrossDollar);
    grossValuesEur.push(currentGrossEur);
    netValuesEur.push(currentNetEur);
    totalDepositsEur.push(currentGrossEur);
    let gainDollar = currentNetDollar - cumulativeContributionsDollar;
    let currentNettissimoDollar = currentNetDollar - (gainDollar > 0 ? gainDollar * 0.26 : 0);
    nettissimoValuesDollar.push(currentNettissimoDollar);
    let gainEur = currentNetEur - cumulativeContributionsEur;
    let currentNettissimoEur = currentNetEur - (gainEur > 0 ? gainEur * 0.26 : 0);
    nettissimoValuesEur.push(currentNettissimoEur);

    // Per gestire il deposito mensile, teniamo traccia del mese dell'ultimo deposito
    let lastDepositMonth = parseDate(simData[0].Date).getMonth();

    // Itera sui dati a partire dal secondo giorno
    for (let i = 1; i < simData.length; i++) {
        // Calcola il rendimento giornaliero usando i dati "Close"
        const prevPriceDollar = parseFloat(simData[i - 1]["Close"]);
        const currPriceDollar = parseFloat(simData[i]["Close"]);
        const dailyReturnDollar = (currPriceDollar / prevPriceDollar) - 1;

        // Aggiorna i valori lordo e netto in base al rendimento giornaliero
        currentGrossDollar = currentGrossDollar * (1 + dailyReturnDollar);
        currentNetDollar = currentNetDollar * (1 + dailyReturnDollar) * (1 - terDaily);
        currentGrossEur = currentGrossDollar / exchangeRates[i];
        currentNetEur = currentNetDollar / exchangeRates[i];

        // Se è cambiato il mese (rispetto all'ultimo deposito) aggiungiamo il versamento mensile
        const currentDate = parseDate(simData[i].Date);
        const currentMonth = currentDate.getMonth();
        if (currentMonth !== lastDepositMonth) {
            currentGrossDollar += monthlyDepositEur * exchangeRates[i];
            currentNetDollar += monthlyDepositEur * exchangeRates[i];
            cumulativeContributionsDollar += monthlyDepositEur * exchangeRates[i];
            totalDepositsDollar.push(cumulativeContributionsDollar);
            currentGrossEur += monthlyDepositEur;
            currentNetEur += monthlyDepositEur;
            cumulativeContributionsEur += monthlyDepositEur;
            totalDepositsEur.push(cumulativeContributionsEur);
            lastDepositMonth = currentMonth;
        } else {
            totalDepositsDollar.push(cumulativeContributionsDollar);
            totalDepositsEur.push(cumulativeContributionsEur);
        }

        // Calcola il valore "nettissimo": si tassano al 26% le plusvalenze (guadagno oltre i contributi)
        gainDollar = currentNetDollar - cumulativeContributionsDollar;
        currentNettissimoDollar = currentNetDollar - (gainDollar > 0 ? gainDollar * 0.26 : 0);
        gainEur = currentNetEur - cumulativeContributionsEur;
        currentNettissimoEur = currentNetEur - (gainEur > 0 ? gainEur * 0.26 : 0);

        // Salva i dati per il grafico
        dates.push(simData[i].Date);
        grossValuesDollar.push(currentGrossDollar);
        netValuesDollar.push(currentNetDollar);
        nettissimoValuesDollar.push(currentNettissimoDollar);
        grossValuesEur.push(currentGrossEur);
        netValuesEur.push(currentNetEur);
        nettissimoValuesEur.push(currentNettissimoEur);

        // Calcola il drawdown giornaliero
        drawdownNettissimoDollar.push(
            nettissimoValuesDollar.length > 0 ? 
            (Math.max(...nettissimoValuesDollar.slice(0, i + 1)) - nettissimoValuesDollar[i]) / 
            Math.max(Math.max(...nettissimoValuesDollar.slice(0, i + 1)), 0.000001) : 0
        );
        drawdownNettissimoEur.push(
            nettissimoValuesEur.length > 0 ? 
            (Math.max(...nettissimoValuesEur.slice(0, i + 1)) - nettissimoValuesEur[i]) / 
            Math.max(Math.max(...nettissimoValuesEur.slice(0, i + 1)), 0.000001) : 0
        );
        
        // Calcolo drawdown in valore assoluto
        drawdownNettissimoEurValore.push(
            Math.max(...nettissimoValuesEur.slice(0, i + 1)) - nettissimoValuesEur[i]
        );

        drawdownNettissimoDollarValore.push(
            Math.max(...nettissimoValuesDollar.slice(0, i + 1)) - nettissimoValuesDollar[i]
        );
    }
    // Funzione per calcolare la deviazione standard annualizzata
    function calcolaDeviazioneStandardAnnualizzata(data) {
        // Se tutti i valori sono 0 o non ci sono dati, ritorna 0
        if (data.every(val => val === 0) || data.length === 0) {
            return 0;
        }
        const media = data.reduce((acc, val) => acc + val, 0) / data.length;
        const varianza = data.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / data.length;
        const deviazioneStandardGiornaliera = Math.sqrt(varianza);
        const giorniDiTradingAnnuali = 252;
        return deviazioneStandardGiornaliera * Math.sqrt(giorniDiTradingAnnuali);
    }

    // Calcola la volatilità (deviazione standard)
    const rendimentiGiornalieriNettissimoDollar = simData.map((item, index) => {
        if (index === 0) return 0;
        const prevNet = nettissimoValuesDollar[index - 1];
        const currNet = nettissimoValuesDollar[index];
        return prevNet === 0 ? 0 : (currNet / prevNet) - 1;
    }).slice(1);

    // Calcola i rendimenti giornalieri in euro
    const rendimentiGiornalieriNettissimoEur = simData.map((item, index) => {
        if (index === 0) return 0;
        const prevNetEur = nettissimoValuesEur[index - 1];
        const currNetEur = nettissimoValuesEur[index];
         return prevNetEur === 0 ? 0 : (currNetEur / prevNetEur) - 1;
    }).slice(1);

    const volatilitaNettissimoEur = calcolaDeviazioneStandardAnnualizzata(rendimentiGiornalieriNettissimoEur);
    const volatilitaNettissimoDollar = calcolaDeviazioneStandardAnnualizzata(rendimentiGiornalieriNettissimoDollar);

    // Calcola il drawdown massimo sul netto
    // in %
    const maxDrawdownNettissimoDollar = Math.max(...drawdownNettissimoDollar);
    const maxDrawdownNettissimoDollarIndex = drawdownNettissimoDollar.indexOf(maxDrawdownNettissimoDollar);
    const maxDrawdownNettissimoDollarDate = dates[maxDrawdownNettissimoDollarIndex];
    // in %
    const maxDrawdownNettissimoEur = Math.max(...drawdownNettissimoEur);
    const maxDrawdownNettissimoEuroIndex = drawdownNettissimoEur.indexOf(maxDrawdownNettissimoEur);
    const maxDrawdownNettissimoEuroDate = dates[maxDrawdownNettissimoEuroIndex];
    // in valore
    const maxDrawdownValoreNettissimoEur = Math.max(...drawdownNettissimoEurValore);
    // in valore
    const maxDrawdownValoreNettissimoDollar = Math.max(...drawdownNettissimoDollarValore);

    const maxDrawdownValoreNettissimoEurIndex = drawdownNettissimoEurValore.indexOf(maxDrawdownValoreNettissimoEur);
    const maxDrawdownValoreNettissimoEurDate = dates[maxDrawdownValoreNettissimoEurIndex];
    const maxDrawdownValoreNettissimoDollarIndex = drawdownNettissimoDollarValore.indexOf(maxDrawdownValoreNettissimoDollar);
    const maxDrawdownValoreNettissimoDollarDate = dates[maxDrawdownValoreNettissimoDollarIndex];
    const maxDrawdownNettissimoTotValueEur = nettissimoValuesEur[maxDrawdownValoreNettissimoEurIndex];
    const maxDrawdownNettissimoTotValueDollar = nettissimoValuesDollar[maxDrawdownValoreNettissimoDollarIndex];

    // Calcola i valori reali al netto dell'inflazione        
    const adjustedNettissimoValuesEur = adjustForInflationCumulative(nettissimoValuesEur, dates, inflationData);

    createMoneryValueChart(dates, grossValuesDollar, netValuesDollar, nettissimoValuesDollar, totalDepositsDollar, grossValuesEur, netValuesEur, nettissimoValuesEur, totalDepositsEur, adjustedNettissimoValuesEur);
    createPercentageChart(dates, nettissimoValuesEur, adjustedNettissimoValuesEur, nettissimoValuesDollar);
    createDrawdownChart(dates, drawdownNettissimoEur, drawdownNettissimoDollar);
    createDrawdownValueChart(dates, drawdownNettissimoEurValore, drawdownNettissimoDollarValore);

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

    // Funzione per formattare i numeri in euro con separatore delle migliaia
    function formatDollar(value) {
        return new Intl.NumberFormat('en-US',
            {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
    }

    // Funzione per calcolare il rendimento totale e annualizzato (CAGR)
    function calcolaRendimento(valoreFinale, valoreIniziale, anniTotali, totaleVersamenti) {
        const rendimentoTotale = ((valoreFinale - totaleVersamenti) / totaleVersamenti) * 100;
        const rendimentoAnnualizzato = (((valoreFinale / totaleVersamenti) ** (1 / anniTotali)) - 1) * 100;

        return {
            rendimentoTotale: rendimentoTotale,
            rendimentoAnnualizzato: rendimentoAnnualizzato
        };
    }

    // Funzione per formattare le percentuali
    function formatPercent(value) {
        return value.toFixed(1) + '%';
    }

    // Visualizza i risultati finali della simulazione
    const finalIndex = dates.length - 1;
    const finalGrossDollar = grossValuesDollar[finalIndex];
    const finalNetDollar = netValuesDollar[finalIndex];
    const finalNettissimoDollar = nettissimoValuesDollar[finalIndex];
    const finalGrossEur = grossValuesEur[finalIndex];
    const finalNetEur = netValuesEur[finalIndex];
    const finalNettissimoEur = nettissimoValuesEur[finalIndex];

    // Calcolo delle differenze
    const diffGrossNetDollar = finalGrossDollar - finalNetDollar;
    const diffGrossNetPercDollar = (diffGrossNetDollar / finalGrossDollar) * 100;

    const diffGrossNettissimoDollar = finalGrossDollar - finalNettissimoDollar;
    const diffGrossNettissimoPercDollar = (diffGrossNettissimoDollar / finalGrossDollar) * 100;

    const anniTotali = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 365.25);

    const rendimentoLordoDollar = calcolaRendimento(finalGrossDollar, initialCapitalDollar, anniTotali, cumulativeContributionsDollar);
    const rendimentoNettoDollar = calcolaRendimento(finalNetDollar, initialCapitalDollar, anniTotali, cumulativeContributionsDollar);
    const rendimentoNettissimoDollar = calcolaRendimento(finalNettissimoDollar, initialCapitalDollar, anniTotali, cumulativeContributionsDollar);
    const rendimentoLordoEur = calcolaRendimento(finalGrossEur, initialCapitalEur, anniTotali, cumulativeContributionsEur);
    const rendimentoNettoEur = calcolaRendimento(finalNetEur, initialCapitalEur, anniTotali, cumulativeContributionsEur);
    const rendimentoNettissimoEur = calcolaRendimento(finalNettissimoEur, initialCapitalEur, anniTotali, cumulativeContributionsEur);
    const rendimenttoRealeNettissimoEur = calcolaRendimento(adjustedNettissimoValuesEur[finalIndex], initialCapitalEur, anniTotali, cumulativeContributionsEur);

    let resultHtml = `<h3>Risultati della simulazione</h3>`;
    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Capitale Investito:</strong> ${formatEuro(cumulativeContributionsEur)}</p>`;
    resultHtml += `<p><strong>Durata Simulazione:</strong> ${anniTotali.toFixed(1)} anni</p>`;
    resultHtml += `</div>`;

    resultHtml += `<div class="accordion" id="accordionResults">`;

    // Rendimento in Euro
    resultHtml += `<div class="card">`;
    resultHtml += `<div class="card-header bg-primary text-white" id="headingEuro">`;
    resultHtml += `<h2 class="mb-0">`;
    resultHtml += `<button class="btn btn-link text-white" type="button" data-toggle="collapse" data-target="#collapseEuro" aria-expanded="true" aria-controls="collapseEuro">`;
    resultHtml += `Rendimenti in Euro (€) <span class="fas fa-chevron-down"></span>`;
    resultHtml += `</button>`;
    resultHtml += `</h2>`;
    resultHtml += `</div>`;

    resultHtml += `<div id="collapseEuro" class="collapse show" aria-labelledby="headingEuro" data-parent="#accordionResults">`;
    resultHtml += `<div class="card-body">`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Rendimento assoluto Lordo (€):</strong> ${formatEuro(finalGrossEur)}</p>`;
    resultHtml += `<p><strong>Rendimento Totale Lordo (€):</strong> ${formatPercent(rendimentoLordoEur.rendimentoTotale)}</p>`;
    resultHtml += `<p><strong>Rendimento Annualizzato Lordo (CAGR) (€):</strong> ${formatPercent(rendimentoLordoEur.rendimentoAnnualizzato)}</p>`;
    resultHtml += `</div>`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Rendimento assoluto Netto (€):</strong> ${formatEuro(finalNetEur)}</p>`;
    resultHtml += `<p><strong>Rendimento Totale Netto (€):</strong> ${formatPercent(rendimentoNettoEur.rendimentoTotale)}</p>`;
    resultHtml += `<p><strong>Rendimento Annualizzato Netto (CAGR) (€):</strong> ${formatPercent(rendimentoNettoEur.rendimentoAnnualizzato)}</p>`;
    resultHtml += `</div>`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Rendimento Nettissimo (€):</strong> ${formatEuro(finalNettissimoEur)}</p>`;
    resultHtml += `<p><strong>Rendimento Totale Nettissimo (€):</strong> ${formatPercent(rendimentoNettissimoEur.rendimentoTotale)}</p>`;
    resultHtml += `<p><strong>Rendimento Annualizzato Nettissimo (CAGR) (€):</strong> ${formatPercent(rendimentoNettissimoEur.rendimentoAnnualizzato)}</p>`;
    resultHtml += `<p><strong>Rendimento Totale Nettissimo Infl. Adjusted (€):</strong> ${formatPercent(rendimenttoRealeNettissimoEur.rendimentoTotale)}</p>`;
    resultHtml += `<p><strong>Rendimento Annualizzato Nettissimo Infl Adjusted (CAGR Reale) (€):</strong> ${formatPercent(rendimenttoRealeNettissimoEur.rendimentoAnnualizzato)}</p>`;
    resultHtml += `</div>`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Diff. Lordo - Netto  (TWR Terminal Wealth Ratio) ossia Impatto del TER:</strong> ${formatEuro(diffGrossNetDollar)} (${formatPercent(diffGrossNetPercDollar)})</p>`;
    resultHtml += `<p><strong>Diff. Lordo - Nettissimo (tassazione effetiva sul totale lordo e spese TER):</strong> ${formatEuro(diffGrossNettissimoDollar)} (${formatPercent(diffGrossNettissimoPercDollar)})</p>`;
    resultHtml += `<p>Nota, questa percentuale può risultare < 26% perchè mostrando la differenza con il lordo, comprende anche il TER, che in quanto spesa, non partecipa al capital gain e non viene tassata.
              Inoltre, solo il gain viene tassato al 26% e non l'intera somma lorda.</p>`;
    resultHtml += `</div>`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Comparazione tra quanto ottenuto e quanto avresti dovuto risparmiare senza investire per avere la stessa cifra nello stesso tempo:</strong></p>`;
    resultHtml += `<p><strong>Avresti dovuto risparmiare:</strong> ${formatEuro((finalNettissimoEur)/(anniTotali*12))} al mese per ${(anniTotali).toFixed(1)} anni per avere la stessa cifra.</p>`;    
    resultHtml += `</div>`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Volatilità (Deviazione Standard Annualizzata) € (sul nettissimo):</strong> ${formatPercent(volatilitaNettissimoEur * 100)}</p>`;
    resultHtml += `<p><strong>Drawdown Massimo (MDD) € in % (sul nettissimo):
              </strong> perdita del ${formatPercent(maxDrawdownNettissimoEur * 100)} 
              in data ${maxDrawdownNettissimoEuroDate} 
              (su capitale che al momento era di ${formatEuro(nettissimoValuesEur[maxDrawdownNettissimoEuroIndex])}
              al netto delle tasse) quindi una perdita di ${formatEuro(nettissimoValuesEur[maxDrawdownNettissimoEuroIndex] * maxDrawdownNettissimoEur)}</p>`;
    resultHtml += `<p><strong>Drawdown Massimo (MDD) in euro (sul nettissimo):
              </strong> in data ${maxDrawdownValoreNettissimoEurDate} perdita di 
              ${formatEuro(maxDrawdownValoreNettissimoEur)} 
              dal precedente massimo, portando il capitale a un minimo locale di
              ${formatEuro(maxDrawdownNettissimoTotValueEur)} 
              (la perdita percentuale però non è un massimo  ma è di solo il ${formatPercent(drawdownNettissimoEur[maxDrawdownValoreNettissimoEurIndex] * 100)})
              </p>`;
    resultHtml += `</div>`;

    resultHtml += `</div>`;
    resultHtml += `</div>`;
    resultHtml += `</div>`;

    // Rendimento in Dollari
    resultHtml += `<div class="card">`;
    resultHtml += `<div class="card-header bg-secondary text-white" id="headingDollar">`;
    resultHtml += `<h2 class="mb-0">`;
    resultHtml += `<button class="btn btn-link text-white collapsed" type="button" data-toggle="collapse" data-target="#collapseDollar" aria-expanded="false" aria-controls="collapseDollar">`;
    resultHtml += `Rendimenti in Dollari ($) <span class="fas fa-chevron-down"></span>`;
    resultHtml += `</button>`;
    resultHtml += `</h2>`;
    resultHtml += `</div>`;
    resultHtml += `</button>`;
    resultHtml += `</h2>`;
    resultHtml += `</div>`;

    resultHtml += `<div id="collapseDollar" class="collapse" aria-labelledby="headingDollar" data-parent="#accordionResults">`;
    resultHtml += `<div class="card-body">`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Rendimento assoluto Lordo ($):</strong> ${formatDollar(finalGrossDollar)}</p>`;
    resultHtml += `<p><strong>Rendimento Totale Lordo ($):</strong> ${formatPercent(rendimentoLordoDollar.rendimentoTotale)}</p>`;
    resultHtml += `<p><strong>Rendimento Annualizzato Lordo (CAGR) ($):</strong> ${formatPercent(rendimentoLordoDollar.rendimentoAnnualizzato)}</p>`;
    resultHtml += `</div>`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Rendimento assoluto Netto ($):</strong> ${formatDollar(finalNetDollar)}</p>`;
    resultHtml += `<p><strong>Rendimento Totale Netto ($):</strong> ${formatPercent(rendimentoNettoDollar.rendimentoTotale)}</p>`;
    resultHtml += `<p><strong>Rendimento Annualizzato Netto (CAGR) ($):</strong> ${formatPercent(rendimentoNettoDollar.rendimentoAnnualizzato)}</p>`;
    resultHtml += `</div>`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Rendimento Nettissimo ($):</strong> ${formatDollar(finalNettissimoDollar)}</p>`;
    resultHtml += `<p><strong>Rendimento Totale Nettissimo ($):</strong> ${formatPercent(rendimentoNettissimoDollar.rendimentoTotale)}</p>`;
    resultHtml += `<p><strong>Rendimento Annualizzato Nettissimo (CAGR) ($):</strong> ${formatPercent(rendimentoNettissimoDollar.rendimentoAnnualizzato)}</p>`;
    resultHtml += `</div>`;

    resultHtml += `<div class="box">`;
    resultHtml += `<p><strong>Volatilità (Deviazione Standard Annualizzata) $ (sul nettissimo):</strong> ${formatPercent(volatilitaNettissimoDollar * 100)}</p>`;
    resultHtml += `<p><strong>Drawdown Massimo (MDD) $ in % (sul nettissimo):
              </strong> perdita del ${formatPercent(maxDrawdownNettissimoDollar * 100)} 
              in data ${maxDrawdownNettissimoDollarDate} 
              (su capitale che al momento era di ${formatDollar(nettissimoValuesDollar[maxDrawdownNettissimoDollarIndex])}
              al netto delle tasse) quindi una perdita di ${formatDollar(nettissimoValuesDollar[maxDrawdownNettissimoDollarIndex] * maxDrawdownNettissimoDollar)}</p>`;
    resultHtml += `<p><strong>Drawdown Massimo (MDD) in $ (sul nettissimo):
              </strong> in data ${maxDrawdownValoreNettissimoDollarDate} perdita di 
              ${formatDollar(maxDrawdownValoreNettissimoDollar)} 
              dal precedente massimo, portando il capitale a un minimo locale di
              ${formatDollar(maxDrawdownNettissimoTotValueDollar)} 
              (la perdita percentuale però non è un massimo  ma è di solo il ${formatPercent(drawdownNettissimoDollar[maxDrawdownValoreNettissimoDollarIndex] * 100)})
              </p>`;
    resultHtml += `</div>`;


    resultHtml += `</div>`;
    resultHtml += `</div>`;
    resultHtml += `</div>`;
    resultHtml += `</div>`;

    $('#simulationResults').html(resultHtml);
}

// Gestione del submit del form
$('#simulationForm').on('submit', function (e) {
    e.preventDefault();
    loadDataset().then(() => {
        runSimulation();
    });
});

// Aggiungi questo evento per aggiornare le date min e max quando cambia l'indice selezionato
$('#indexSelect').on('change', function () {
    loadDataset().then(() => {
        minDate = indexDatasetValues[0].Date;
        maxDate = indexDatasetValues[indexDatasetValues.length - 1].Date;
        // Imposta i valori di default per le date di inizio e fine
        $('#startDate').val(minDate);
        $('#endDate').val(maxDate);
    }).catch(error => {
        console.error("Errore durante il caricamento del dataset:", error);
    });
});

// Aggiungi evento per il pulsante di reset dello zoom
$('#resetZoomButton').click(function () {
    if (chartInstance) {
        chartInstance.resetZoom();
    }
});

// Aggiungi questo script per gestire la freccia apri/chiudi
$(document).ready(function () {
    $('.collapse').on('show.bs.collapse', function () {
        $(this).prev('.card-header').find('.fas').removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }).on('hide.bs.collapse', function () {
        $(this).prev('.card-header').find('.fas').removeClass('fa-chevron-up').addClass('fa-chevron-down');
    });
});
