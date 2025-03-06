/* filepath: /c:/GITHUB/FireSWR/js/iwmyr.js */
document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('investmentChart').getContext('2d');
    let chartInstance = null;
    const oneShotRadio = document.getElementById('oneShot');
    const periodicRadio = document.getElementById('periodic');
    const annualDeposit = document.getElementById('annualDeposit');
    const investmentPeriod = document.getElementById('investmentPeriod');
    const annualReturn = document.getElementById('annualReturn');
    const annualInflation = document.getElementById('annualInflation');
    const totalReturnValue = document.getElementById('totalReturnValue');

    function formatEuro(value) {
        return new Intl.NumberFormat('it-IT',
            {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
    }

    function calcolaInflazione(inflazioneAnnuo, anni) {
        return Math.pow(1 + inflazioneAnnuo, anni) - 1;
    }

    function calculateInvestment() {
        let currentYear = new Date().getFullYear();

        const type = document.querySelector('input[name="investmentType"]:checked').value;
        const deposit = parseFloat(annualDeposit.value);
        const period = parseInt(investmentPeriod.value);
        const returnRate = parseFloat(annualReturn.value) / 100;
        const inflationRate = parseFloat(annualInflation.value) / 100;

        let capital = 0;
        let totalReturn = 0;
        let totalNominalDeposit = 0;

        const labels = [];
        const realCapitalData = [];
        const inflationData = [];
        const taxesData = [];        
        const realNetCapitalGainData = [];
        const inflationOnCapitalGainData = [];
        const periodicDeposit = type === 'periodic' ? deposit : 0;

        //year zero
        realCapitalData.push(deposit);
        totalNominalDeposit += deposit;
        capital += deposit;
        inflationData.push(0);
        taxesData.push(0);        
        realNetCapitalGainData.push(0);
        inflationOnCapitalGainData.push(0);
        labels.push(`${currentYear++}`);

        for (let year = 1; year <= period; year++) {            
            labels.push(`${currentYear++}`);
            capital += periodicDeposit;
            totalNominalDeposit += periodicDeposit;
            const nominalCapitalGain = capital * returnRate;            
            totalReturn += nominalCapitalGain;
            const currentCapitalTax = nominalCapitalGain * 0.26;
            realCapitalData.push((realCapitalData[year - 1] + periodicDeposit) / (1 + inflationRate));
            inflationData.push(totalNominalDeposit - realCapitalData[year]);
            taxesData.push(currentCapitalTax + taxesData[year - 1]);
            inflationOnCapitalGainData.push((totalReturn - (totalReturn * 0.26)) * calcolaInflazione(inflationRate, year));
            realNetCapitalGainData.push(totalReturn - taxesData[year] - inflationOnCapitalGainData[year]);
            capital += nominalCapitalGain;
        }

        // Update the value of totalReturn in the HTML element with icons
        totalReturnValue.innerHTML = `
            <table class="table table-bordered">
                <tbody>
                    <tr>
                        <td><i class="fas fa-coins"></i> Totale versato:</td>
                        <td>${formatEuro(totalNominalDeposit)}</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-chart-line"></i> Total Return lordo:</td>
                        <td>${formatEuro(totalReturn)}</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-piggy-bank"></i> Capitale reale:</td>
                        <td>${formatEuro(realCapitalData[realCapitalData.length - 1])}</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-chart-pie"></i> Inflazione:</td>
                        <td>${formatEuro(inflationData[inflationData.length - 1])}</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-money-bill-wave"></i> Tasse sul gain:</td>
                        <td>${formatEuro(taxesData[taxesData.length - 1])}</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-balance-scale"></i> Inflazione sul gain:</td>
                        <td>${formatEuro(inflationOnCapitalGainData[inflationOnCapitalGainData.length - 1])}</td>
                    </tr>
                    <tr>
                        <td><i class="fas fa-coins"></i> Gain netto reale:</td>
                        <td>${formatEuro(realNetCapitalGainData[realNetCapitalGainData.length - 1])}</td>
                    </tr>
                </tbody>
            </table>

            <p> Quindi alla fine si avrà un lordo totale di ${formatEuro(totalReturn + totalNominalDeposit)} ma il valore reale di questi soldi al netto di tasse
            e inflazione sarà solamente ${formatEuro(realNetCapitalGainData[realNetCapitalGainData.length - 1]+realCapitalData[realCapitalData.length - 1])} </p>
        `;

        return {
            labels,
            datasets: [
                {
                    label: 'Capitale versato (Al netto dell\'inflazione)',
                    data: realCapitalData,
                    backgroundColor: 'rgb(39, 71, 84)', 
                    borderWidth: 1
                },
                {
                    label: 'Inflazione sul capitale versato',
                    data: inflationData,
                    backgroundColor: 'rgb(244, 164, 98)',                    
                    borderWidth: 1
                },
                {
                    label: 'Tasse sul capital gain',
                    data: taxesData,
                    backgroundColor: 'rgb(231, 110, 80)',                    
                    borderWidth: 1
                },
                {
                    label: 'Inflazione sul capital gain',
                    data: inflationOnCapitalGainData,
                    backgroundColor: 'rgb(232, 196, 104)',
                    borderWidth: 1
                },
                {
                    label: 'Capital Gain al netto di inflazione e tasse',
                    data: realNetCapitalGainData,
                    backgroundColor: 'rgb(42, 157, 144)',
                    borderWidth: 1
                }
            ]
        };
    }

    function renderChart() {
        const data = calculateInvestment();
        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: data.datasets
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true
                    }
                }
            }
        });
    }

    oneShotRadio.addEventListener('change', renderChart);
    periodicRadio.addEventListener('change', renderChart);
    annualDeposit.addEventListener('input', renderChart);
    investmentPeriod.addEventListener('input', renderChart);
    annualReturn.addEventListener('input', renderChart);
    annualInflation.addEventListener('input', renderChart);

    renderChart();
});