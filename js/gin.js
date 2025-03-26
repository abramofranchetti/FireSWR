document.addEventListener('DOMContentLoaded', function () {
    const dailyAmount = document.getElementById('dailyAmount');
    dailyAmount.addEventListener('input', function () {
        document.getElementById('dailyAmountValue').textContent = dailyAmount.value;
        updateChart();
        updateAmounts();
    });
    let step = 25000;

    let ctx = document.getElementById('interestChart').getContext('2d');
    let chart;

    function formatEuro(value) {
        return new Intl.NumberFormat('it-IT',
            {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
    }

    function updateAmounts() {
        const dailyAmount = document.getElementById('dailyAmount').value;
        document.getElementById('dailyAmountValue').textContent = formatEuro(dailyAmount);
        document.getElementById('monthlyAmountValue').textContent = formatEuro(dailyAmount * 31);
        document.getElementById('yearlyAmountValue').textContent = formatEuro(dailyAmount * 365);
    }

    function calculateInterest(dailyAmount) {
        let yearlyAmount = dailyAmount * 365;
        let capital = [];
        let numericCapital = [];
        let interest = [];

        for (let cap = 100000; cap <= 1200000; cap += step) {
            capital.push(formattaEuro(cap));
            numericCapital.push(cap);
            interest.push(((yearlyAmount / cap) * 100));
        }

        return { capital, interest, numericCapital };
    }


    // Funzione per formattare le percentuali
    function formatPercent(value) {
        return value.toFixed(1) + '%';
    }

    function formattaEuro(valore) {
        if (valore >= 1000000) {
            return (valore / 1000000).toFixed(1) + 'M';
        } else if (valore >= 1000) {
            return (valore / 1000).toFixed(0) + 'K';
        } else {
            return valore.toString();
        }
    }
    function createChart() {
        let { capital, interest, numericCapital } = calculateInterest(50);

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: capital,
                datasets: [{
                    label: 'Interesse netto annuo (%)',
                    data: interest,
                    borderColor: 'blue',
                    fill: false,
                    tension: 0.5
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: { display: true, text: 'Patrimonio investito (€)' },
                    },
                    y: {
                        title: { display: true, text: 'Interesse netto annuo (%)' },
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    annotation: {
                        annotations: {
                            box1: { type: 'box', xMin: 100000 / step - 2, xMax: 200000 / step - 2, backgroundColor: 'rgba(128, 128, 128, 0.3)', label: { content: 'Investimenti Speculativi', position: 'center', display: true, rotation: -90, color: 'blue', textStrokeColor: 'black', font: { size: 14, weight: 'bold' } } },
                            box2: { type: 'box', xMin: 200000 / step - 2, xMax: 500000 / step - 2, backgroundColor: 'rgba(255, 0, 0, 0.2)', label: { content: 'Azionario', position: 'center', display: true, rotation: -90, color: 'blue', textStrokeColor: 'black', font: { size: 14, weight: 'bold' } } },
                            box3: { type: 'box', xMin: 500000 / step - 2, xMax: 700000 / step - 2, backgroundColor: 'rgba(255, 165, 0, 0.2)', label: { content: 'Bond High Yield', position: 'center', display: true, rotation: -90, color: 'blue', textStrokeColor: 'black', font: { size: 14, weight: 'bold' } } },
                            box4: { type: 'box', xMin: 700000 / step - 2, xMax: 900000 / step - 2, backgroundColor: 'rgba(0, 0, 255, 0.2)', label: { content: 'Bond Governativi', position: 'center', display: true, rotation: -90, color: 'blue', textStrokeColor: 'black', font: { size: 14, weight: 'bold' } } },
                            box5: { type: 'box', xMin: 900000 / step - 2, xMax: 1200000 / step - 2, backgroundColor: 'rgba(0, 128, 0, 0.2)', label: { content: 'Conto Deposito', position: 'center', display: true, rotation: -90, color: 'blue', textStrokeColor: 'black', font: { size: 14, weight: 'bold' } } }
                        }
                    }
                }
            }
        });
    }

    function updateChart() {
        let dailyAmount = document.getElementById('dailyAmount').value;
        let { capital, interest, numericCapital } = calculateInterest(dailyAmount);

        chart.data.labels = capital;
        chart.data.datasets[0].data = interest;

        let capitaleNecessarioPer12Percento = calcolaCapitale(dailyAmount, 12);
        let capitaleNecessarioPer4Percento = calcolaCapitale(dailyAmount, 4);
        let capitaleNecessarioPer25Percento = calcolaCapitale(dailyAmount, 2.5);
        let capitaleNecessarioPer2Percento = calcolaCapitale(dailyAmount, 2);
        let indexCapitaleNecessario12Percento = numericCapital.findIndex(cap => cap >= capitaleNecessarioPer12Percento);
        let indexCapitaleNecessario4Percento = numericCapital.findIndex(cap => cap >= capitaleNecessarioPer4Percento);
        let indexCapitaleNecessario25Percento = numericCapital.findIndex(cap => cap >= capitaleNecessarioPer25Percento);
        let indexCapitaleNecessario2Percento = numericCapital.findIndex(cap => cap >= capitaleNecessarioPer2Percento);


        // Calcola dinamicamente le posizioni delle label
        let annotations = chart.options.plugins.annotation.annotations;

        if (indexCapitaleNecessario12Percento > 0) { //speculativi
            annotations.box1.xMin = 0;
            annotations.box1.xMax = indexCapitaleNecessario12Percento;
            annotations.box1.display = true;
        } else {
            annotations.box1.display = false;
        }

        if (indexCapitaleNecessario12Percento > 0) { //azionario
            annotations.box2.xMin = indexCapitaleNecessario12Percento;
            annotations.box2.xMax = indexCapitaleNecessario4Percento > 0 ? indexCapitaleNecessario4Percento : capital.length - 1;
            annotations.box2.display = true;
        } else {
            if (indexCapitaleNecessario4Percento > 0) {
                annotations.box2.xMin = 0;
                annotations.box2.xMax = indexCapitaleNecessario4Percento;
                annotations.box2.display = true;
            }
            else {
                annotations.box2.display = false;
            }
        }

        if (indexCapitaleNecessario4Percento > 0) { //high yield
            annotations.box3.xMin = indexCapitaleNecessario4Percento;
            annotations.box3.xMax = indexCapitaleNecessario25Percento > 0 ? indexCapitaleNecessario25Percento : capital.length - 1;
            annotations.box3.display = true;
        } else {
            if (indexCapitaleNecessario25Percento > 0) {
                annotations.box3.xMin = 0;
                annotations.box3.xMax = indexCapitaleNecessario25Percento;
                annotations.box3.display = true;
            }
            else {
                annotations.box3.display = false;
            }
        }

        if (indexCapitaleNecessario25Percento > 0) { //governativi
            annotations.box4.xMin = indexCapitaleNecessario25Percento;
            annotations.box4.xMax = indexCapitaleNecessario2Percento > 0 ? indexCapitaleNecessario2Percento : capital.length - 1;
            annotations.box4.display = true;
        } else {
            if (indexCapitaleNecessario2Percento > 0) {
                annotations.box4.xMin = 0;
                annotations.box4.xMax = indexCapitaleNecessario2Percento;
                annotations.box4.display = true;
            }
            else {
                annotations.box4.display = false;
            }
        }

        if (indexCapitaleNecessario2Percento > 0) { //conto deposito
            annotations.box5.xMin = indexCapitaleNecessario2Percento;
            annotations.box5.xMax = capital.length - 1;
            annotations.box5.display = true;
        } else {
            annotations.box5.display = false;
        }

        chart.update();
    }
    function calcolaCapitale(renditaGiornaliera, interesseAnnuale) {
        if (interesseAnnuale <= 0) {
            throw new Error("Il tasso di interesse deve essere maggiore di zero.");
        }

        let renditaAnnua = renditaGiornaliera * 365;
        let tasso = interesseAnnuale / 100;
        let capitaleNecessario = renditaAnnua / tasso;

        return capitaleNecessario.toFixed(2);
    }

    createChart();
    updateChart();
    updateAmounts();
});
