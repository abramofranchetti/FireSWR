document.addEventListener('DOMContentLoaded', function () {
    const startYearInput = document.getElementById('startYear');
    const endYearInput = document.getElementById('endYear');
    const ctx = document.getElementById('investmentChart').getContext('2d');

    const indices = [
        { name: 'Cometa Crescita', file: 'csv/cometa.csv', delimiter: ',' ,color: 'rgba(220, 53, 69, ALPHA)'},
        { name: 'Solidarietà Veneto Dinamico', file: 'csv/solidarietaveneto.csv', delimiter: ',', color: 'rgba(100, 123, 255, ALPHA)'},
        { name: 'Benchmark', file: 'csv/acwi_xeon.csv', delimiter: ',', color: 'rgba(23, 162, 184, ALPHA)'},
        { name: 'Oro', file: 'csv/gold_month.csv', delimiter: ',', color: 'rgba(255, 215, 0, ALPHA)'},
        { name: 'S&P 500', file: 'csv/sp500_month.csv', delimiter: ',', color: 'rgba(100, 30, 80, ALPHA)'}        
    ];

    function getColor(index, alpha = 1) {        
        return index.color.replace('ALPHA', alpha);
    }

    function calculateRevaluation() {
        const startYear = parseInt(startYearInput.value);
        const endYear = parseInt(endYearInput.value);

        const fetchPromises = indices.map(index => fetch(index.file).then(response => response.text()));
        fetchPromises.push(fetch('csv/tfr.csv').then(response => response.text()));

        Promise.all(fetchPromises).then(dataArray => {
            const tfrData = dataArray.pop();
            const tfrParsedData = parseCSV(tfrData, '\t');
            const parsedIndicesData = dataArray.map((data, i) => parseCSV(data, indices[i].delimiter));

            const startIndex = tfrParsedData.labels.indexOf(startYear.toString());
            const endIndex = tfrParsedData.labels.indexOf(endYear.toString());

            if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                const tfrCumulativeRevaluation = calculateTfrCumulativeRevaluation(tfrParsedData.values, startIndex, endIndex);
                const tfrAnnualizedRevaluation = ((1 + tfrCumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const cumulativeRevaluations = parsedIndicesData.map(data => calculateCumulativeRevaluation(data, startYear, endYear));
                const annualizedRevaluations = cumulativeRevaluations.map(revaluation => ((1 + revaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100);

                const resultTable = `
                    <table class="table table-bordered table-striped">
                        <tr>
                            <th></th>
                            <th>TFR</th>
                            ${indices.map(index => `<th>${index.name}</th>`).join('')}
                        </tr>
                        <tr>
                            <th>Rivalutazione cumulata</th>
                            <td class="${tfrCumulativeRevaluation >= Math.max(...cumulativeRevaluations) ? 'bg-success text-white' : 'bg-danger text-white'}">${tfrCumulativeRevaluation.toFixed(2)}%</td>
                            ${cumulativeRevaluations.map((revaluation, i) => `<td class="${revaluation >= tfrCumulativeRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${revaluation.toFixed(2)}%</td>`).join('')}
                        </tr>
                        <tr>
                            <th>Rivalutazione Annualizzata</th>
                            <td class="${tfrAnnualizedRevaluation >= Math.max(...annualizedRevaluations) ? 'bg-success text-white' : 'bg-danger text-white'}">${tfrAnnualizedRevaluation.toFixed(2)}%</td>
                            ${annualizedRevaluations.map((revaluation, i) => `<td class="${revaluation >= tfrAnnualizedRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${revaluation.toFixed(2)}%</td>`).join('')}
                        </tr>
                    </table>
                `;
                document.getElementById('resultText').innerHTML = resultTable;

                populateRevaluationTable(tfrParsedData.labels, tfrParsedData.values, parsedIndicesData, startIndex, endIndex);
                generateInvestmentChart(tfrParsedData.labels, tfrParsedData.values, parsedIndicesData, startIndex, endIndex);
            } else {
                document.getElementById('resultText').innerText = 'Intervallo di anni non valido.';
                document.getElementById('revaluationTable').querySelector('tbody').innerHTML = '';
            }
        });
    }

    startYearInput.addEventListener('change', calculateRevaluation);
    endYearInput.addEventListener('change', calculateRevaluation);

    calculateRevaluation();

    document.getElementById('decreaseStartYear').addEventListener('click', function () {
        if (startYearInput.value > startYearInput.min) {
            startYearInput.value--;
            calculateRevaluation();
        }
    });

    document.getElementById('increaseStartYear').addEventListener('click', function () {
        if (startYearInput.value < startYearInput.max) {
            startYearInput.value++;
            calculateRevaluation();
        }
    });

    document.getElementById('decreaseEndYear').addEventListener('click', function () {
        if (endYearInput.value > endYearInput.min) {
            endYearInput.value--;
            calculateRevaluation();
        }
    });

    document.getElementById('increaseEndYear').addEventListener('click', function () {
        if (endYearInput.value < endYearInput.max) {
            endYearInput.value++;
            calculateRevaluation();
        }
    });

    function parseCSV(data, delimiter) {
        const lines = data.split('\n');
        const labels = [];
        const values = [];
        lines.forEach(line => {
            const [label, value] = line.split(delimiter);
            if (label && value) {
                labels.push(label.trim());
                values.push(parseFloat(value.replace('%', '').replace(',', '.')));
            }
        });
        return { labels, values };
    }

    function calculateTfrCumulativeRevaluation(values, startIndex, endIndex) {
        let cumulativeFactor = 1;
        for (let i = startIndex; i <= endIndex; i++) {
            cumulativeFactor *= (1 + values[i] / 100);
        }
        return (cumulativeFactor - 1) * 100;
    }

    function calculateCumulativeRevaluation(data, startYear, endYear) {
        const yearData = data.labels
            .map((label, index) => ({ label, value: data.values[index] }))
            .filter(entry => {
                const year = parseInt(entry.label.split('/')[1]);
                return year >= startYear && year <= endYear + 1;
            });
        if (yearData.length === 0) return null;
        const startValue = parseFloat(yearData[0].value);
        const endValue = parseFloat(yearData[yearData.length - 1].value);
        return ((endValue - startValue) / startValue) * 100;
    }

    function calculateAnnualReturn(data, year) {
        const yearData = data.labels
            .map((label, index) => ({ label, value: data.values[index] }))
            .filter(entry => entry.label.endsWith(year.toString()));
        const nextYearData = data.labels
            .map((label, index) => ({ label, value: data.values[index] }))
            .filter(entry => entry.label.endsWith((parseInt(year) + 1).toString()));
        if (yearData.length === 0 || nextYearData.length === 0) return null;
        const startValue = parseFloat(yearData[0].value);
        const endValue = parseFloat(nextYearData[0].value);
        return ((endValue - startValue) / startValue) * 100;
    }

    function populateRevaluationTable(labels, tfrValues, indicesData, startIndex, endIndex) {        
        const thead = document.getElementById('revaluationTable').querySelector('thead');
        thead.innerHTML = '';
        const tableHeaderRow = document.createElement('tr');
        anniCell =document.createElement('th');
        tfrCell =document.createElement('th');
        anniCell.textContent = 'Anno';
        tfrCell.textContent = 'TFR';
        tableHeaderRow.appendChild(anniCell);
        tableHeaderRow.appendChild(tfrCell);
        
        indices.forEach(index => {
            const th = document.createElement('th');
            th.textContent = index.name;
            tableHeaderRow.appendChild(th);
        });
        thead.appendChild(tableHeaderRow);

        const tbody = document.getElementById('revaluationTable').querySelector('tbody');
        tbody.innerHTML = '';
        for (let i = startIndex; i <= endIndex; i++) {
            const row = document.createElement('tr');
            const yearCell = document.createElement('td');
            const tfrValueCell = document.createElement('td');
            yearCell.textContent = labels[i];
            tfrValueCell.textContent = tfrValues[i].toFixed(2) + '%';

            row.appendChild(yearCell);
            row.appendChild(tfrValueCell);

            indicesData.forEach(data => {
                const valueCell = document.createElement('td');
                const annualReturn = calculateAnnualReturn(data, labels[i]);
                valueCell.textContent = annualReturn !== null ? annualReturn.toFixed(2) + '%' : 'N/A';
                if (annualReturn !== null) {
                    if (tfrValues[i] >= annualReturn) {
                        tfrValueCell.classList.add('bg-success', 'text-white');
                        valueCell.classList.add('bg-danger', 'text-white');
                    } else {
                        tfrValueCell.classList.add('bg-danger', 'text-white');
                        valueCell.classList.add('bg-success', 'text-white');
                    }
                }
                row.appendChild(valueCell);
            });

            tbody.appendChild(row);
        }
    }

    function generateInvestmentChart(labels, tfrValues, indicesData, startIndex, endIndex) {
        const tfrInvestment = [10000 * (1 + tfrValues[startIndex] / 100)];
        const investments = indicesData.map(data => [10000 * (1 + (calculateAnnualReturn(data, labels[startIndex]) || 0) / 100)]);

        for (let i = startIndex + 1; i <= endIndex; i++) {
            tfrInvestment.push(tfrInvestment[tfrInvestment.length - 1] * (1 + tfrValues[i] / 100));
            investments.forEach((investment, j) => {
                const annualReturn = calculateAnnualReturn(indicesData[j], labels[i]);
                investment.push(investment[investment.length - 1] * (1 + (annualReturn !== null ? annualReturn : 0) / 100));
            });
        }

        const tfrPercentage = tfrInvestment.map(value => (value / 10000 - 1) * 100);
        const percentages = investments.map(investment => investment.map(value => (value / 10000 - 1) * 100));

        tfrPercentage.unshift(0);
        percentages.forEach(percentage => percentage.unshift(0));

        if (window.investmentChart instanceof Chart) {
            window.investmentChart.destroy();
        }

        window.investmentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.slice(startIndex - 1, endIndex + 1),
                datasets: [
                    {
                        label: 'TFR',
                        data: tfrPercentage,
                        borderColor: 'rgba(40, 167, 69, 1)',
                        backgroundColor: 'rgba(40, 167, 69, 0.2)',
                        fill: false
                    },
                    ...percentages.map((percentage, i) => ({
                        label: indices[i].name,
                        data: percentage,
                        borderColor: getColor(indices[i]),
                        backgroundColor: getColor(indices[i], 0.2),
                        fill: false
                    }))
                ]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
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
});
