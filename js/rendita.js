document.addEventListener('DOMContentLoaded', function () {
    const capitaleIniziale = document.getElementById('capitaleIniziale');
    const renditaNetta = document.getElementById('renditaNetta');
    const rendimentoAnnuo = document.getElementById('rendimentoAnnuo');
    const frequenzaPrelievo = document.getElementById('frequenzaPrelievo');
    const renditaLorda = document.getElementById('renditaLorda');
    const durataStimata = document.getElementById('durataStimata');
    const inflazioneAnnua = document.getElementById('inflazioneAnnua');
    const ctx = document.getElementById('capitaleChart').getContext('2d');
    let chart = null;

    function calcolaRenditaLorda(netto) {
        return netto / (1 - 0.26); // Tassazione 26%
    }

    function calcolaAndamentoCapitale() {
        const capitale = parseFloat(capitaleIniziale.value);
        const prelievoNettoBase = parseFloat(renditaNetta.value);
        const rendimento = parseFloat(rendimentoAnnuo.value) / 100;
        const inflazione = parseFloat(inflazioneAnnua.value) / 100;
        const frequenza = parseInt(frequenzaPrelievo.value);
        let capitaleResiduo = capitale;
        const datiGrafico = [];
        const prelievi = [];
        let mese = 0;
        const mesiPerPrelievo = 12 / frequenza;

        while (capitaleResiduo > 0 && mese < 1200) { // Max 100 anni
            const rendimentoMensile = rendimento / 12;
            const inflazioneMensile = inflazione / 12;
            
            // Calcola il prelievo netto aggiustato per l'inflazione
            const fattoreInflazione = Math.pow(1 + inflazioneMensile, mese);
            const prelievoNettoAttuale = prelievoNettoBase * fattoreInflazione;
            const prelievoLordoAttuale = calcolaRenditaLorda(prelievoNettoAttuale);

            capitaleResiduo *= (1 + rendimentoMensile);

            if (mese % mesiPerPrelievo === 0) {
                if (capitaleResiduo >= prelievoLordoAttuale) {
                    capitaleResiduo -= prelievoLordoAttuale;
                    prelievi.push({
                        x: mese,
                        y: capitaleResiduo,
                        prelievo: prelievoLordoAttuale // Aggiungiamo l'informazione del prelievo
                    });
                    
                    // Aggiorna il display della rendita lorda solo per il primo prelievo
                    if (mese === 0) {
                        renditaLorda.textContent = prelievoLordoAttuale.toFixed(2);
                    }
                } else {
                    capitaleResiduo = 0;
                }
            }

            datiGrafico.push({
                x: mese,
                y: capitaleResiduo
            });
            mese++;
        }

        durataStimata.textContent = (mese / 12).toFixed(1);
        disegnaGrafico(datiGrafico, prelievi);
    }

    function disegnaGrafico(datiCapitale, prelievi) {
        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Capitale Residuo',
                    data: datiCapitale,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }, {
                    label: 'Prelievi',
                    data: prelievi,
                    borderColor: 'rgb(255, 99, 132)',
                    pointRadius: 5,
                    showLine: false
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: true,
                    mode: 'nearest'
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.label === 'Prelievi') {
                                    const prelievo = context.raw.prelievo.toFixed(2);
                                    return [
                                        `Capitale residuo: ${context.raw.y.toFixed(2)}€`,
                                        `Prelievo: ${prelievo}€`
                                    ];
                                }
                                return `Capitale: ${context.raw.y.toFixed(2)}€`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Mesi'
                        }
                    },
                    y: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Capitale (€)'
                        }
                    }
                }
            }
        });
    }

    // Event listeners
    [capitaleIniziale, renditaNetta, rendimentoAnnuo, frequenzaPrelievo, inflazioneAnnua].forEach(element => {
        element.addEventListener('change', calcolaAndamentoCapitale);
    });

    // Calcolo iniziale
    calcolaAndamentoCapitale();
});