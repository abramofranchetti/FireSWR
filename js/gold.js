let monthlyChart = null;
let dailyChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Carica i dati mensili
    fetch('csv/gold_monthly-storico.csv')
        .then(response => response.text())
        .then(data => {
            const monthlyData = parseMonthlyData(data);
            initializeMonthleDateInputs(monthlyData);
            createMonthlyChart(monthlyData);

            // Event listeners per i filtri mensili
            document.getElementById('monthlyStartDate').addEventListener('change', () => updateMonthlyChart(monthlyData));
            document.getElementById('monthlyEndDate').addEventListener('change', () => updateMonthlyChart(monthlyData));
        });

    // Carica i dati giornalieri
    fetch('json/GC=F.json')
        .then(response => response.json())
        .then(data => {
            initializeDailyDateInputs(data);
            createDailyChart(data);

            // Event listeners per i filtri giornalieri
            document.getElementById('dailyStartDate').addEventListener('change', () => updateDailyChart(data));
            document.getElementById('dailyEndDate').addEventListener('change', () => updateDailyChart(data));
        });
});

function parseMonthlyData(csv) {
    const lines = csv.split('\n');
    return lines.map(line => {
        const [date, price] = line.split(',');
        return {
            date: date,
            price: parseFloat(price)
        };
    }).filter(item => item.price && !isNaN(item.price));
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
                fill: true
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

    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredData.map(item => item.Date),
            datasets: [{
                label: 'Prezzo Oro (USD)',
                data: filteredData.map(item => item.Close),
                borderColor: 'gold',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: true
            }]
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
                        text: 'Prezzo (USD)'
                    }
                }
            }
        }
    });
}

function updateMonthlyChart(data) {
    createMonthlyChart(data);
}

function updateDailyChart(data) {
    createDailyChart(data);
}
