document.addEventListener('DOMContentLoaded', function () {
    const frequencyInput = document.getElementById('frequency');
    const amountInput = document.getElementById('amount');
    const commissionInput = document.getElementById('commission');
    const terInput = document.getElementById('ter');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const resultsTable = document.getElementById('resultsTable');
    const ctx = document.getElementById('pacChart').getContext('2d');
    const commissionPercentageLabel = document.getElementById('commissionPercentage');
    const terPercentageLabel = document.getElementById('terPercentage');

    // inizializza etichette percentuali
    const initAmount = parseFloat(amountInput.value);
    const initCommission = parseFloat(commissionInput.value);
    commissionPercentageLabel.textContent = `Percentuale: ${(initCommission / initAmount * 100).toFixed(2)}%`;
    terPercentageLabel.textContent = `Percentuale annuale: ${parseFloat(terInput.value).toFixed(2)}%`;

    let chart;

    // Frequenze in giorni
    const frequencies = {
        monthly: 30,
        quarterly: 90,
        yearly: 365,
    };

    // Carica i dati SP500
    fetch('json/sp500.json')
        .then(response => response.json())
        .then(data => {
            const prices = data.map(entry => parseFloat(entry.Close));
            const dates = data.map(entry => entry.Date);
            
            // Imposta i limiti delle date
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];
            startDateInput.min = minDate;
            startDateInput.max = maxDate;
            endDateInput.min = minDate;
            endDateInput.max = maxDate;

            // Imposta i valori predefiniti (ultimi 10 anni)
            const defaultStartDate = new Date(maxDate);
            defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 10);
            startDateInput.value = defaultStartDate.toISOString().split('T')[0];
            endDateInput.value = maxDate;

            updateSimulation(prices, dates);
        });

    // Aggiorna la simulazione quando cambiano i valori
    [frequencyInput, amountInput, commissionInput, terInput, startDateInput, endDateInput].forEach(input => {
        input.addEventListener('input', () => {
            // Aggiorna la percentuale di commissione
            if (input === commissionInput || input === amountInput) {
                const amount = parseFloat(amountInput.value);
                const commission = parseFloat(commissionInput.value);
                const percentage = (commission / amount) * 100;
                commissionPercentageLabel.textContent = `Percentuale: ${percentage.toFixed(2)}%`;
            }
            // Aggiorna etichetta TER
            if (input === terInput) {
                const ter = parseFloat(terInput.value);
                terPercentageLabel.textContent = `Percentuale annuale: ${ter.toFixed(2)}%`;
            }

            // Aggiorna la simulazione
            fetch('json/sp500.json')
                .then(response => response.json())
                .then(data => {
                    const prices = data.map(entry => parseFloat(entry.Close));
                    const dates = data.map(entry => entry.Date);
                    updateSimulation(prices, dates);
                });
        });
    });

    function updateSimulation(prices, dates) {
        const frequency = frequencies[frequencyInput.value];
        const amount = parseFloat(amountInput.value);
        const commission = parseFloat(commissionInput.value);
        const ter = parseFloat(terInput.value) / 100; // annual fraction
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);

        // Filtra i dati in base alle date selezionate
        const filteredData = dates
            .map((date, index) => ({ date: new Date(date), price: prices[index] }))
            .filter(entry => entry.date >= startDate && entry.date <= endDate);

        const filteredPrices = filteredData.map(entry => entry.price);
        const filteredDates = filteredData.map(entry => entry.date.toISOString().split('T')[0]);

        const { valuesWithoutCommission, valuesWithCommission, valuesWithCommissionAndTER, totalCommissions, totalTER, capitalInvested, chartDates } = calculatePAC(
            filteredPrices,
            frequency,
            amount,
            commission,
            ter,
            filteredDates
        );

        // Calcola i risultati finali
        const finalWithoutCommission = valuesWithoutCommission[valuesWithoutCommission.length - 1];
        const finalWithCommission = valuesWithCommission[valuesWithCommission.length - 1];
        const finalWithCommissionAndTER = valuesWithCommissionAndTER[valuesWithCommissionAndTER.length - 1];
        const initialInvestment = capitalInvested[capitalInvested.length - 1];

        const returnWithoutCommission = ((finalWithoutCommission - initialInvestment) / initialInvestment) * 100;
        const returnWithCommission = ((finalWithCommission - initialInvestment) / initialInvestment) * 100;
        const returnWithCommissionAndTER = ((finalWithCommissionAndTER - initialInvestment) / initialInvestment) * 100;

        const commissionPercentage = (totalCommissions / finalWithCommissionAndTER) * 100;
        const terPercentage = (totalTER / finalWithCommissionAndTER) * 100;

        // Aggiorna il grafico
        updateChart(chartDates, valuesWithoutCommission, valuesWithCommission, valuesWithCommissionAndTER, capitalInvested);

        // Aggiorna la tabella
        let tableHtml = `
            <tr>
                <td>Senza Commissioni</td>
                <td>${finalWithoutCommission.toFixed(2)}$</td>
                <td>${returnWithoutCommission.toFixed(2)}%</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
            </tr>
            <tr>
                <td>Con Commissioni</td>
                <td>${finalWithCommission.toFixed(2)}$</td>
                <td>${returnWithCommission.toFixed(2)}%</td>
                <td>${totalCommissions.toFixed(2)}</td>
                <td>-</td>
                <td>${commissionPercentage.toFixed(2)}%</td>
                <td>-</td>
                <td>${(returnWithCommission - returnWithoutCommission).toFixed(2)}%</td>
                <td>${(finalWithCommission - finalWithoutCommission).toFixed(2)}$</td>
            </tr>
            <tr>
                <td>Con Commissioni + TER</td>
                <td>${finalWithCommissionAndTER.toFixed(2)}$</td>
                <td>${returnWithCommissionAndTER.toFixed(2)}%</td>
                <td>${totalCommissions.toFixed(2)}</td>
                <td>${totalTER.toFixed(2)}</td>
                <td>${commissionPercentage.toFixed(2)}%</td>
                <td>${terPercentage.toFixed(2)}%</td>
                <td>${(returnWithCommissionAndTER - returnWithoutCommission).toFixed(2)}%</td>
                <td>${(finalWithCommissionAndTER - finalWithoutCommission).toFixed(2)}$</td>
            </tr>
        `;
        resultsTable.innerHTML = tableHtml;
    }

    function calculatePAC(prices, frequency, amount, commission, ter, dates) {
        let chartDates = dates.filter((_, index) => index % frequency === 0);
        let valuesWithoutCommission = [];
        let valuesWithCommission = [];
        let valuesWithCommissionAndTER = [];
        let capitalInvested = [];
        let sharesWithoutCommission = 0;
        let sharesWithCommission = 0;
        let sharesWithCommissionAndTER = 0;
        let totalCommissions = 0;
        let totalTER = 0;
        let totalCapital = 0;

        for (let i = 0; i < prices.length; i += frequency) {
            const price = prices[i];
            if (!price) continue;

            // Capitale versato
            totalCapital += amount + commission;
            capitalInvested.push(totalCapital);

            // Senza commissioni
            sharesWithoutCommission += amount / price;
            valuesWithoutCommission.push(sharesWithoutCommission * price);

            // Con commissioni (aggiungo le stesse quote al portafoglio TER per iniziare)
            const commissionCost = commission;
            totalCommissions += commissionCost;
            const adjustedPrice = price + commissionCost / (amount / price);
            const newShares = amount / adjustedPrice;
            sharesWithCommission += newShares;
            sharesWithCommissionAndTER += newShares;

            // Valore prima del TER
            let valueWithCommAndTER = sharesWithCommissionAndTER * price;

            // Applica TER proporzionale al periodo: riduce le quote equivalenti
            if (ter > 0) {
                const terCost = valueWithCommAndTER * ter * (frequency / 365);
                totalTER += terCost;
                const lostShares = terCost / price;
                sharesWithCommissionAndTER -= lostShares;
                // aggiorna il valore dopo la perdita
                valueWithCommAndTER = sharesWithCommissionAndTER * price;
            }

            valuesWithCommission.push(sharesWithCommission * price); // senza TER
            valuesWithCommissionAndTER.push(valueWithCommAndTER);
        }

        return { valuesWithoutCommission, valuesWithCommission, valuesWithCommissionAndTER, totalCommissions, totalTER, capitalInvested, chartDates };
    }

    function updateChart(dates, valuesWithoutCommission, valuesWithCommission, valuesWithCommissionAndTER, capitalInvested) {
        if (chart) chart.destroy();

        const datasets = [];
        // always show green line (base)
        datasets.push({
            label: 'Senza Commissioni',
            data: valuesWithoutCommission,
            borderColor: 'green',
            fill: false,
        });
        // red line showing only impact of purchase commissions
        datasets.push({
            label: 'Con Commissioni',
            data: valuesWithCommission,
            borderColor: 'red',
            fill: false,
        });
        // TER line styled dashed and always shown on top
        datasets.push({
            label: 'Con Commissioni + TER',
            data: valuesWithCommissionAndTER,
            borderColor: 'orange',
            borderDash: [5, 5],
            fill: false,
            tension: 0,
        });
        // capital line
        datasets.push({
            label: 'Capitale Versato',
            data: capitalInvested,
            borderColor: 'blue',
            fill: false,
        });

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets,
            },
            options: {
                responsive: true,
                elements: {
                    point:{
                        radius: 0
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                },
            },
        });
    }
});
