let chart;

function bondPrice(faceValue, couponRate, maturity, yieldRate) {
    const c = (couponRate / 100) * faceValue;
    const y = yieldRate / 100;
    let price = 0;
    for (let t = 1; t <= maturity; t++) {
        price += c / Math.pow(1 + y, t);
    }
    price += faceValue / Math.pow(1 + y, maturity);
    return price;
}

function updateYieldLabel(val) {
    document.getElementById('yieldLabel').innerText = parseFloat(val).toFixed(2);
    updateChart();
}

function updateCouponLabel(val) {
    document.getElementById('couponLabel').innerText = parseFloat(val).toFixed(2);
    updateChart();
}

function updateMaturityLabel(val) {
    document.getElementById('maturityLabel').innerText = parseInt(val);
    updateChart();
}

function generateData(currentYield) {
    const faceValue = parseFloat(document.getElementById("faceValue").value);
    const couponRate = parseFloat(document.getElementById("couponSlider").value);
    const maturity = parseInt(document.getElementById("maturitySlider").value);

    let yields = [];
    let prices = [];

    for (let y = currentYield - 3; y <= currentYield + 3; y += 0.25) {
        yields.push(y);
        prices.push(bondPrice(faceValue, couponRate, maturity, y));
    }

    const currentPrice = bondPrice(faceValue, couponRate, maturity, currentYield);
    return { yields, prices, currentPrice, faceValue, couponRate, maturity };
}

function getTangentLine(faceValue, couponRate, maturity, yieldRate, yields) {
    // Calcola la derivata numerica centrale
    const delta = 0.01;
    const price_minus = bondPrice(faceValue, couponRate, maturity, yieldRate - delta);
    const price_plus = bondPrice(faceValue, couponRate, maturity, yieldRate + delta);
    const price_current = bondPrice(faceValue, couponRate, maturity, yieldRate);
    const slope = (price_plus - price_minus) / (2 * delta);

    // Costruisci la retta tangente per tutti i punti del grafico
    return yields.map(y => slope * (y - yieldRate) + price_current);
}

function updateChart() {
    const currentYield = parseFloat(document.getElementById("yieldSlider").value);
    const data = generateData(currentYield);

    const priceDown1 = bondPrice(data.faceValue, data.couponRate, data.maturity, currentYield - 1);
    const priceUp1 = bondPrice(data.faceValue, data.couponRate, data.maturity, currentYield + 1);

    const gain = (priceDown1 - data.currentPrice).toFixed(2);
    const loss = (data.currentPrice - priceUp1).toFixed(2);

    document.getElementById("highlightInfo").innerHTML = `
        Prezzo attuale: <b>${data.currentPrice.toFixed(2)} €</b><br>
        Se i tassi scendono di 1% → Prezzo: <b>${priceDown1.toFixed(2)} €</b> (guadagno +${gain} €)<br>
        Se i tassi salgono di 1% → Prezzo: <b>${priceUp1.toFixed(2)} €</b> (perdita -${loss} €)<br>
        <em>Nota l'asimmetria: il guadagno in caso di calo è maggiore della perdita in caso di aumento, grazie alla convessità.</em>
      `;

    // Calcola la retta tangente
    const tangentPrices = getTangentLine(data.faceValue, data.couponRate, data.maturity, currentYield, data.yields);

    if (chart) chart.destroy();

    const ctx = document.getElementById('convexityChart');
    if (window.innerWidth < 768) {
        ctx.height = 400;
    } else {
        ctx.height = 500;
    }
    chart = new Chart(ctx, {
        type: 'line',        
        data: {
            labels: data.yields.map(y => y.toFixed(2) + "%"),
            datasets: [{
                label: 'Prezzo Obbligazione',
                data: data.prices,
                borderColor: 'blue',
                fill: false,
                tension: 0.2,
                pointRadius: 2,
                borderWidth: 2
            }, {
                label: 'Prezzo Attuale',
                data: data.prices.map((v, i) => i === Math.floor(data.prices.length / 2) ? data.currentPrice : null),
                borderColor: 'red',
                pointBackgroundColor: 'red',
                pointRadius: 6,
                showLine: false
            }, {
                label: 'Approssimazione lineare (Duration)',
                data: tangentPrices,
                borderColor: 'orange',                
                borderWidth: 2, 
                fill: false,
                pointRadius: 0,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Prezzo vs Rendimento (Convessità)'
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Rendimento (%)' }
                },
                y: {
                    title: { display: true, text: 'Prezzo (€)' }
                }
            }
        }
    });
}

// Disegna il grafico iniziale
updateChart();
