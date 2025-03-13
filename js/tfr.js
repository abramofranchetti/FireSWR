document.addEventListener('DOMContentLoaded', function () {
    const startYearInput = document.getElementById('startYear');
    const endYearInput = document.getElementById('endYear');

    function calculateRevaluation() {
        const startYear = parseInt(startYearInput.value);
        const endYear = parseInt(endYearInput.value);

        Promise.all([
            fetch('csv/tfr.csv').then(response => response.text()),
            fetch('csv/cometa.csv').then(response => response.text()),
            fetch('csv/acwi_xeon.csv').then(response => response.text())
        ]).then(([tfrData, cometaData, acwiXeonData]) => {
            const tfrParsedData = parseCSV(tfrData, '\t');
            const cometaParsedData = parseCSV(cometaData, ',');
            const acwiXeonParsedData = parseCSV(acwiXeonData, ',');
            cometaParsedData.labels.reverse();
            cometaParsedData.values.reverse();            
            const startIndex = tfrParsedData.labels.indexOf(startYear.toString());
            const endIndex = tfrParsedData.labels.indexOf(endYear.toString());

            if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                const tfrCumulativeRevaluation = calculateCumulativeRevaluation(tfrParsedData.values, startIndex, endIndex);
                const tfrAnnualizedRevaluation = ((1 + tfrCumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const cometaCumulativeRevaluation = calculateCometaCumulativeRevaluation(cometaParsedData, startYear, endYear);
                const cometaAnnualizedRevaluation = ((1 + cometaCumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const acwiXeonCumulativeRevaluation = calculateCometaCumulativeRevaluation(acwiXeonParsedData, startYear, endYear);
                const acwiXeonAnnualizedRevaluation = ((1 + acwiXeonCumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const resultTable = `
                    <table class="table table-bordered table-striped">
                        <tr>
                            <th></th>
                            <th>Rendimento TFR</th>
                            <th>Rendimento Fondo Pensione</th>
                            <th>Rendimento Benchmark</th>
                        </tr>
                        <tr>
                            <th>Rivalutazione cumulata</th>
                            <td class="${tfrCumulativeRevaluation >= cometaCumulativeRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${tfrCumulativeRevaluation.toFixed(2)}%</td>
                            <td class="${cometaCumulativeRevaluation >= tfrCumulativeRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${cometaCumulativeRevaluation.toFixed(2)}%</td>
                            <td class="${acwiXeonCumulativeRevaluation >= tfrCumulativeRevaluation ? 'bg-primary text-white' : 'bg-danger text-white'}">${acwiXeonCumulativeRevaluation.toFixed(2)}%</td>
                        </tr>
                        <tr>
                            <th>Rivalutazione Annualizzata</th>
                            <td class="${tfrAnnualizedRevaluation >= cometaAnnualizedRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${tfrAnnualizedRevaluation.toFixed(2)}%</td>
                            <td class="${cometaAnnualizedRevaluation >= tfrAnnualizedRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${cometaAnnualizedRevaluation.toFixed(2)}%</td>
                            <td class="${acwiXeonAnnualizedRevaluation >= tfrAnnualizedRevaluation ? 'bg-primary text-white' : 'bg-danger text-white'}">${acwiXeonAnnualizedRevaluation.toFixed(2)}%</td>
                        </tr>
                    </table>
                `;
                document.getElementById('resultText').innerHTML = resultTable;

                populateRevaluationTable(tfrParsedData.labels, tfrParsedData.values, cometaParsedData, acwiXeonParsedData, startIndex, endIndex);
            } else {
                document.getElementById('resultText').innerText = 'Intervallo di anni non valido.';
                document.getElementById('revaluationTable').querySelector('tbody').innerHTML = '';
            }
        });
    }

    startYearInput.addEventListener('change', calculateRevaluation);
    endYearInput.addEventListener('change', calculateRevaluation);

    calculateRevaluation();

    function parseCSV(data, delimiter) {
        const lines = data.split('\n');
        const labels = [];
        const values = [];
        lines.forEach(line => {
            const [label, value] = line.split(delimiter);
            if (label && value) {
                labels.push(label.trim());
                values.push(parseFloat(value.replace('%','').replace(',', '.')));
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

    function calculateCometaCumulativeRevaluation(cometaData, startYear, endYear) {
        const yearData = cometaData.labels
            .map((label, index) => ({ label, value: cometaData.values[index] }))
            .filter(entry => {
                const year = parseInt(entry.label.split('/')[1]);
                return year >= startYear && year <= endYear;
            });
        if (yearData.length < 2) return null;
        const startValue = parseFloat(yearData[0].value);
        const endValue = parseFloat(yearData[yearData.length - 1].value);
        return ((endValue - startValue) / startValue) * 100;
    }

    function calculateCometaAnnualReturn(cometaData, year) {
        const yearData = cometaData.labels
            .map((label, index) => ({ label, value: cometaData.values[index] }))
            .filter(entry => entry.label.endsWith(year.toString()));
        if (yearData.length < 2) return null;
        const startValue = parseFloat(yearData[0].value);
        const endValue = parseFloat(yearData[yearData.length - 1].value);
        return ((endValue - startValue) / startValue) * 100;
    }

    function populateRevaluationTable(labels, tfrValues, cometaData, acwiXeonData, startIndex, endIndex) {
        const tbody = document.getElementById('revaluationTable').querySelector('tbody');
        tbody.innerHTML = '';
        for (let i = startIndex; i <= endIndex; i++) {
            const row = document.createElement('tr');
            const yearCell = document.createElement('td');
            const tfrValueCell = document.createElement('td');
            const cometaValueCell = document.createElement('td');
            const acwiXeonValueCell = document.createElement('td');

            yearCell.textContent = labels[i];
            tfrValueCell.textContent = tfrValues[i].toFixed(2) + '%';
            const cometaReturn = calculateCometaAnnualReturn(cometaData, labels[i]);
            cometaValueCell.textContent = cometaReturn !== null ? cometaReturn.toFixed(2) + '%' : 'N/A';
            const acwiXeonReturn = calculateCometaAnnualReturn(acwiXeonData, labels[i]);
            acwiXeonValueCell.textContent = acwiXeonReturn !== null ? acwiXeonReturn.toFixed(2) + '%' : 'N/A';
            if (cometaReturn !== null && acwiXeonReturn !== null) {
                if (tfrValues[i] >= cometaReturn && tfrValues[i] >= acwiXeonReturn) {
                    tfrValueCell.classList.add('bg-success', 'text-white');
                    cometaValueCell.classList.add('bg-danger', 'text-white');
                    acwiXeonValueCell.classList.add('bg-danger', 'text-white');
                } else if (cometaReturn >= tfrValues[i] && acwiXeonReturn >= tfrValues[i]) {
                    tfrValueCell.classList.add('bg-danger', 'text-white');
                    cometaValueCell.classList.add('bg-success', 'text-white');
                    acwiXeonValueCell.classList.add('bg-primary', 'text-white');
                } else {
                    tfrValueCell.classList.add('bg-danger', 'text-white');
                    cometaValueCell.classList.add('bg-danger', 'text-white');
                    acwiXeonValueCell.classList.add('bg-primary', 'text-white');
                }
            }

            row.appendChild(yearCell);
            row.appendChild(tfrValueCell);
            row.appendChild(cometaValueCell);
            row.appendChild(acwiXeonValueCell);
            tbody.appendChild(row);
        }
    }
});
