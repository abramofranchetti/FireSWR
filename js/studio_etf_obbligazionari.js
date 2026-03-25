document.addEventListener('DOMContentLoaded', function () {
    const nsMessage = 'http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message';
    const nsGeneric = 'http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/generic';

    const state = {
        mode: 'AAA',
        chart: null,
        datasets: null,
        stats: null
    };

    const colors = {
        AAA: {
            spot: '#0f766e',
            forward: '#d97706',
            annotation: 'rgba(217, 119, 6, 0.35)'
        },
        ALL: {
            spot: '#2563eb',
            forward: '#7c3aed',
            annotation: 'rgba(124, 58, 237, 0.32)'
        }
    };

    const summaryMetrics = document.getElementById('summary-metrics');
    const comparisonTableBody = document.getElementById('comparison-table-body');
    const examplesGrid = document.getElementById('examples-grid');
    const etfInsights = document.getElementById('etf-insights');
    const btnAAA = document.getElementById('btnAAA');
    const btnAll = document.getElementById('btnAll');

    fetch('xml/data.xml')
        .then(function (response) {
            return response.text();
        })
        .then(function (xmlString) {
            return new window.DOMParser().parseFromString(xmlString, 'text/xml');
        })
        .then(function (data) {
            initializePage(data);
        })
        .catch(function (error) {
            console.error('Errore nel caricamento dei dati BCE:', error);
            summaryMetrics.innerHTML = '<div class="metric-card"><div class="metric-label">Errore</div><div class="metric-value">Dati non disponibili</div><div class="metric-detail">Non sono riuscito a leggere il file XML BCE.</div></div>';
        });

    function initializePage(data) {
        const prepared = data.getElementsByTagNameNS(nsMessage, 'Prepared')[0];
        if (prepared) {
            const preparedDate = prepared.textContent.substring(0, 10);
            document.getElementById('ecb-date').innerHTML = '<i class="fas fa-database"></i> Dati BCE aggiornati al ' + preparedDate;
        }

        const parsed = extractCurves(data);
        state.datasets = parsed.datasets;
        state.stats = {
            AAA: computeStats(parsed.datasets.AAA),
            ALL: computeStats(parsed.datasets.ALL)
        };

        createChart(parsed.datasets);
        updateView('AAA');

        btnAAA.addEventListener('click', function () {
            updateView('AAA');
        });

        btnAll.addEventListener('click', function () {
            updateView('ALL');
        });
    }

    function extractCurves(data) {
        const series = Array.from(data.getElementsByTagNameNS(nsGeneric, 'Series'));
        const datasets = {
            AAA: { spot: [], forward: [] },
            ALL: { spot: [], forward: [] }
        };

        series.forEach(function (seriesNode) {
            const values = Array.from(seriesNode.getElementsByTagNameNS(nsGeneric, 'Value'));
            const keyNode = values.find(function (node) { return node.getAttribute('id') === 'DATA_TYPE_FM'; });
            const ratingNode = values.find(function (node) { return node.getAttribute('id') === 'TITLE_COMPL'; });
            const obsNode = seriesNode.getElementsByTagNameNS(nsGeneric, 'ObsValue')[0];

            if (!keyNode || !ratingNode || !obsNode) {
                return;
            }

            const key = keyNode.getAttribute('value') || '';
            const ratingText = (ratingNode.getAttribute('value') || '').toLowerCase();
            const maturity = parseMaturityFromKey(key);
            const value = parseFloat(obsNode.getAttribute('value'));

            if (maturity === null || Number.isNaN(value)) {
                return;
            }

            const bucket = ratingText.indexOf('triple a') !== -1 ? 'AAA' : ratingText.indexOf('all ratings included') !== -1 ? 'ALL' : null;
            if (!bucket) {
                return;
            }

            if (key.indexOf('SR_') === 0) {
                datasets[bucket].spot.push({ x: maturity, y: value });
            }

            if (key.indexOf('IF_') === 0) {
                datasets[bucket].forward.push({ x: maturity, y: value });
            }
        });

        Object.keys(datasets).forEach(function (ratingKey) {
            datasets[ratingKey].spot.sort(function (a, b) { return a.x - b.x; });
            datasets[ratingKey].forward.sort(function (a, b) { return a.x - b.x; });
        });

        return { datasets: datasets };
    }

    function parseMaturityFromKey(key) {
        const match = key.match(/^(?:SR|IF|PY|PYS_NR)_(?:(\d+)Y)?(?:(\d+)M)?$/);
        if (!match) {
            return null;
        }

        const years = match[1] ? parseFloat(match[1]) : 0;
        const months = match[2] ? parseFloat(match[2]) : 0;
        return years + (months / 12);
    }

    function computeStats(curves) {
        const sampleXs = curves.spot.map(function (point) { return point.x; });
        let maxGap = { x: 0, diff: -Infinity, spot: null, forward: null };

        sampleXs.forEach(function (x) {
            const spot = interpolate(curves.spot, x);
            const forward = interpolate(curves.forward, x);
            const diff = Math.abs(forward - spot);
            if (diff > maxGap.diff) {
                maxGap = { x: x, diff: diff, spot: spot, forward: forward };
            }
        });

        const maxSpot = curves.spot.reduce(function (best, point) {
            return point.y > best.y ? point : best;
        }, curves.spot[0]);

        const maxForward = curves.forward.reduce(function (best, point) {
            return point.y > best.y ? point : best;
        }, curves.forward[0]);

        return {
            maxGap: maxGap,
            maxSpot: maxSpot,
            maxForward: maxForward
        };
    }

    function createChart(datasets) {
        const ctx = document.getElementById('ecbYieldChart').getContext('2d');
        const chartDatasets = [
            {
                key: 'spot-AAA',
                label: 'Spot (AAA)',
                data: datasets.AAA.spot,
                borderColor: colors.AAA.spot,
                backgroundColor: colors.AAA.spot,
                borderWidth: 3,
                fill: false,
                tension: 0.18,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHitRadius: 12,
                hidden: false
            },
            {
                key: 'forward-AAA',
                label: 'Forward istantanea (AAA)',
                data: datasets.AAA.forward,
                borderColor: colors.AAA.forward,
                backgroundColor: colors.AAA.forward,
                borderWidth: 3,
                fill: false,
                tension: 0.18,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHitRadius: 12,
                hidden: false
            },
            {
                key: 'spot-ALL',
                label: 'Spot (All Ratings)',
                data: datasets.ALL.spot,
                borderColor: colors.ALL.spot,
                backgroundColor: colors.ALL.spot,
                borderWidth: 3,
                fill: false,
                tension: 0.18,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHitRadius: 12,
                borderDash: [10, 6],
                hidden: true
            },
            {
                key: 'forward-ALL',
                label: 'Forward istantanea (All Ratings)',
                data: datasets.ALL.forward,
                borderColor: colors.ALL.forward,
                backgroundColor: colors.ALL.forward,
                borderWidth: 3,
                fill: false,
                tension: 0.18,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHitRadius: 12,
                borderDash: [10, 6],
                hidden: true
            }
        ];

        state.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: chartDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: window.innerWidth < 768 ? 'bottom' : 'top',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 10,
                            padding: 14,
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Curva spot e forward istantanea BCE (stima Svensson)',
                        color: '#16324f',
                        font: {
                            size: 18,
                            weight: '700'
                        },
                        padding: {
                            bottom: 18
                        }
                    },
                    annotation: {
                        annotations: {
                            gapLineAAA: buildGapAnnotation('AAA'),
                            gapLineALL: Object.assign(buildGapAnnotation('ALL'), { display: false })
                        }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: function (tooltipItems) {
                                if (!tooltipItems.length) {
                                    return '';
                                }
                                return 'Scadenza ' + formatYears(tooltipItems[0].parsed.x);
                            },
                            beforeBody: function (tooltipItems) {
                                if (!tooltipItems.length) {
                                    return [];
                                }
                                const maturity = tooltipItems[0].parsed.x;
                                const reading = getReading(state.mode, maturity);
                                return [
                                    'Spot S(t): ' + formatPercent(reading.spot),
                                    'Forward f(t): ' + formatPercent(reading.forward),
                                    'Yield implicito ETF fra 1Y: ' + formatPercent(reading.rollYield1Y),
                                    'Rendimento annuo medio ETF (oggi -> t): ' + formatPercent(reading.etfAnnualizedHold)
                                ];
                            },
                            label: function (context) {
                                return context.dataset.label + ': ' + formatPercent(context.parsed.y);
                            },
                            afterBody: function (tooltipItems) {
                                if (!tooltipItems.length) {
                                    return [];
                                }
                                const maturity = tooltipItems[0].parsed.x;
                                const reading = getReading(state.mode, maturity);
                                return [
                                    'Gap forward-spot: ' + formatBasisPoints(reading.forward - reading.spot),
                                    'Pickup ETF vs spot fra 1Y: ' + formatBasisPoints(reading.rollPickup1Y),
                                    'Pickup ETF vs spot su orizzonte t: ' + formatBasisPoints(reading.pickupHoldAnnualized),
                                    'Check identita spot=(1/t)int f: ' + formatPercent(reading.identityAverage)
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: 0,
                        max: 30,
                        title: {
                            display: true,
                            text: 'Scadenza / duration (anni)',
                            color: '#36506b'
                        },
                        grid: {
                            color: 'rgba(22, 50, 79, 0.08)'
                        },
                        ticks: {
                            color: '#4a6177'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Rendimento (%)',
                            color: '#36506b'
                        },
                        grid: {
                            color: 'rgba(22, 50, 79, 0.08)'
                        },
                        ticks: {
                            color: '#4a6177',
                            callback: function (value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    function updateView(mode) {
        state.mode = mode;

        btnAAA.classList.toggle('active', mode === 'AAA');
        btnAll.classList.toggle('active', mode === 'ALL');

        state.chart.data.datasets.forEach(function (dataset) {
            const showAAA = mode === 'AAA' && dataset.key.indexOf('AAA') !== -1;
            const showAll = mode === 'ALL' && dataset.key.indexOf('ALL') !== -1;
            dataset.hidden = !(showAAA || showAll);
        });

        state.chart.options.plugins.annotation.annotations.gapLineAAA.display = mode === 'AAA';
        state.chart.options.plugins.annotation.annotations.gapLineALL.display = mode === 'ALL';
        state.chart.update();

        renderSummary(mode);
        renderInsights(mode);
        renderComparisonTable(mode);
        renderExamples(mode);

        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise();
        }
    }

    function renderSummary(mode) {
        const stats = state.stats[mode];
        const tenYear = getReading(mode, 10);
        const fifteenYear = getReading(mode, 15);
        const label = mode === 'AAA' ? 'Titoli AAA' : 'Tutti i rating';

        summaryMetrics.innerHTML = [
            metricCard('Campione visualizzato', label, 'Il grafico e le interpretazioni numeriche qui sotto sono aggiornati sul paniere selezionato.'),
            metricCard('Massimo divario forward-spot', formatBasisPoints(stats.maxGap.forward - stats.maxGap.spot), 'Il massimo scarto si osserva attorno a ' + formatYears(stats.maxGap.x) + ': spot ' + formatPercent(stats.maxGap.spot) + ', forward ' + formatPercent(stats.maxGap.forward) + '.'),
            metricCard('Massimo spot', formatPercent(stats.maxSpot.y), 'Raggiunto a ' + formatYears(stats.maxSpot.x) + '.'),
            metricCard('Massimo forward', formatPercent(stats.maxForward.y), 'Raggiunto a ' + formatYears(stats.maxForward.x) + '.'),
            metricCard('Pickup annuo ETF a 10 anni', formatBasisPoints(tenYear.pickupHoldAnnualized), 'ETF tenuto oggi -> 10Y: annuo medio ' + formatPercent(tenYear.etfAnnualizedHold) + ' vs bond spot ' + formatPercent(tenYear.spot) + '.'),
            metricCard('Differenza totale a 15 anni', formatSignedPercent(fifteenYear.maturityExcessPct), 'Su base 100: ' + formatSignedEuro(fifteenYear.maturityExcessOn100) + '.')
        ].join('');
    }

    function renderInsights(mode) {
        const tenYear = getReading(mode, 10);
        const fiveYear = getReading(mode, 5);
        const fifteenYear = getReading(mode, 15);
        const datasetName = mode === 'AAA' ? 'curva AAA' : 'curva All Ratings';

        etfInsights.innerHTML = [
            '<article class="insight-card">' +
                '<h3>1. Spot vs forward</h3>' +
                '<p>Sulla ' + datasetName + ', la spot ci dice il rendimento medio annualizzato fino alla scadenza; la forward evidenzia invece il tasso marginale implicito proprio attorno a quella scadenza.</p>' +
                '<p class="mb-0">A 5 anni leggiamo spot ' + formatPercent(fiveYear.spot) + ' e forward ' + formatPercent(fiveYear.forward) + '.</p>' +
            '</article>',
            '<article class="insight-card">' +
                '<h3>2. Confronto pratico oggi -> D</h3>' +
                '<p>Per rispondere alla domanda pratica, qui simuliamo ETF comprato oggi e tenuto per D anni con roll annuale a duration costante.</p>' +
                '<p class="mb-0">Sul 10Y: ETF annuo medio ' + formatPercent(tenYear.etfAnnualizedHold) + ' vs bond spot ' + formatPercent(tenYear.spot) + ', pickup annuo ' + formatBasisPoints(tenYear.pickupHoldAnnualized) + '.</p>' +
            '</article>',
            '<article class="insight-card">' +
                '<h3>3. Effetto cumulato</h3>' +
                '<p>La colonna di differenza totale mostra il confronto dei montanti finali dopo D anni, non solo il gap annualizzato.</p>' +
                '<p class="mb-0">A 15 anni: differenza totale ' + formatSignedPercent(fifteenYear.maturityExcessPct) + ' (' + formatSignedEuro(fifteenYear.maturityExcessOn100) + ' su base 100).</p>' +
            '</article>'
        ].join('');
    }

    function renderComparisonTable(mode) {
        const maturities = [3, 5, 7, 10, 15];
        comparisonTableBody.innerHTML = maturities.map(function (maturity) {
            const reading = getReading(mode, maturity);
            return '<tr>' +
                '<td><strong>' + formatYears(maturity) + '</strong></td>' +
                '<td>' + formatPercent(reading.spot) + '</td>' +
                '<td>' + formatPercent(reading.forward) + '</td>' +
                '<td>' + dualLineMetric('fra 1Y', formatPercent(reading.rollYield1Y), 'oggi -> ' + formatYearsShort(maturity), formatPercent(reading.etfAnnualizedHold)) + '</td>' +
                '<td>' + dualLineMetricStyled('fra 1Y', formatBasisPoints(reading.rollPickup1Y), pickupStyle(reading.rollPickup1Y), ' oggi -> ' + formatYearsShort(maturity), formatBasisPoints(reading.pickupHoldAnnualized), pickupStyle(reading.pickupHoldAnnualized)) + '</td>' +
                '<td>' + maturityDiffMetric(reading) + '</td>' +
                '<td>' + buildInterpretation(reading) + '</td>' +
                '</tr>';
        }).join('');
    }

    function renderExamples(mode) {
        const maturities = [5, 10, 15];
        examplesGrid.innerHTML = maturities.map(function (maturity) {
            const reading = getReading(mode, maturity);
            return '<article class="example-card">' +
                '<h3>Esempio su ' + formatYears(maturity) + '</h3>' +
                '<p><strong>Obbligazione zero-coupon acquistata oggi</strong>: rendimento bloccato pari a ' + formatPercent(reading.spot) + '.</p>' +
                '<p><strong>Forward marginale</strong>: il tratto attorno a ' + formatYears(maturity) + ' prezza ' + formatPercent(reading.forward) + '.</p>' +
                '<p><strong>Identita di curva</strong>: la media da 0 a ' + formatYears(maturity) + ' vale ' + formatPercent(reading.identityAverage) + ' ed e quasi uguale alla spot.</p>' +
                '<p class="mb-0"><strong>ETF duration costante</strong>: rendimento implicito fra 1 anno pari a ' + formatPercent(reading.rollYield1Y) + '; tenuto da oggi a ' + formatYearsShort(maturity) + ' ha annuo medio implicito ' + formatPercent(reading.etfAnnualizedHold) + ', differenza totale ' + formatSignedPercent(reading.maturityExcessPct) + ' (' + formatSignedEuro(reading.maturityExcessOn100) + ' su base 100). ' + buildInterpretation(reading) + '</p>' +
                '</article>';
        }).join('');
    }

    function getReading(mode, maturity) {
        const curves = state.datasets[mode];
        const spot = interpolate(curves.spot, maturity);
        const forward = interpolate(curves.forward, maturity);
        const identityAverage = averageForwardUpTo(curves.forward, maturity);
        const rollYield1Y = averageForwardBetween(curves.forward, 1, 1 + maturity);
        const etfWealthAtMaturity = simulateEtfHoldWealth(curves.forward, maturity);
        const bondWealthAtMaturity = Math.pow(1 + (spot / 100), maturity);
        const etfAnnualizedHold = (Math.pow(etfWealthAtMaturity, 1 / maturity) - 1) * 100;
        const maturityExcessPct = ((etfWealthAtMaturity / bondWealthAtMaturity) - 1) * 100;
        const maturityExcessOn100 = (etfWealthAtMaturity - bondWealthAtMaturity) * 100;
        return {
            maturity: maturity,
            spot: spot,
            forward: forward,
            identityAverage: identityAverage,
            rollYield1Y: rollYield1Y,
            rollPickup1Y: rollYield1Y - spot,
            etfAnnualizedHold: etfAnnualizedHold,
            pickupHoldAnnualized: etfAnnualizedHold - spot,
            maturityExcessPct: maturityExcessPct,
            maturityExcessOn100: maturityExcessOn100
        };
    }

    function simulateEtfHoldWealth(forwardCurve, maturity) {
        let wealth = 1;
        const wholeYears = Math.floor(maturity);
        const fractionalYear = maturity - wholeYears;

        for (let year = 0; year < wholeYears; year += 1) {
            const rollYield = averageForwardBetween(forwardCurve, year, year + maturity);
            wealth *= (1 + (rollYield / 100));
        }

        if (fractionalYear > 1e-9) {
            const rollYield = averageForwardBetween(forwardCurve, wholeYears, wholeYears + maturity);
            wealth *= Math.pow(1 + (rollYield / 100), fractionalYear);
        }

        return wealth;
    }

    function averageForwardUpTo(curve, maturity) {
        if (!curve.length || maturity <= 0) {
            return curve.length ? curve[0].y : 0;
        }

        const points = [{ x: 0, y: interpolate(curve, 0) }];
        curve.forEach(function (point) {
            if (point.x > 0 && point.x < maturity) {
                points.push({ x: point.x, y: point.y });
            }
        });
        points.push({ x: maturity, y: interpolate(curve, maturity) });
        points.sort(function (a, b) { return a.x - b.x; });

        let area = 0;
        for (let i = 1; i < points.length; i += 1) {
            const left = points[i - 1];
            const right = points[i];
            area += (right.x - left.x) * ((left.y + right.y) / 2);
        }
        return area / maturity;
    }

    function averageForwardBetween(curve, start, end) {
        if (!curve.length || end <= start) {
            return curve.length ? curve[0].y : 0;
        }

        const points = [{ x: start, y: interpolate(curve, start) }];
        curve.forEach(function (point) {
            if (point.x > start && point.x < end) {
                points.push({ x: point.x, y: point.y });
            }
        });
        points.push({ x: end, y: interpolate(curve, end) });
        points.sort(function (a, b) { return a.x - b.x; });

        let area = 0;
        for (let i = 1; i < points.length; i += 1) {
            const left = points[i - 1];
            const right = points[i];
            area += (right.x - left.x) * ((left.y + right.y) / 2);
        }
        return area / (end - start);
    }

    function interpolate(curve, x) {
        if (!curve.length) {
            return 0;
        }

        if (x <= curve[0].x) {
            return curve[0].y;
        }

        if (x >= curve[curve.length - 1].x) {
            return curve[curve.length - 1].y;
        }

        for (let i = 1; i < curve.length; i += 1) {
            const left = curve[i - 1];
            const right = curve[i];
            if (x === right.x) {
                return right.y;
            }
            if (x < right.x) {
                const slope = (right.y - left.y) / (right.x - left.x);
                return left.y + slope * (x - left.x);
            }
        }

        return curve[curve.length - 1].y;
    }

    function buildGapAnnotation(mode) {
        const stats = state.stats[mode];
        const palette = colors[mode];
        return {
            type: 'line',
            xMin: stats.maxGap.x,
            xMax: stats.maxGap.x,
            borderColor: palette.annotation,
            borderWidth: 3,
            label: {
                enabled: true,
                backgroundColor: mode === 'AAA' ? '#d97706' : '#7c3aed',
                color: '#ffffff',
                content: 'Max gap ' + (mode === 'AAA' ? 'AAA' : 'All') + ' @ ' + formatYears(stats.maxGap.x),
                position: 'start',
                yAdjust: -10
            }
        };
    }

    function metricCard(label, value, detail) {
        return '<article class="metric-card">' +
            '<div class="metric-label">' + label + '</div>' +
            '<div class="metric-value">' + value + '</div>' +
            '<div class="metric-detail">' + detail + '</div>' +
            '</article>';
    }

    function buildInterpretation(reading) {
        const diff = reading.forward - reading.spot;
        const holdPickup = reading.pickupHoldAnnualized;

        if (holdPickup > 0.20) {
            return 'Su un confronto oggi fino a scadenza, l\'ETF mostra un vantaggio annuo medio sensibile rispetto al bond.';
        }
        if (holdPickup > 0.08) {
            return 'Su un confronto oggi fino a scadenza, l\'ETF mostra un vantaggio annuo medio moderato rispetto al bond.';
        }
        if (holdPickup < -0.08) {
            return 'Su un confronto oggi fino a scadenza, il bond risulta piu favorevole dell\'ETF a duration costante.';
        }
        if (diff < -0.12) {
            return 'La forward e sotto la spot e il beneficio di roll si comprime: la parte lunga della curva e meno favorevole.';
        }
        return 'Su orizzonte oggi fino a scadenza i due strumenti risultano vicini secondo il modello.';
    }

    function formatPercent(value) {
        return value.toFixed(2) + '%';
    }

    function formatBasisPoints(value) {
        const bp = value * 100;
        const sign = bp > 0 ? '+' : '';
        return sign + bp.toFixed(0) + ' bp';
    }

    function formatYears(value) {
        if (Math.abs(value - Math.round(value)) < 0.001) {
            return Math.round(value) + ' anni';
        }
        return value.toFixed(1).replace('.', ',') + ' anni';
    }

    function formatYearsShort(value) {
        if (Math.abs(value - Math.round(value)) < 0.001) {
            return Math.round(value) + 'Y';
        }
        return value.toFixed(1).replace('.', ',') + 'Y';
    }

    function dualLineMetric(labelOne, valueOne, labelTwo, valueTwo) {
        return '<div><strong>' + labelOne + ':</strong> ' + valueOne + '</div>' +
            '<div class="small-muted"><strong>' + labelTwo + ':</strong> ' + valueTwo + '</div>';
    }

    function dualLineMetricStyled(labelOne, valueOne, styleOne, labelTwo, valueTwo, styleTwo) {
        return '<div><strong>' + labelOne + ':</strong> <span style="' + styleOne + '">' + valueOne + '</span></div>' +
            '<div class="small-muted"><strong>' + labelTwo + ':</strong> <span style="' + styleTwo + '">' + valueTwo + '</span></div>';
    }

    function maturityDiffMetric(reading) {
        const style = pickupStyle(reading.maturityExcessPct / 100);
        const pct = formatSignedPercent(reading.maturityExcessPct);
        const on100 = formatSignedEuro(reading.maturityExcessOn100);
        return '<div><span style="' + style + '">' + pct + '</span></div>' +
            '<div class="small-muted">su base 100: ' + on100 + '</div>';
    }

    function pickupStyle(value) {
        if (value > 0.02) {
            return 'color:#0f766e;font-weight:700;';
        }
        if (value < -0.02) {
            return 'color:#b91c1c;font-weight:700;';
        }
        return 'color:#6b7280;font-weight:700;';
    }

    function formatSignedPercent(value) {
        const sign = value > 0 ? '+' : '';
        return sign + value.toFixed(2) + '%';
    }

    function formatSignedEuro(value) {
        const sign = value > 0 ? '+' : '';
        return sign + value.toFixed(2) + '&euro;';
    }
});
