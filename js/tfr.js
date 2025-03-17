document.addEventListener('DOMContentLoaded', function () {
    const startYearInput = document.getElementById('startYear');
    const endYearInput = document.getElementById('endYear');
    const ctx = document.getElementById('investmentChart').getContext('2d');

    function calculateRevaluation() {
        const startYear = parseInt(startYearInput.value);
        const endYear = parseInt(endYearInput.value);

        Promise.all([
            fetch('csv/tfr.csv').then(response => response.text()),
            fetch('csv/cometa.csv').then(response => response.text()),
            fetch('csv/acwi_xeon.csv').then(response => response.text()),
            fetch('csv/gold_month.csv').then(response => response.text()),
            fetch('csv/sp500_month.csv').then(response => response.text())
        ]).then(([tfrData, cometaData, acwiXeonData, goldMonthData, sp500Data]) => {
            const tfrParsedData = parseCSV(tfrData, '\t');
            const cometaParsedData = parseCSV(cometaData, ',');
            const acwiXeonParsedData = parseCSV(acwiXeonData, ',');
            const goldMonthParsedData = parseCSV(goldMonthData, ',');
            const sp500ParsedData = parseCSV(sp500Data, ',');
            cometaParsedData.labels.reverse();
            cometaParsedData.values.reverse();
            const startIndex = tfrParsedData.labels.indexOf(startYear.toString());
            const endIndex = tfrParsedData.labels.indexOf(endYear.toString());

            if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                const tfrCumulativeRevaluation = calculateTfrCumulativeRevaluation(tfrParsedData.values, startIndex, endIndex);
                const tfrAnnualizedRevaluation = ((1 + tfrCumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const cometaCumulativeRevaluation = calculateCometaCumulativeRevaluation(cometaParsedData, startYear, endYear);
                const cometaAnnualizedRevaluation = ((1 + cometaCumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const acwiXeonCumulativeRevaluation = calculateCometaCumulativeRevaluation(acwiXeonParsedData, startYear, endYear);
                const acwiXeonAnnualizedRevaluation = ((1 + acwiXeonCumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const goldCumulativeRevaluation = calculateCometaCumulativeRevaluation(goldMonthParsedData, startYear, endYear);
                const goldAnnualizedRevaluation = ((1 + goldCumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const sp500CumulativeRevaluation = calculateCometaCumulativeRevaluation(sp500ParsedData, startYear, endYear);
                const sp500AnnualizedRevaluation = ((1 + sp500CumulativeRevaluation / 100) ** (1 / (endYear - startYear + 1)) - 1) * 100;

                const resultTable = `
                    <table class="table table-bordered table-striped">
                        <tr>
                            <th></th>
                            <th>TFR</th>
                            <th>Fondo Pensione</th>
                            <th>Benchmark</th>
                            <th>Oro</th>
                            <th>S&P 500</th>
                        </tr>
                        <tr>
                            <th>Rivalutazione cumulata</th>
                            <td class="${tfrCumulativeRevaluation >= cometaCumulativeRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${tfrCumulativeRevaluation.toFixed(2)}%</td>
                            <td class="${cometaCumulativeRevaluation >= tfrCumulativeRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${cometaCumulativeRevaluation.toFixed(2)}%</td>
                            <td class="bg-primary text-white">${acwiXeonCumulativeRevaluation.toFixed(2)}%</td>
                            <td class="bg-warning text-white">${goldCumulativeRevaluation.toFixed(2)}%</td>
                            <td class="bg-info text-white">${sp500CumulativeRevaluation.toFixed(2)}%</td>
                        </tr>
                        <tr>
                            <th>Rivalutazione Annualizzata</th>
                            <td class="${tfrAnnualizedRevaluation >= cometaAnnualizedRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${tfrAnnualizedRevaluation.toFixed(2)}%</td>
                            <td class="${cometaAnnualizedRevaluation >= tfrAnnualizedRevaluation ? 'bg-success text-white' : 'bg-danger text-white'}">${cometaAnnualizedRevaluation.toFixed(2)}%</td>
                            <td class="bg-primary text-white">${acwiXeonAnnualizedRevaluation.toFixed(2)}%</td>
                            <td class="bg-warning text-white">${goldAnnualizedRevaluation.toFixed(2)}%</td>
                            <td class="bg-info text-white">${sp500AnnualizedRevaluation.toFixed(2)}%</td>
                        </tr>
                    </table>
                `;
                document.getElementById('resultText').innerHTML = resultTable;

                populateRevaluationTable(tfrParsedData.labels, tfrParsedData.values, cometaParsedData, acwiXeonParsedData, goldMonthParsedData, sp500ParsedData, startIndex, endIndex);
                generateInvestmentChart(tfrParsedData.labels, tfrParsedData.values, cometaParsedData, acwiXeonParsedData, goldMonthParsedData, sp500ParsedData, startIndex, endIndex);
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

    function calculateCometaCumulativeRevaluation(cometaData, startYear, endYear) {
        const yearData = cometaData.labels
            .map((label, index) => ({ label, value: cometaData.values[index] }))
            .filter(entry => {
                const year = parseInt(entry.label.split('/')[1]);
                return year >= startYear && year <= endYear + 1;
            });
        if (yearData.length === 0) return null;
        const startValue = parseFloat(yearData[0].value);
        const endValue = parseFloat(yearData[yearData.length - 1].value);
        return ((endValue - startValue) / startValue) * 100;
    }

    function calculateCometaAnnualReturn(cometaData, year) {
        const yearData = cometaData.labels
            .map((label, index) => ({ label, value: cometaData.values[index] }))
            .filter(entry => entry.label.endsWith(year.toString()));
        const nextYearData = cometaData.labels
            .map((label, index) => ({ label, value: cometaData.values[index] }))
            .filter(entry => entry.label.endsWith((parseInt(year) + 1).toString()));
        if (yearData.length === 0 || nextYearData.length === 0) return null;
        const startValue = parseFloat(yearData[0].value);
        const endValue = parseFloat(nextYearData[0].value);
        return ((endValue - startValue) / startValue) * 100;
    }

    function populateRevaluationTable(labels, tfrValues, cometaData, acwiXeonData, goldMonthData, sp500Data, startIndex, endIndex) {
        const tbody = document.getElementById('revaluationTable').querySelector('tbody');
        tbody.innerHTML = '';
        for (let i = startIndex; i <= endIndex; i++) {
            const row = document.createElement('tr');
            const yearCell = document.createElement('td');
            const tfrValueCell = document.createElement('td');
            const cometaValueCell = document.createElement('td');
            const acwiXeonValueCell = document.createElement('td');
            const goldValueCell = document.createElement('td');
            const sp500ValueCell = document.createElement('td');

            yearCell.textContent = labels[i];
            tfrValueCell.textContent = tfrValues[i].toFixed(2) + '%';
            const cometaReturn = calculateCometaAnnualReturn(cometaData, labels[i]);
            cometaValueCell.textContent = cometaReturn !== null ? cometaReturn.toFixed(2) + '%' : 'N/A';
            const acwiXeonReturn = calculateCometaAnnualReturn(acwiXeonData, labels[i]);
            acwiXeonValueCell.textContent = acwiXeonReturn !== null ? acwiXeonReturn.toFixed(2) + '%' : 'N/A';
            const goldReturn = calculateCometaAnnualReturn(goldMonthData, labels[i]);
            goldValueCell.textContent = goldReturn !== null ? goldReturn.toFixed(2) + '%' : 'N/A';
            const sp500Return = calculateCometaAnnualReturn(sp500Data, labels[i]);
            sp500ValueCell.textContent = sp500Return !== null ? sp500Return.toFixed(2) + '%' : 'N/A';
            if (cometaReturn !== null && acwiXeonReturn !== null && goldReturn !== null && sp500Return !== null) {
                if (tfrValues[i] >= cometaReturn) {
                    tfrValueCell.classList.add('bg-success', 'text-white');
                    cometaValueCell.classList.add('bg-danger', 'text-white');

                } else {
                    tfrValueCell.classList.add('bg-danger', 'text-white');
                    cometaValueCell.classList.add('bg-success', 'text-white');
                }
                acwiXeonValueCell.classList.add('bg-primary', 'text-white');
                goldValueCell.classList.add('bg-warning', 'text-white');
                sp500ValueCell.classList.add('bg-info', 'text-white');
            }

            row.appendChild(yearCell);
            row.appendChild(tfrValueCell);
            row.appendChild(cometaValueCell);
            row.appendChild(acwiXeonValueCell);
            row.appendChild(goldValueCell);
            row.appendChild(sp500ValueCell);
            tbody.appendChild(row);
        }
    }

    function generateInvestmentChart(labels, tfrValues, cometaData, acwiXeonData, goldMonthData, sp500Data, startIndex, endIndex) {
        const tfrInvestment = [10000 * (1 + tfrValues[startIndex] / 100)];
        const cometaInvestment = [10000 * (1 + (calculateCometaAnnualReturn(cometaData, labels[startIndex]) || 0) / 100)];
        const acwiXeonInvestment = [10000 * (1 + (calculateCometaAnnualReturn(acwiXeonData, labels[startIndex]) || 0) / 100)];
        const goldInvestment = [10000 * (1 + (calculateCometaAnnualReturn(goldMonthData, labels[startIndex]) || 0) / 100)];
        const sp500Investment = [10000 * (1 + (calculateCometaAnnualReturn(sp500Data, labels[startIndex]) || 0) / 100)];

        for (let i = startIndex + 1; i <= endIndex; i++) {
            tfrInvestment.push(tfrInvestment[tfrInvestment.length - 1] * (1 + tfrValues[i] / 100));
            const cometaReturn = calculateCometaAnnualReturn(cometaData, labels[i]);
            cometaInvestment.push(cometaInvestment[cometaInvestment.length - 1] * (1 + (cometaReturn !== null ? cometaReturn : 0) / 100));
            const acwiXeonReturn = calculateCometaAnnualReturn(acwiXeonData, labels[i]);
            acwiXeonInvestment.push(acwiXeonInvestment[acwiXeonInvestment.length - 1] * (1 + (acwiXeonReturn !== null ? acwiXeonReturn : 0) / 100));
            const goldReturn = calculateCometaAnnualReturn(goldMonthData, labels[i]);
            goldInvestment.push(goldInvestment[goldInvestment.length - 1] * (1 + (goldReturn !== null ? goldReturn : 0) / 100));
            const sp500Return = calculateCometaAnnualReturn(sp500Data, labels[i]);
            sp500Investment.push(sp500Investment[sp500Investment.length - 1] * (1 + (sp500Return !== null ? sp500Return : 0) / 100));
        }

        const tfrPercentage = tfrInvestment.map(value => (value / 10000 - 1) * 100);
        const cometaPercentage = cometaInvestment.map(value => (value / 10000 - 1) * 100);
        const acwiXeonPercentage = acwiXeonInvestment.map(value => (value / 10000 - 1) * 100);
        const goldPercentage = goldInvestment.map(value => (value / 10000 - 1) * 100);
        const sp500Percentage = sp500Investment.map(value => (value / 10000 - 1) * 100);

        tfrPercentage.unshift(0);
        cometaPercentage.unshift(0);
        acwiXeonPercentage.unshift(0);
        goldPercentage.unshift(0);
        sp500Percentage.unshift(0);

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
                    {
                        label: 'Fondo Pensione',
                        data: cometaPercentage,
                        borderColor: 'rgba(220, 53, 69, 1)',
                        backgroundColor: 'rgba(220, 53, 69, 0.2)',
                        fill: false
                    },
                    {
                        label: 'Benchmark',
                        data: acwiXeonPercentage,
                        borderColor: 'rgba(0, 123, 255, 1)',
                        backgroundColor: 'rgba(0, 123, 255, 0.2)',
                        fill: false
                    },
                    {
                        label: 'Gold',
                        data: goldPercentage,
                        borderColor: 'rgba(255, 215, 0, 1)',
                        backgroundColor: 'rgba(255, 215, 0, 0.2)',
                        fill: false
                    },
                    {
                        label: 'S&P 500',
                        data: sp500Percentage,
                        borderColor: 'rgba(23, 162, 184, 1)',
                        backgroundColor: 'rgba(23, 162, 184, 0.2)',
                        fill: false
                    },
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
