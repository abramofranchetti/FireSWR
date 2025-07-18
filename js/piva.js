function generateRandomDigits(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
}

function calculateCheckDigit(digits) {
    let evenSum = 0;
    let oddSum = 0;
    
    for (let i = 0; i < digits.length; i++) {
        const num = parseInt(digits[i]);
        if (i % 2 === 0) {
            oddSum += num;
        } else {
            const doubled = num * 2;
            evenSum += doubled > 9 ? doubled - 9 : doubled;
        }
    }
    
    const total = evenSum + oddSum;
    const checkDigit = (10 - (total % 10)) % 10;
    return checkDigit;
}

function generatePIVA() {
    const baseNumber = generateRandomDigits(10);
    const checkDigit = calculateCheckDigit(baseNumber);
    return baseNumber + checkDigit;
}

function copyToClipboard() {
    const pivaText = document.getElementById('pivaResult').textContent;
    navigator.clipboard.writeText(pivaText).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiato!';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copia';
        }, 2000);
    });
}

function updatePIVA() {
    const piva = generatePIVA();
    const formattedPIVA = piva.match(/.{1,3}/g).join('');
    const pivaElement = document.getElementById('pivaResult');
    pivaElement.textContent = formattedPIVA;
    
    // Seleziona il testo
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(pivaElement);
    selection.removeAllRanges();
    selection.addRange(range);
}

document.addEventListener('DOMContentLoaded', () => {
    updatePIVA();
    document.getElementById('regenerateBtn').addEventListener('click', updatePIVA);
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
});
