document.addEventListener('DOMContentLoaded', function() {
    const minusAmount = document.getElementById('minusAmount');
    const taxRate = document.getElementById('taxRate');
    const taxCredit = document.getElementById('taxCredit');
    const recovery26 = document.getElementById('recovery26');
    const recovery12 = document.getElementById('recovery12');

    function calculateRecovery() {
        const loss = parseFloat(minusAmount.value);
        const rate = parseFloat(taxRate.value);
        
        // Calcolo dello zainetto fiscale
        const credit = (loss * rate / 100);
        
        // Calcolo dei recuperi necessari
        const recovery26Amount = credit / 0.26; // diviso per 26%
        const recovery12Amount = credit / 0.125; // diviso per 12.5%

        // Formattazione dei risultati
        taxCredit.textContent = credit.toFixed(2) + '€';
        recovery26.textContent = recovery26Amount.toFixed(2) + '€';
        recovery12.textContent = recovery12Amount.toFixed(2) + '€';
    }

    // Eventi per il ricalcolo
    minusAmount.addEventListener('input', calculateRecovery);
    taxRate.addEventListener('change', calculateRecovery);

    // Calcolo iniziale
    calculateRecovery();
});
