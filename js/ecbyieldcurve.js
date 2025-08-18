document.addEventListener('DOMContentLoaded', function () {
    // Namespace definiti nel file XML
    const nsMessage = 'http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message';
    const nsGeneric = 'http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/generic';

    fetch('xml/data.xml')
        .then(response => response.text())
        .then(str => (new window.DOMParser()).parseFromString(str, 'text/xml'))
        .then(data => {
            // Data prepared
            const prepared = data.getElementsByTagNameNS(nsMessage, 'Prepared')[0]?.textContent || '';
            document.getElementById('ecb-date').textContent = prepared ? `Dati BCE aggiornati al: ${prepared.substring(0,10)}` : '';

            // Estrai parametri BETA e TAU per bond AAA e All Ratings
            const series = Array.from(data.getElementsByTagNameNS(nsGeneric, 'Series'));
            let beta0, beta1, beta2, beta3, tau1, tau2;
            let beta0_all, beta1_all, beta2_all, beta3_all, tau1_all, tau2_all;
            series.forEach(s => {
                const values = s.getElementsByTagNameNS(nsGeneric, 'Value');
                let key = '';
                let rating = '';
                for (let v of values) {
                    if (v.getAttribute('id') === 'DATA_TYPE_FM') key = v.getAttribute('value');
                    if (v.getAttribute('id') === 'TITLE_COMPL') rating = v.getAttribute('value');
                }
                const obs = s.getElementsByTagNameNS(nsGeneric, 'ObsValue')[0]?.getAttribute('value');
                // AAA
                if (rating.includes('triple A')) {
                    if (key === 'BETA0') beta0 = parseFloat(obs);
                    if (key === 'BETA1') beta1 = parseFloat(obs);
                    if (key === 'BETA2') beta2 = parseFloat(obs);
                    if (key === 'BETA3') beta3 = parseFloat(obs);
                    if (key === 'TAU1') tau1 = parseFloat(obs);
                    if (key === 'TAU2') tau2 = parseFloat(obs);
                }
                // All ratings
                if (rating.includes('all ratings included')) {
                    if (key === 'BETA0') beta0_all = parseFloat(obs);
                    if (key === 'BETA1') beta1_all = parseFloat(obs);
                    if (key === 'BETA2') beta2_all = parseFloat(obs);
                    if (key === 'BETA3') beta3_all = parseFloat(obs);
                    if (key === 'TAU1') tau1_all = parseFloat(obs);
                    if (key === 'TAU2') tau2_all = parseFloat(obs);
                }
            });

            // Calcola le curve
            const spotCurve = [];
            const forwardCurve = [];
            const parCurve = [];
            const spotCurveAll = [];
            const forwardCurveAll = [];
            const parCurveAll = [];
            for (let t = 0.1; t <= 30; t += 0.1) {
                // AAA
                let y = null, f = null, p = null;
                if (beta0 !== undefined && beta1 !== undefined && beta2 !== undefined && beta3 !== undefined && tau1 !== undefined && tau2 !== undefined) {
                    let term1 = (1 - Math.exp(-t/tau1)) / (t/tau1);
                    let term2 = term1 - Math.exp(-t/tau1);
                    let term3 = (1 - Math.exp(-t/tau2)) / (t/tau2) - Math.exp(-t/tau2);
                    y = beta0 + beta1 * term1 + beta2 * term2 + beta3 * term3;
                    f = beta0 + beta1 * Math.exp(-t/tau1) + beta2 * (t/tau1) * Math.exp(-t/tau1) + beta3 * (t/tau2) * Math.exp(-t/tau2);
                    let sum = 0;
                    for (let ti = 0.1; ti <= t; ti += 0.1) {
                        let term1i = (1 - Math.exp(-ti/tau1)) / (ti/tau1);
                        let term2i = term1i - Math.exp(-ti/tau1);
                        let term3i = (1 - Math.exp(-ti/tau2)) / (ti/tau2) - Math.exp(-ti/tau2);
                        sum += beta0 + beta1 * term1i + beta2 * term2i + beta3 * term3i;
                    }
                    p = sum / (t*10);
                }
                spotCurve.push({x: t, y: y});
                forwardCurve.push({x: t, y: f});
                parCurve.push({x: t, y: p});

                // All ratings
                let y_all = null, f_all = null, p_all = null;
                if (beta0_all !== undefined && beta1_all !== undefined && beta2_all !== undefined && beta3_all !== undefined && tau1_all !== undefined && tau2_all !== undefined) {
                    let term1a = (1 - Math.exp(-t/tau1_all)) / (t/tau1_all);
                    let term2a = term1a - Math.exp(-t/tau1_all);
                    let term3a = (1 - Math.exp(-t/tau2_all)) / (t/tau2_all) - Math.exp(-t/tau2_all);
                    y_all = beta0_all + beta1_all * term1a + beta2_all * term2a + beta3_all * term3a;
                    f_all = beta0_all + beta1_all * Math.exp(-t/tau1_all) + beta2_all * (t/tau1_all) * Math.exp(-t/tau1_all) + beta3_all * (t/tau2_all) * Math.exp(-t/tau2_all);
                    let sum_all = 0;
                    for (let ti = 0.1; ti <= t; ti += 0.1) {
                        let term1ia = (1 - Math.exp(-ti/tau1_all)) / (ti/tau1_all);
                        let term2ia = term1ia - Math.exp(-ti/tau1_all);
                        let term3ia = (1 - Math.exp(-ti/tau2_all)) / (ti/tau2_all) - Math.exp(-ti/tau2_all);
                        sum_all += beta0_all + beta1_all * term1ia + beta2_all * term2ia + beta3_all * term3ia;
                    }
                    p_all = sum_all / (t*10);
                }
                spotCurveAll.push({x: t, y: y_all});
                forwardCurveAll.push({x: t, y: f_all});
                parCurveAll.push({x: t, y: p_all});
            }

            // Prepara solo la curva spot
            const datasets = [
                {
                    label: 'Spot (AAA)',
                    data: spotCurve,                
                    borderColor: 'blue',
                    fill: false,
                    showLine: true,
                    pointRadius: 0
                },
                {
                    label: 'Istant Forward (AAA)',
                    data: forwardCurve,
                    borderColor: 'red',
                    fill: false,
                    showLine: true,
                    pointRadius: 0
                },
                {
                    label: 'Par Yield (AAA)',
                    data: parCurve,
                    borderColor: 'green',
                    fill: false,
                    showLine: true,
                    pointRadius: 0
                },
                {
                    label: 'Spot (All Ratings)',
                    data: spotCurveAll,
                    borderColor: 'blue',
                    fill: false,
                    showLine: true,
                    pointRadius: 0,
                    borderDash: [8,4],
                    hidden: true,
                },
                {
                    label: 'Istant Forward (All Ratings)',
                    data: forwardCurveAll,
                    borderColor: 'red',
                    fill: false,
                    showLine: true,
                    pointRadius: 0,
                    borderDash: [8,4],
                    hidden: true,
                },
                {
                    label: 'Par Yield (All Ratings)',
                    data: parCurveAll,
                    borderColor: 'green',
                    fill: false,
                    showLine: true,
                    pointRadius: 0,
                    borderDash: [8,4],       
                    hidden: true,             
                }
            ];

            // Aggiungi i bottoni per mostrare solo AAA o solo All Ratings
            const chartContainer = document.getElementById('ecbYieldChart').parentNode;
            const btnAAA = document.createElement('button');
            btnAAA.textContent = 'Mostra solo AAA';
            btnAAA.style.marginRight = '8px';
            const btnAll = document.createElement('button');
            btnAll.textContent = 'Mostra solo All Ratings';
            chartContainer.insertBefore(btnAAA, chartContainer.firstChild);
            chartContainer.insertBefore(btnAll, chartContainer.firstChild);

            // Crea il grafico con Chart.js
            const ctx = document.getElementById('ecbYieldChart').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                        },
                        title: { display: true, text: 'Curva Rendimenti BCE' }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            min: 0,
                            max: 30,
                            title: { display: true, text: 'Maturità (anni)' }
                        },
                        y: {
                            title: { display: true, text: 'Yield in %' }
                        }
                    }
                }
            });

            // Funzione per mostrare solo AAA
            btnAAA.addEventListener('click', function() {
                chart.data.datasets.forEach(ds => {
                    ds.hidden = ds.label.includes('All Ratings');
                });
                chart.update();
            });
            // Funzione per mostrare solo All Ratings
            btnAll.addEventListener('click', function() {
                chart.data.datasets.forEach(ds => {
                    ds.hidden = ds.label.includes('AAA');
                });
                chart.update();
            });
        });
});