document.addEventListener('DOMContentLoaded', function () {
    const importoMensile = document.getElementById('importoMensile');
    const commissioni = document.getElementById('commissioni');
    const rendimento = document.getElementById('rendimento');
    const rendimentoValue = document.getElementById('rendimentoValue');
    const anni = document.getElementById('anni');
    const anniValue = document.getElementById('anniValue');
    const graficoCanvas = document.getElementById('graficoInvestimento');
    const impattoMonetario = document.getElementById('impattoMonetario');
    const impattoPercentuale = document.getElementById('impattoPercentuale');
    const frequenza = document.getElementById('frequenza');
    const impattosusingoloacquisto = document.getElementById('impattosusingoloacquisto');

    const rendimentoTotaleLordo = document.getElementById('rendimentoTotaleLordo');
    const rendimentoTotaleNetto = document.getElementById('rendimentoTotaleNetto');
    const valoreTotaleLordo = document.getElementById('valoreTotaleLordo');
    const valoreTotaleNetto = document.getElementById('valoreTotaleNetto');
    const guadagnoTotaleLordo = document.getElementById('guadagnoTotaleLordo');
    const guadagnoTotaleNetto = document.getElementById('guadagnoTotaleNetto');
    const differenzaRendimento = document.getElementById('differenzaRendimento');
    const differenzaValore = document.getElementById('differenzaValore');
    const differenzaGuadagno = document.getElementById('differenzaGuadagno');

    let grafico;

    function aggiornaValori() {
        rendimentoValue.textContent = `${rendimento.value}%`;
        anniValue.textContent = `${anni.value} anni`;
    }

    function annualToMonthlyReturn(annualRate) {
        return Math.pow(1 + annualRate, 1 / 12) - 1;
    }

    function calcolaInvestimento() {
        const mensile = parseFloat(importoMensile.value);
        const comm = parseFloat(commissioni.value);
        const annuo = parseFloat(rendimento.value) / 100;
        const durata = parseInt(anni.value);
        const intervallo = parseInt(frequenza.value); // Frequenza del PAC (1 = mensile, 3 = trimestrale, 12 = annuale)

        const datiLordo = [];
        const datiNetto = [];
        let totaleLordo = 0;
        let totaleNetto = 0;

        for (let i = 1; i <= durata * 12; i++) {
            if (i % intervallo === 0) {
                totaleLordo = (totaleLordo + mensile) * (1 + annuo / 12);
                totaleNetto = (totaleNetto + mensile - comm) * (1 + annuo / 12);
            } else {
                totaleLordo *= (1 + annuo / 12);
                totaleNetto *= (1 + annuo / 12);
            }
            if (i % 12 === 0) {
                datiLordo.push(totaleLordo);
                datiNetto.push(totaleNetto);
            }
        }

        const impatto = totaleLordo - totaleNetto;
        const impattoPerc = (impatto / totaleLordo) * 100;

        impattoMonetario.textContent = `Impatto Monetario delle commissioni sul totale finale : €${impatto.toFixed(2)}`;
        impattoPercentuale.textContent = `Impatto Percentuale delle commissioni rispetto al rendimento lordo : ${impatto.toFixed(2)} / ${totaleLordo.toFixed(2)} * 100 = ${impattoPerc.toFixed(2)}%`;

        const totaleInvestito = (durata * 12 / intervallo) * mensile;
        const guadagnoLordo = totaleLordo - totaleInvestito;
        const guadagnoNetto = totaleNetto - totaleInvestito;
        const rendimentoPercLordo = (guadagnoLordo / totaleInvestito) * 100;
        const rendimentoPercNetto = (guadagnoNetto / totaleInvestito) * 100;

        // Aggiorna i valori nella tabella
        impattosusingoloacquisto.textContent = `${((comm / mensile) * 100).toFixed(2)}%`;
        rendimentoTotaleLordo.textContent = `${rendimentoPercLordo.toFixed(2)}%`;
        rendimentoTotaleNetto.textContent = `${rendimentoPercNetto.toFixed(2)}%`;
        valoreTotaleLordo.textContent = `€${totaleLordo.toFixed(2)}`;
        valoreTotaleNetto.textContent = `€${totaleNetto.toFixed(2)}`;
        guadagnoTotaleLordo.textContent = `€${guadagnoLordo.toFixed(2)}`;
        guadagnoTotaleNetto.textContent = `€${guadagnoNetto.toFixed(2)}`;
        differenzaRendimento.textContent = `${(rendimentoPercLordo - rendimentoPercNetto).toFixed(2)}%`;
        differenzaValore.textContent = `€${(totaleLordo - totaleNetto).toFixed(2)}`;
        differenzaGuadagno.textContent = `€${(guadagnoLordo - guadagnoNetto).toFixed(2)}`;

        if (grafico) grafico.destroy();

        grafico = new Chart(graficoCanvas, {
            type: 'line',
            data: {
                labels: Array.from({ length: (durata) }, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Investimento Lordo',
                        data: datiLordo,
                        borderColor: 'green',
                        fill: false,
                    },
                    {
                        label: 'Investimento Netto',
                        data: datiNetto,
                        borderColor: 'red',
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: { display: true, text: 'Anni' }
                    },
                    y: { title: { display: true, text: 'Valore (€)' } },
                },
            },
        });
    }

    rendimento.addEventListener('input', () => {
        aggiornaValori();
        calcolaInvestimento();
    });

    anni.addEventListener('input', () => {
        aggiornaValori();
        calcolaInvestimento();
    });

    importoMensile.addEventListener('input', calcolaInvestimento);
    commissioni.addEventListener('input', calcolaInvestimento);
    frequenza.addEventListener('change', calcolaInvestimento);

    // Calcolo iniziale al caricamento della pagina
    aggiornaValori();
    calcolaInvestimento();
});
