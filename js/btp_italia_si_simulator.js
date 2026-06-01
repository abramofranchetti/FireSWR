document.addEventListener('DOMContentLoaded', function () {
    const elements = {
        nominal: document.getElementById('btpSimNominal'),
        years: document.getElementById('btpSimYears'),
        classicRate: document.getElementById('btpSimClassicRate'),
        siRate: document.getElementById('btpSimSiRate'),
        mode: document.getElementById('btpSimMode'),
        inflation: document.getElementById('btpSimInflation'),
        discount: document.getElementById('btpSimDiscount'),
        classicPremium: document.getElementById('btpSimClassicPremium'),
        siPremium: document.getElementById('btpSimSiPremium'),
        indexSeries: document.getElementById('btpSimIndexSeries'),
        run: document.getElementById('btpSimRun'),
        constant: document.getElementById('btpSimConstant'),
        oscillating: document.getElementById('btpSimOscillating'),
        classicTotal: document.getElementById('btpSimClassicTotal'),
        siTotal: document.getElementById('btpSimSiTotal'),
        totalDiff: document.getElementById('btpSimTotalDiff'),
        pvDiff: document.getElementById('btpSimPvDiff'),
        classicReturn: document.getElementById('btpSimClassicReturn'),
        siReturn: document.getElementById('btpSimSiReturn'),
        returnDiff: document.getElementById('btpSimReturnDiff'),
        gainRelativeDiff: document.getElementById('btpSimGainRelativeDiff'),
        tableBody: document.getElementById('btpSimTableBody'),
        chart: document.getElementById('btpSimChart'),
        indexChart: document.getElementById('btpSimIndexChart')
    };

    if (!elements.nominal || !elements.chart) {
        return;
    }

    let chartInstance = null;
    let indexChartInstance = null;

    function toNumber(input, fallback) {
        const value = parseFloat(String(input.value).replace(',', '.'));
        return Number.isFinite(value) ? value : fallback;
    }

    function formatEuro(value) {
        return value.toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatPct(value) {
        return (value * 100).toLocaleString('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + '%';
    }

    function parseIndexSeries() {
        const matches = elements.indexSeries.value.match(/\d+(?:[.,]\d+)?/g) || [];

        return matches
            .map(function (raw) {
                return parseFloat(raw.replace(',', '.'));
            })
            .filter(function (value) {
                return Number.isFinite(value) && value > 0;
            });
    }

    function getSemesters() {
        return Math.max(1, Math.round(toNumber(elements.years, 5) * 2));
    }

    function buildConstantIndex() {
        const semesters = getSemesters();
        const inflation = toNumber(elements.inflation, 1) / 100;
        const values = [100];

        for (let i = 0; i < semesters; i++) {
            values.push(values[values.length - 1] * (1 + inflation));
        }

        return values;
    }

    function generateConstantIndex() {
        const values = buildConstantIndex();

        elements.indexSeries.value = values.map(function (value) {
            return value.toFixed(4);
        }).join(', ');
    }

    function generateOscillatingIndex() {
        const semesters = getSemesters();
        const pattern = [5, 1, -4.7, 3, 5.8, -0.9, 2.8, -1.1, 4.5, 1.7];
        const values = [100];

        for (let i = 0; i < semesters; i++) {
            const change = pattern[i % pattern.length] / 100;
            values.push(values[values.length - 1] * (1 + change));
        }

        elements.indexSeries.value = values.map(function (value) {
            return value.toFixed(2);
        }).join(', ');
        elements.mode.value = 'index';
    }

    function getIndexValues() {
        const semesters = getSemesters();

        if (elements.mode.value === 'constant') {
            const values = buildConstantIndex();
            generateConstantIndex();
            return values;
        }

        const values = parseIndexSeries();
        if (values.length < semesters + 1) {
            throw new Error('Servono almeno ' + (semesters + 1) + ' valori dell\'indice prezzi.');
        }

        return values.slice(0, semesters + 1);
    }

    function calculate() {
        const nominal = Math.max(1, toNumber(elements.nominal, 1000));
        const semesters = getSemesters();
        const classicSemiRate = toNumber(elements.classicRate, 2) / 100 / 2;
        const siSemiRate = toNumber(elements.siRate, 2) / 100 / 2;
        const discountSemiRate = toNumber(elements.discount, 2.5) / 100 / 2;
        const classicPremiumRate = Math.max(0, toNumber(elements.classicPremium, 0) / 100);
        const siPremiumRate = Math.max(0, toNumber(elements.siPremium, 0) / 100);
        const indexes = getIndexValues();
        const startIndex = indexes[0];
        let protectedCoeff = 1;
        let classicTotal = 0;
        let siTotal = 0;
        let classicPv = 0;
        let siPv = 0;
        let classicCumulative = 0;
        let siCumulative = 0;

        const rows = [];
        const chartLabels = [];
        const classicChartData = [];
        const siChartData = [];
        const indexLabels = ['Inizio'];
        const indexChartData = [indexes[0]];

        for (let semester = 1; semester <= semesters; semester++) {
            const previousIndex = indexes[semester - 1];
            const currentIndex = indexes[semester];
            const semesterInflation = currentIndex / previousIndex - 1;
            const cumulativeCoeff = currentIndex / startIndex;
            const classicCouponCoeff = Math.max(cumulativeCoeff, 1);
            const classicCoupon = nominal * classicCouponCoeff * classicSemiRate;
            const classicCapitalRevaluation = nominal * Math.max(cumulativeCoeff - protectedCoeff, 0);
            protectedCoeff = Math.max(protectedCoeff, cumulativeCoeff);

            const siCoupon = nominal * (siSemiRate + Math.max(semesterInflation, 0));
            let classicFlow = classicCoupon + classicCapitalRevaluation;
            let siFlow = siCoupon;

            if (semester === semesters) {
                classicFlow += nominal + nominal * classicPremiumRate;
                siFlow += nominal + nominal * siPremiumRate;
            }

            const discountFactor = Math.pow(1 + discountSemiRate, semester);
            classicTotal += classicFlow;
            siTotal += siFlow;
            classicPv += classicFlow / discountFactor;
            siPv += siFlow / discountFactor;
            classicCumulative += classicFlow;
            siCumulative += siFlow;

            rows.push({
                semester,
                previousIndex,
                currentIndex,
                semesterInflation,
                classicCoupon,
                classicCapitalRevaluation,
                classicFlow,
                siCoupon,
                siFlow,
                diff: siFlow - classicFlow
            });

            chartLabels.push('S' + semester);
            classicChartData.push(classicCumulative);
            siChartData.push(siCumulative);
            indexLabels.push('S' + semester);
            indexChartData.push(currentIndex);
        }

        return {
            rows,
            chartLabels,
            classicChartData,
            siChartData,
            indexLabels,
            indexChartData,
            nominal,
            classicTotal,
            siTotal,
            classicPv,
            siPv
        };
    }

    function renderTable(rows) {
        elements.tableBody.innerHTML = rows.map(function (row) {
            return '<tr>' +
                '<td>' + row.semester + '</td>' +
                '<td>' + row.previousIndex.toFixed(2) + '</td>' +
                '<td>' + row.currentIndex.toFixed(2) + '</td>' +
                '<td>' + formatPct(row.semesterInflation) + '</td>' +
                '<td>' + formatEuro(row.classicCoupon) + '</td>' +
                '<td>' + formatEuro(row.classicCapitalRevaluation) + '</td>' +
                '<td>' + formatEuro(row.classicFlow) + '</td>' +
                '<td>' + formatEuro(row.siCoupon) + '</td>' +
                '<td>' + formatEuro(row.siFlow) + '</td>' +
                '<td>' + formatEuro(row.diff) + '</td>' +
                '</tr>';
        }).join('');
    }

    function renderChart(result) {
        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(elements.chart.getContext('2d'), {
            type: 'line',
            data: {
                labels: result.chartLabels,
                datasets: [
                    {
                        label: 'BTP Italia classico - flussi cumulati',
                        data: result.classicChartData,
                        borderColor: '#0056b3',
                        backgroundColor: 'rgba(0, 86, 179, 0.12)',
                        tension: 0.2,
                        fill: false
                    },
                    {
                        label: 'BTP Italia Si - flussi cumulati',
                        data: result.siChartData,
                        borderColor: '#198754',
                        backgroundColor: 'rgba(25, 135, 84, 0.12)',
                        tension: 0.2,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            callback: function (value) {
                                return value.toLocaleString('it-IT') + ' EUR';
                            }
                        }
                    }
                }
            }
        });
    }

    function renderIndexChart(result) {
        if (indexChartInstance) {
            indexChartInstance.destroy();
        }

        indexChartInstance = new Chart(elements.indexChart.getContext('2d'), {
            type: 'line',
            data: {
                labels: result.indexLabels,
                datasets: [
                    {
                        label: 'Indice prezzi',
                        data: result.indexChartData,
                        borderColor: '#6f42c1',
                        backgroundColor: 'rgba(111, 66, 193, 0.12)',
                        tension: 0.2,
                        fill: true,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return 'Indice: ' + context.parsed.y.toLocaleString('it-IT', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function (value) {
                                return value.toLocaleString('it-IT', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    function render() {
        try {
            const result = calculate();
            const totalDiff = result.siTotal - result.classicTotal;
            const pvDiff = result.siPv - result.classicPv;
            const classicReturn = (result.classicTotal - result.nominal) / result.nominal;
            const siReturn = (result.siTotal - result.nominal) / result.nominal;
            const returnDiff = siReturn - classicReturn;
            const siGain = result.siTotal - result.nominal;
            const gainRelativeDiff = siGain !== 0 ? (result.classicTotal - result.siTotal) / siGain : 0;

            elements.classicTotal.textContent = formatEuro(result.classicTotal);
            elements.siTotal.textContent = formatEuro(result.siTotal);
            elements.totalDiff.textContent = formatEuro(totalDiff);
            elements.pvDiff.textContent = formatEuro(pvDiff);
            elements.classicReturn.textContent = formatPct(classicReturn);
            elements.siReturn.textContent = formatPct(siReturn);
            elements.returnDiff.textContent = formatPct(returnDiff);
            elements.gainRelativeDiff.textContent = formatPct(gainRelativeDiff);
            elements.totalDiff.className = totalDiff >= 0 ? 'text-success' : 'text-danger';
            elements.pvDiff.className = pvDiff >= 0 ? 'text-success' : 'text-danger';
            elements.returnDiff.className = returnDiff >= 0 ? 'text-success' : 'text-danger';
            elements.gainRelativeDiff.className = gainRelativeDiff >= 0 ? 'text-success' : 'text-danger';

            renderTable(result.rows);
            renderChart(result);
            renderIndexChart(result);
        } catch (error) {
            elements.tableBody.innerHTML = '<tr><td colspan="10" class="text-danger">' + error.message + '</td></tr>';
        }
    }

    [
        elements.nominal,
        elements.years,
        elements.classicRate,
        elements.siRate,
        elements.mode,
        elements.inflation,
        elements.discount,
        elements.classicPremium,
        elements.siPremium,
        elements.indexSeries
    ].forEach(function (element) {
        element.addEventListener('input', render);
        element.addEventListener('change', render);
    });

    elements.run.addEventListener('click', render);
    elements.constant.addEventListener('click', function () {
        elements.mode.value = 'constant';
        generateConstantIndex();
        render();
    });
    elements.oscillating.addEventListener('click', function () {
        generateOscillatingIndex();
        render();
    });

    render();
});
