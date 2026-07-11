"use strict";

const fields = {
    initialCapital: { range: "initialCapitalRange", number: "initialCapitalNumber" },
    years: { range: "yearsRange", number: "yearsNumber" },
    totalReturn: { range: "totalReturnRange", number: "totalReturnNumber" },
    dividendYield: { range: "dividendYieldRange", number: "dividendYieldNumber" },
    taxRate: { range: "taxRateRange", number: "taxRateNumber" }
};

const presets = {
    msci: {
        initialCapital: 100000,
        years: 30,
        totalReturn: 8,
        dividendYield: 2,
        taxRate: 26
    },
    ftse: {
        initialCapital: 100000,
        years: 30,
        totalReturn: 8,
        dividendYield: 3,
        taxRate: 26
    }
};

const charts = {
    wealth: null,
    dividends: null,
    loss: null
};

const euroFormatter = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
});

const euroDetailedFormatter = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("it-IT", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const terFormatter = new Intl.NumberFormat("it-IT", {
    style: "percent",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
});

document.addEventListener("DOMContentLoaded", () => {
    wireInputs();
    wirePresets();
    loadDisclaimer();
    updateSimulation();
});

function wireInputs() {
    Object.entries(fields).forEach(([fieldName, ids]) => {
        const rangeInput = document.getElementById(ids.range);
        const numberInput = document.getElementById(ids.number);

        rangeInput.addEventListener("input", () => {
            numberInput.value = rangeInput.value;
            updateSimulation();
        });

        numberInput.addEventListener("input", () => {
            syncRangeFromNumber(fieldName);
            updateSimulation();
        });
    });
}

function wirePresets() {
    document.querySelectorAll("[data-preset]").forEach((button) => {
        button.addEventListener("click", () => {
            applyPreset(button.dataset.preset);
        });
    });
}

function applyPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) return;

    Object.entries(preset).forEach(([fieldName, value]) => {
        const ids = fields[fieldName];
        document.getElementById(ids.number).value = value;
        document.getElementById(ids.range).value = clampToRange(value, document.getElementById(ids.range));
    });

    updateSimulation();
}

function syncRangeFromNumber(fieldName) {
    const ids = fields[fieldName];
    const numberValue = readNumber(ids.number, 0);
    const rangeInput = document.getElementById(ids.range);
    rangeInput.value = clampToRange(numberValue, rangeInput);
}

function clampToRange(value, input) {
    const min = Number(input.min);
    const max = Number(input.max);
    return Math.min(Math.max(value, min), max);
}

function readNumber(id, fallback) {
    const value = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(value) ? value : fallback;
}

function readParameters() {
    const initialCapital = Math.max(0, readNumber(fields.initialCapital.number, 100000));
    const years = Math.max(1, Math.round(readNumber(fields.years.number, 30)));
    const totalReturn = readNumber(fields.totalReturn.number, 8) / 100;
    const dividendYield = Math.max(0, readNumber(fields.dividendYield.number, 3) / 100);
    const taxRate = Math.min(Math.max(readNumber(fields.taxRate.number, 26) / 100, 0), 1);

    return { initialCapital, years, totalReturn, dividendYield, taxRate };
}

function updateSimulation() {
    const params = readParameters();
    const simulation = simulateDividendTaxDrag(params);
    const equivalentTer = calculateEquivalentTer(params, simulation.distributionFinal);

    renderWarning(params);
    renderMetrics(params, simulation, equivalentTer);
    renderCharts(simulation);
}

function simulateDividendTaxDrag(params) {
    const { initialCapital, years, totalReturn, dividendYield, taxRate } = params;
    const priceGrowth = totalReturn - dividendYield;

    let accumulationCapital = initialCapital;
    let distributionCapital = initialCapital;
    let totalTaxes = 0;
    let totalGrossDividends = 0;
    let totalNetDividends = 0;

    const labels = ["Anno 0"];
    const accumulationSeries = [initialCapital];
    const distributionSeries = [initialCapital];
    const grossDividendsSeries = [];
    const taxesSeries = [];
    const netDividendsSeries = [];
    const cumulativeLossSeries = [0];

    for (let year = 1; year <= years; year += 1) {
        // Scenario ideale ad accumulazione: l'intero rendimento resta investito ogni anno.
        accumulationCapital *= 1 + totalReturn;

        // Scenario a distribuzione: il prezzo cresce solo per la parte non distribuita.
        const startingDistributionCapital = distributionCapital;
        const grossDividend = startingDistributionCapital * dividendYield;
        const tax = grossDividend * taxRate;
        const netDividend = grossDividend - tax;

        distributionCapital = startingDistributionCapital
            + startingDistributionCapital * priceGrowth
            + netDividend;

        totalTaxes += tax;
        totalGrossDividends += grossDividend;
        totalNetDividends += netDividend;

        labels.push(`Anno ${year}`);
        accumulationSeries.push(accumulationCapital);
        distributionSeries.push(distributionCapital);
        grossDividendsSeries.push(grossDividend);
        taxesSeries.push(tax);
        netDividendsSeries.push(netDividend);
        cumulativeLossSeries.push(accumulationCapital - distributionCapital);
    }

    return {
        labels,
        barLabels: Array.from({ length: years }, (_, index) => `Anno ${index + 1}`),
        accumulationFinal: accumulationCapital,
        distributionFinal: distributionCapital,
        totalTaxes,
        totalGrossDividends,
        totalNetDividends,
        accumulationSeries,
        distributionSeries,
        grossDividendsSeries,
        taxesSeries,
        netDividendsSeries,
        cumulativeLossSeries
    };
}

function calculateEquivalentTer(params, targetFinalCapital, benchmarkFinalCapital = null) {
    const { initialCapital, years, totalReturn } = params;
    const baselineFinalCapital = benchmarkFinalCapital ?? initialCapital * Math.pow(1 + totalReturn, years);

    if (initialCapital <= 0 || years <= 0 || baselineFinalCapital <= 0 || targetFinalCapital <= 0) {
        return 0;
    }

    if (targetFinalCapital >= baselineFinalCapital) {
        return 0;
    }

    const ratio = targetFinalCapital / baselineFinalCapital;
    return Math.max((1 + totalReturn) * (1 - Math.pow(ratio, 1 / years)), 0);
}

function renderWarning(params) {
    const warning = document.getElementById("warning");
    const priceGrowth = params.totalReturn - params.dividendYield;

    if (priceGrowth < 0) {
        warning.textContent = "Nota: il Dividend Yield supera il rendimento totale, quindi la crescita del prezzo risulta negativa.";
        warning.classList.add("visible");
        return;
    }

    warning.textContent = "";
    warning.classList.remove("visible");
}

function renderMetrics(params, simulation, equivalentTer) {
    const absoluteDifference = simulation.accumulationFinal - simulation.distributionFinal;
    const percentageDifference = simulation.accumulationFinal !== 0
        ? absoluteDifference / simulation.accumulationFinal
        : 0;
    const finalTax = calculateFinalTaxScenario(params, simulation);
    const equivalentTerAfterFinalTax = calculateEquivalentTer(
        params,
        finalTax.distributionAfterTax,
        finalTax.accumulationAfterTax
    );
    const terReductionRatio = equivalentTer > 0
        ? Math.max(0, Math.min(1, 1 - equivalentTerAfterFinalTax / equivalentTer))
        : 0;

    setText("accumulationFinal", formatEuro(simulation.accumulationFinal));
    setText("distributionFinal", formatEuro(simulation.distributionFinal));
    setText("absoluteDifference", formatEuroDetailed(absoluteDifference));
    setText("percentageDifference", percentFormatter.format(percentageDifference));
    setText("totalTaxes", formatEuroDetailed(simulation.totalTaxes));
    setText("totalGrossDividends", formatEuroDetailed(simulation.totalGrossDividends));
    setText("totalNetDividends", formatEuroDetailed(simulation.totalNetDividends));
    setText("equivalentTer", terFormatter.format(equivalentTer));

    document.getElementById("terExplanation").textContent =
        `Prima della tassazione finale, la tassazione annuale dei dividendi produce un effetto sul patrimonio equivalente a un costo ricorrente di ${terFormatter.format(equivalentTer)}.`;

    setText("equivalentTerBeforeFinalTax", terFormatter.format(equivalentTer));
    setText("equivalentTerAfterFinalTax", terFormatter.format(equivalentTerAfterFinalTax));
    setText("terReductionAfterFinalTax", percentFormatter.format(terReductionRatio));
    setText("accumulationAfterFinalTax", formatEuroDetailed(finalTax.accumulationAfterTax));
    setText("distributionAfterFinalTax", formatEuroDetailed(finalTax.distributionAfterTax));
    setText("netFinalDifference", formatEuroDetailed(finalTax.netDifference));

    document.getElementById("finalTaxExplanation").textContent =
        `Prima della liquidazione finale il divario tra gli scenari è ${formatEuroDetailed(absoluteDifference)} e corrisponde a un TER equivalente di ${terFormatter.format(equivalentTer)}. Dopo aver tassato anche la plusvalenza finale, il divario residuo scende a ${formatEuroDetailed(finalTax.netDifference)} e il TER equivalente residuo si riduce a ${terFormatter.format(equivalentTerAfterFinalTax)} (${percentFormatter.format(terReductionRatio)} in meno).`;

    document.title = `TER equivalente ${terFormatter.format(equivalentTer)} - Dividendi a distribuzione`;
}

function calculateFinalTaxScenario(params, simulation) {
    const { initialCapital, taxRate } = params;

    // Accumulazione: non ha pagato imposte durante il percorso, quindi tassa la plusvalenza finale.
    const accumulationTaxableGain = Math.max(simulation.accumulationFinal - initialCapital, 0);
    const accumulationFinalTax = accumulationTaxableGain * taxRate;
    const accumulationAfterTax = simulation.accumulationFinal - accumulationFinalTax;

    // Distribuzione: i dividendi lordi sono gia stati tassati. I dividendi netti reinvestiti
    // aumentano il capitale fiscalmente investito, quindi qui si tassa solo la plusvalenza residua.
    const distributionTaxBasis = initialCapital + simulation.totalNetDividends;
    const distributionTaxableGain = Math.max(simulation.distributionFinal - distributionTaxBasis, 0);
    const distributionFinalTax = distributionTaxableGain * taxRate;
    const distributionAfterTax = simulation.distributionFinal - distributionFinalTax;

    const grossDifference = simulation.accumulationFinal - simulation.distributionFinal;
    const netDifference = accumulationAfterTax - distributionAfterTax;
    const dragReductionRatio = grossDifference > 0
        ? Math.max(0, Math.min(1, 1 - netDifference / grossDifference))
        : 0;

    return {
        accumulationAfterTax,
        distributionAfterTax,
        accumulationFinalTax,
        distributionFinalTax,
        netDifference,
        dragReductionRatio
    };
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function formatEuro(value) {
    return Math.abs(value) >= 1000 ? euroFormatter.format(value) : euroDetailedFormatter.format(value);
}

function formatEuroDetailed(value) {
    return euroDetailedFormatter.format(value);
}

function renderCharts(simulation) {
    renderWealthChart(simulation);
    renderDividendChart(simulation);
    renderLossChart(simulation);
}

function renderWealthChart(simulation) {
    const ctx = document.getElementById("wealthChart");

    charts.wealth = replaceChart(charts.wealth, ctx, {
        type: "line",
        data: {
            labels: simulation.labels,
            datasets: [
                {
                    label: "Accumulo",
                    data: simulation.accumulationSeries,
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37, 99, 235, 0.08)",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25
                },
                {
                    label: "Distribuzione",
                    data: simulation.distributionSeries,
                    borderColor: "#0f766e",
                    backgroundColor: "rgba(15, 118, 110, 0.08)",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25
                }
            ]
        },
        options: baseChartOptions()
    });
}

function renderDividendChart(simulation) {
    const ctx = document.getElementById("dividendChart");

    charts.dividends = replaceChart(charts.dividends, ctx, {
        type: "bar",
        data: {
            labels: simulation.barLabels,
            datasets: [
                {
                    label: "Dividendi lordi",
                    data: simulation.grossDividendsSeries,
                    backgroundColor: "rgba(37, 99, 235, 0.72)"
                },
                {
                    label: "Tasse",
                    data: simulation.taxesSeries,
                    backgroundColor: "rgba(185, 28, 28, 0.72)"
                },
                {
                    label: "Dividendi reinvestiti",
                    data: simulation.netDividendsSeries,
                    backgroundColor: "rgba(15, 118, 110, 0.72)"
                }
            ]
        },
        options: baseChartOptions()
    });
}

function renderLossChart(simulation) {
    const ctx = document.getElementById("lossChart");

    charts.loss = replaceChart(charts.loss, ctx, {
        type: "line",
        data: {
            labels: simulation.labels,
            datasets: [
                {
                    label: "Perdita cumulata",
                    data: simulation.cumulativeLossSeries,
                    borderColor: "#b91c1c",
                    backgroundColor: "rgba(185, 28, 28, 0.16)",
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25
                }
            ]
        },
        options: baseChartOptions()
    });
}

function replaceChart(existingChart, canvas, config) {
    if (existingChart) {
        existingChart.destroy();
    }

    return new Chart(canvas, config);
}

function baseChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false
        },
        plugins: {
            legend: {
                labels: {
                    boxWidth: 14,
                    usePointStyle: true
                }
            },
            tooltip: {
                callbacks: {
                    label(context) {
                        return `${context.dataset.label}: ${formatEuroDetailed(context.parsed.y)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 10
                }
            },
            y: {
                beginAtZero: false,
                ticks: {
                    callback(value) {
                        return formatEuro(value);
                    }
                }
            }
        }
    };
}

function loadDisclaimer() {
    fetch("../html/disclaimer.html")
        .then((response) => response.text())
        .then((html) => {
            document.getElementById("disclaimer-container").innerHTML = html;
        })
        .catch(() => {
            document.getElementById("disclaimer-container").innerHTML =
                "<div class=\"disclaimer-fallback\">Disclaimer non disponibile. Verificare il file html/disclaimer.html.</div>";
        });
}
