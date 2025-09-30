// Script per mostrare il grafico dello stipendio medio italiano lordo in grammi d'oro
// Carica i dati dai CSV, calcola il rapporto e mostra il grafico responsive

document.addEventListener('DOMContentLoaded', function () {
    // Funzione per caricare un CSV e restituire un array di oggetti {anno, valore}
    function caricaCSV(path, callback) {
        fetch(path)
            .then(response => response.text())
            .then(text => {
                const righe = text.trim().split('\n');
                const dati = righe.map(riga => {
                    const [anno, valore] = riga.split(',');
                    return { anno: anno.trim(), valore: parseFloat(valore.replace(/\r/g, '')) };
                });
                callback(dati);
            });
    }

    // Carica entrambi i CSV e calcola il rapporto
    caricaCSV('csv/stipendio_medio_italia_storico.csv', function (stipendi) {
        caricaCSV('csv/oro_annuo_grammo.csv', function (oro) {
            // Crea una mappa anno->valore oro
            const oroMap = {};
            oro.forEach(o => { oroMap[o.anno] = o.valore; });
            // Calcola stipendio in grammi d'oro
            const datiGrafico = stipendi
                .filter(s => oroMap[s.anno])
                .map(s => ({
                    anno: s.anno,
                    grammiOro: s.valore / oroMap[s.anno],
                    stipendioEuro: s.valore
                }));

            mostraGrafico(datiGrafico);

            // Calcolo per la scritta richiesta
            if (datiGrafico.length > 1) {
                const primo = datiGrafico[0];
                const ultimoAnno = datiGrafico[datiGrafico.length - 1].anno;
                const prezzoOroUltimoAnno = oroMap[ultimoAnno];
                const valoreOroOggi = primo.grammiOro * prezzoOroUltimoAnno;
                const valoreOroOggiRounded = valoreOroOggi.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
                const stipendioInizialeRounded = primo.stipendioEuro.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
                const testo = `Se oggi ti pagassero la stessa quantità di oro dell'inizio in euro il tuo stipendio sarebbe: <span style=\"color:#FFD700\">${valoreOroOggiRounded}</span><br><span style=\"font-size:0.95em;color:#888\">(lo stipendio in euro all'inizio era ${stipendioInizialeRounded})</span>`;
                document.getElementById('stipendio-oro-oggi').innerHTML = testo;
            }
        });
    });

    function mostraGrafico(dati) {
        const container = document.querySelector('.container');
        const chartDiv = document.createElement('div');
        chartDiv.className = 'my-4';
        chartDiv.innerHTML = '<canvas id="grafico-stipendio-oro" style="max-width:100%;height:350px;"></canvas>';
        container.appendChild(chartDiv);
        const ctx = document.getElementById('grafico-stipendio-oro').getContext('2d');

        // Livello iniziale (primo valore)
        const livelloIniziale = dati[0].grammiOro;
        const livelloInizialeArray = dati.map(() => livelloIniziale);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dati.map(d => d.anno),
                datasets: [
                    {
                        label: "Stipendio medio lordo in grammi d'oro",
                        data: dati.map(d => d.grammiOro),
                        borderColor: '#FFD700',
                        backgroundColor: 'rgba(0, 123, 255, 0.10)',
                        pointBackgroundColor: '#FFD700',
                        pointRadius: 4,
                        fill: '+1', // fill verso il dataset successivo
                        tension: 0.2,
                        order: 1
                    },
                    {
                        label: "Livello iniziale",
                        data: livelloInizialeArray,
                        borderColor: '#888',
                        borderDash: [6, 6],
                        pointRadius: 0,
                        fill: false,
                        tension: 0,
                        order: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: '#333', font: { size: 16 } } },
                    title: { display: false }
                },
                scales: {
                    x: { title: { display: true, text: 'Anno', color: '#333' }, ticks: { color: '#333' } },
                    y: { title: { display: true, text: 'Grammi d\'oro', color: '#333' }, ticks: { color: '#333' } }
                }
            }
        });
    }
});
