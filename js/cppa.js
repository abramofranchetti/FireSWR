document.addEventListener('DOMContentLoaded', function () {
    const initialCapitalInput = document.getElementById('initialCapital');
    const inflationSlider = document.getElementById('inflationSlider');
    const inflationValueSpan = document.getElementById('inflationValue');
    const yearsSlider = document.getElementById('yearsSlider');
    const yearsValueSpan = document.getElementById('yearsValue');
    const resultText = document.getElementById('resultText');
    const reverseResultText = document.getElementById('reverseResultText');

    function formatEuro(value) {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    function calculateInflationLoss(initialCapital, inflationRate, years) {
        const cumulativeFactor = Math.pow(1 + inflationRate / 100, years);
        const svalutatedValue = Math.round(initialCapital / cumulativeFactor);
        const rivalutatedValue = Math.round(initialCapital * cumulativeFactor);
        const lossPercentage = (((svalutatedValue / initialCapital) - 1) * -100).toFixed(2);
        const gainPercentage = (((rivalutatedValue / initialCapital) - 1) * 100).toFixed(2);
        return { svalutatedValue, rivalutatedValue, lossPercentage, gainPercentage };
    }

    function updateResult() {
        const initialCapital = parseFloat(initialCapitalInput.value);
        const inflationRate = parseFloat(inflationSlider.value);
        const years = parseInt(yearsSlider.value);
        const { svalutatedValue, rivalutatedValue, lossPercentage, gainPercentage } = calculateInflationLoss(initialCapital, inflationRate, years);
        resultText.innerText = `Il potere di acquisto del capitale iniziale di ${formatEuro(initialCapital)} per via dell'inflazione cumulata del ${inflationRate}% in ${years} anni è diventato ${formatEuro(svalutatedValue)} con una perdita di potere di acquisto del ${lossPercentage}%.`;
        reverseResultText.innerText = `Al contrario, per acquistare ciò che avresti acquistato ${years} anni fa con il capitale iniziale di ${formatEuro(initialCapital)}, ora ti servirebbero ${formatEuro(rivalutatedValue)} rivalutati, con un esborso maggiorato del ${gainPercentage}%.`;
    }

    initialCapitalInput.addEventListener('input', updateResult);
    inflationSlider.addEventListener('input', function () {
        inflationValueSpan.innerText = `${inflationSlider.value}%`;
        updateResult();
    });
    yearsSlider.addEventListener('input', function () {
        yearsValueSpan.innerText = `${yearsSlider.value}`;
        updateResult();
    });

    updateResult();
});
