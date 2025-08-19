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

            // Estrai i tassi già calcolati dall'XML, distinguendo AAA e All Ratings
            const series = Array.from(data.getElementsByTagNameNS(nsGeneric, 'Series'));
            const spotCurve = [], forwardCurve = [], parCurve = [];
            const spotCurveAll = [], forwardCurveAll = [], parCurveAll = [];
            series.forEach(s => {
                const values = s.getElementsByTagNameNS(nsGeneric, 'Value');
                let key = '';
                let title = '';
                let rating = '';
                for (let v of values) {
                    if (v.getAttribute('id') === 'DATA_TYPE_FM') key = v.getAttribute('value');
                    if (v.getAttribute('id') === 'TITLE') title = v.getAttribute('value');
                    if (v.getAttribute('id') === 'TITLE_COMPL') rating = v.getAttribute('value');
                }
                const obs = s.getElementsByTagNameNS(nsGeneric, 'ObsValue')[0];
                if (!obs) return;
                const y = parseFloat(obs.getAttribute('value'));
                let x = null;
                // Prova a estrarre la scadenza dal DATA_TYPE_FM (es: SR_10Y, IF_10Y, PYS_NR_10Y)
                let match = null;
                // Gestione SR_xYxM, SR_xM, IF_xYxM, IF_xM, PYS_NR_xYxM, PYS_NR_xM
                if ((match = key.match(/SR_(?:(\d+)Y)?(\d+)?M?/))) {
                    const anni = match[1] ? parseFloat(match[1]) : 0;
                    const mesi = match[2] ? parseFloat(match[2]) : 0;
                    x = anni + mesi/12;
                    if (rating.includes('triple A')) spotCurve.push({x, y});
                    else if (rating.includes('all ratings included')) spotCurveAll.push({x, y});
                } else if ((match = key.match(/IF_(?:(\d+)Y)?(\d+)?M?/))) {
                    const anni = match[1] ? parseFloat(match[1]) : 0;
                    const mesi = match[2] ? parseFloat(match[2]) : 0;
                    x = anni + mesi/12;
                    if (rating.includes('triple A')) forwardCurve.push({x, y});
                    else if (rating.includes('all ratings included')) forwardCurveAll.push({x, y});
                } else if ((match = key.match(/PY_(?:(\d+)Y)?(\d+)?M?/))) {
                    const anni = match[1] ? parseFloat(match[1]) : 0;
                    const mesi = match[2] ? parseFloat(match[2]) : 0;
                    x = anni + mesi/12;
                    if (rating.includes('triple A')) parCurve.push({x, y});
                    else if (rating.includes('all ratings included')) parCurveAll.push({x, y});
                }
            });
            // Ordina i punti per maturità (x) crescente
            function sortCurve(curve) {
                curve.sort((a, b) => a.x - b.x);
            }
            sortCurve(spotCurve);
            sortCurve(forwardCurve);
            sortCurve(parCurve);
            sortCurve(spotCurveAll);
            sortCurve(forwardCurveAll);
            sortCurve(parCurveAll);

            // Calcola le differenze e trova i punti massimi
            let maxSpotForwardDiff = { diff: 0, x: 0 };
            let maxSpotParDiff = { diff: 0, x: 0 };

            spotCurve.forEach((spot, i) => {
                const forward = forwardCurve.find(f => f.x === spot.x);
                const par = parCurve.find(p => p.x === spot.x);
                
                if (forward) {
                    const diff = Math.abs(forward.y - spot.y);
                    if (diff > maxSpotForwardDiff.diff) {
                        maxSpotForwardDiff = { diff, x: spot.x };
                    }
                }
                
                if (par) {
                    const diff = Math.abs(par.y - spot.y);
                    if (diff > maxSpotParDiff.diff) {
                        maxSpotParDiff = { diff, x: spot.x };
                    }
                }
            });

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
            datasets.forEach(dataset => {
                dataset.pointHitRadius = 12;
            });

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
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: window.innerWidth < 768 ? 'bottom' : 'top',
                            labels: {
                                boxWidth: window.innerWidth < 768 ? 8 : 40,
                                padding: window.innerWidth < 768 ? 8 : 10,
                                font: {
                                    size: window.innerWidth < 768 ? 10 : 12
                                }
                            }
                        },
                        annotation: {
                            annotations: {
                                spotForwardLine: {
                                    type: 'line',
                                    xMin: maxSpotForwardDiff.x,
                                    xMax: maxSpotForwardDiff.x,
                                    borderColor: 'rgba(255, 0, 0, 0.5)',
                                    borderWidth: 2,
                                    label: {
                                        content: 'Max Spot-Forward',
                                        enabled: true,
                                        position: 'bottom',
                                        yAdjust: 30
                                    }
                                },
                                spotParLine: {
                                    type: 'line',
                                    xMin: maxSpotParDiff.x,
                                    xMax: maxSpotParDiff.x,
                                    borderColor: 'rgba(0, 255, 0, 0.5)',
                                    borderWidth: 2,
                                    label: {
                                        content: 'Max Spot-Par',
                                        enabled: true,
                                        position: 'bottom',
                                        yAdjust: 10
                                    }
                                }
                            }
                        },
                        title: { display: true, text: 'Curva Rendimenti BCE' },
                        tooltip: {
                            enabled: true,
                            mode: 'index',
                            intersect: false,
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            min: 0,
                            max: 30,
                            title: { display: true, text: 'Maturità (anni)' },
                            ticks: {
                                font: {
                                    size: window.innerWidth < 768 ? 10 : 12
                                }
                            }
                        },
                        y: {
                            title: { display: true, text: 'Yield in %' },
                            ticks: {
                                font: {
                                    size: window.innerWidth < 768 ? 10 : 12
                                }
                            }
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
            
            // Aggiorna il testo delle duration
            const durationTextForward = `Spot-Forward: ${maxSpotForwardDiff.x.toFixed(1)} anni (diff: ${(maxSpotForwardDiff.diff * 100).toFixed(0)} bp)`;
            const durationTextPar = `Spot-Par: ${maxSpotParDiff.x.toFixed(1)} anni (diff: ${(maxSpotParDiff.diff * 100).toFixed(0)} bp)`;
            document.getElementById('duration-info-forward').textContent = durationTextForward;
            document.getElementById('duration-info-par').textContent = durationTextPar;
        });
});