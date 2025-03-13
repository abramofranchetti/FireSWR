document.addEventListener('DOMContentLoaded', function () {
    const startYearInput = document.getElementById('startYear');
    const endYearInput = document.getElementById('endYear');

    function calculateRevaluation() {
        const startYear = parseInt(startYearInput.value);
        const endYear = parseInt(endYearInput.value);

        fetch('csv/tfr.csv')
            .then(response => response.text())
            .then(data => {
                const parsedData = parseCSV(data);
                const startIndex = parsedData.labels.indexOf(startYear.toString());
                const endIndex = parsedData.labels.indexOf(endYear.toString());

                if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                    const cumulativeRevaluation = calculateCumulativeRevaluation(parsedData.values, startIndex, endIndex);
                    const annualizedRevaluation = ((1 + cumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;
                    document.getElementById('resultText').innerText = `Rivalutazione cumulata: ${cumulativeRevaluation.toFixed(2)}%
                    Rivalutazione annualizzata: ${annualizedRevaluation.toFixed(2)}%`;

                    populateRevaluationTable(parsedData.labels, parsedData.values, startIndex, endIndex);
                } else {
                    document.getElementById('resultText').innerText = 'Intervallo di anni non valido.';
                    document.getElementById('revaluationTable').querySelector('tbody').innerHTML = '';
                }
            });
    }

    startYearInput.addEventListener('change', calculateRevaluation);
    endYearInput.addEventListener('change', calculateRevaluation);

    calculateRevaluation();

    function parseCSV(data) {
        const lines = data.split('\n');
        const labels = [];
        const values = [];
        lines.forEach(line => {
            const [year, value] = line.split('\t');
            if (year && value) {
                labels.push(year);
                values.push(parseFloat(value.replace('%', '').replace(',', '.')));
            }
        });
        return { labels, values };
    }

    function calculateCumulativeRevaluation(values, startIndex, endIndex) {
        let cumulativeFactor = 1;
        for (let i = startIndex; i <= endIndex; i++) {
            cumulativeFactor *= (1 + values[i] / 100);
        }
        return (cumulativeFactor - 1) * 100;
    }

    function populateRevaluationTable(labels, values, startIndex, endIndex) {
        const tbody = document.getElementById('revaluationTable').querySelector('tbody');
        tbody.innerHTML = '';
        for (let i = startIndex; i <= endIndex; i++) {
            const row = document.createElement('tr');
            const yearCell = document.createElement('td');
            const valueCell = document.createElement('td');
            yearCell.textContent = labels[i];
            valueCell.textContent = values[i].toFixed(2) + '%';
            row.appendChild(yearCell);
            row.appendChild(valueCell);
            tbody.appendChild(row);
        }
    }
});
