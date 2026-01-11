

document.addEventListener('DOMContentLoaded', function() {
	const form = document.getElementById('zeroCouponForm');
	const resultsDiv = document.getElementById('zcResults');
	const chartCanvas = document.getElementById('zcChart');
	let chartInstance = null;

	function calcolaZeroCoupon() {
		// Lettura dati
		const tipoObbligazione = document.getElementById('tipoObbligazione') ? document.getElementById('tipoObbligazione').value : 'stato';
		const aliquota = tipoObbligazione === 'stato' ? 0.125 : 0.26;
		const dataAcquisto = new Date(document.getElementById('dataAcquisto').value);
		const dataScadenza = new Date(document.getElementById('dataScadenza').value);
		const prezzoAcquisto = parseFloat(document.getElementById('prezzoAcquisto').value);
		const valoreNominale = parseFloat(document.getElementById('valoreNominale').value);
		const dataVenditaVal = document.getElementById('dataVendita').value;
		const prezzoVenditaVal = document.getElementById('prezzoVendita').value;
		const dataVendita = dataVenditaVal ? new Date(dataVenditaVal) : null;
		const prezzoVendita = prezzoVenditaVal ? parseFloat(prezzoVenditaVal) : null;

		// Validazione base
		if (dataAcquisto >= dataScadenza) {
			resultsDiv.innerHTML = '';
			resultsDiv.style.display = 'none';
			return;
		}
		if (prezzoAcquisto <= 0 || valoreNominale <= 0) {
			resultsDiv.innerHTML = '';
			resultsDiv.style.display = 'none';
			return;
		}
		if (dataVendita && (dataVendita <= dataAcquisto || dataVendita > dataScadenza)) {
			resultsDiv.innerHTML = '';
			resultsDiv.style.display = 'none';
			return;
		}
		if (prezzoVendita && (!dataVendita)) {
			resultsDiv.innerHTML = '';
			resultsDiv.style.display = 'none';
			return;
		}

		// Calcolo andamento teorico
		const giorniTotali = (dataScadenza - dataAcquisto) / (1000*60*60*24);
		const anniTotali = giorniTotali / 365.25;
		const rendimentoAnnuale = Math.pow(valoreNominale / prezzoAcquisto, 1/anniTotali) - 1;

		// Genera andamento teorico (ogni mese)
		let andamentoDate = [];
		let andamentoPrezzi = [];
		let current = new Date(dataAcquisto);
		while (current <= dataScadenza) {
			const giorni = (current - dataAcquisto) / (1000*60*60*24);
			const anni = giorni / 365.25;
			const prezzoTeorico = prezzoAcquisto * Math.pow(1 + rendimentoAnnuale, anni);
			andamentoDate.push(new Date(current));
			andamentoPrezzi.push(prezzoTeorico);
			// Prossimo mese
			current.setMonth(current.getMonth() + 1);
		}
		// Assicura che l'ultimo punto sia la scadenza
		if (andamentoDate[andamentoDate.length-1] < dataScadenza) {
			andamentoDate.push(new Date(dataScadenza));
			andamentoPrezzi.push(valoreNominale);
		}

		// Calcolo guadagno e suddivisione fiscale
		let html = `<h2>Risultati</h2>`;
		html += `<b>Rendimento annuo composto:</b> ${(rendimentoAnnuale*100).toFixed(2)}%<br>`;
		html += `<b>Valore a scadenza:</b> €${valoreNominale.toFixed(2)}<br>`;
		html += `<b>Guadagno teorico a scadenza:</b> €${(valoreNominale-prezzoAcquisto).toFixed(2)}<br>`;

		// Per punto rosso
		let venditaIndex = null;
		let prezzoVenditaY = null;

		if (dataVendita && prezzoVendita) {
			// Calcolo guadagno effettivo
			const guadagnoTotale = prezzoVendita - prezzoAcquisto;
			// Quota maturata fino a vendita (pro-rata)
			const giorniMaturati = (dataVendita - dataAcquisto) / (1000*60*60*24);
			const anniMaturati = giorniMaturati / 365.25;
			const prezzoTeoricoVendita = prezzoAcquisto * Math.pow(1 + rendimentoAnnuale, anniMaturati);
			// Reddito da capitale: differenza tra prezzo teorico maturato e prezzo di acquisto
			const redditoCapitale = Math.max(0, prezzoTeoricoVendita - prezzoAcquisto);
			// Reddito diverso: differenza tra prezzo di vendita e prezzo teorico maturato
			const redditoDiverso = Math.max(0, prezzoVendita - prezzoTeoricoVendita);

			// Calcolo credito di imposta compensabile
			let creditoCompensabile = redditoDiverso;
			html += `<hr><b>Calcolo vendita anticipata</b><br>`;
			html += `Prezzo di vendita: €${prezzoVendita.toFixed(2)}<br>`;
			html += `Data di vendita: ${dataVendita.toLocaleDateString()}<br>`;
			html += `Guadagno totale: <b>€${guadagnoTotale.toFixed(2)}</b><br>`;
			html += `<span style=\"color:#0077cc\">Reddito da capitale (pro-rata): <b>€${redditoCapitale.toFixed(2)}</b></span><br>`;
			html += `<span style=\"color:#cc7700\">Reddito diverso: <b>€${redditoDiverso.toFixed(2)}</b></span><br>`;
			if (redditoDiverso > 0.005) {
				html += `<br><b>Minus necessaria per non pagare tasse sul reddito diverso:</b> <b>€${(creditoCompensabile).toFixed(2)}</b><br>`;
			}
			html += `<small>Secondo la normativa italiana (TUIR art. 44 e 67), la quota maturata fino alla vendita è reddito da capitale, l'eccedenza è reddito diverso.</small>`;

			// Trova indice più vicino alla data di vendita per il punto rosso
			venditaIndex = andamentoDate.findIndex(d => Math.abs(d - dataVendita) < 1000*60*60*24*16); // 16 giorni di tolleranza
			if (venditaIndex === -1) {
				// Se non trovato, cerca il più vicino
				let minDiff = Infinity;
				andamentoDate.forEach((d, i) => {
					const diff = Math.abs(d - dataVendita);
					if (diff < minDiff) { minDiff = diff; venditaIndex = i; }
				});
			}
			prezzoVenditaY = prezzoVendita;
		}

		resultsDiv.innerHTML = html;
		resultsDiv.style.display = 'block';

		// Grafico andamento
		const labels = andamentoDate.map(d => d.toLocaleDateString());
		let datasets = [{
			label: 'Prezzo teorico (€)',
			data: andamentoPrezzi,
			borderColor: '#0077cc',
			backgroundColor: 'rgba(0,119,204,0.1)',
			pointRadius: 2,
			fill: true,
			tension: 0.15
		}];
		// Punto rosso per prezzo di vendita
		if (venditaIndex !== null && prezzoVenditaY !== null) {
			let punti = new Array(andamentoPrezzi.length).fill(null);
			punti[venditaIndex] = prezzoVenditaY;
			datasets.push({
				label: 'Prezzo di vendita',
				data: punti,
				borderColor: 'rgba(0,0,0,0)',
				backgroundColor: 'red',
				pointRadius: 7,
				pointStyle: 'circle',
				showLine: false,
				fill: false
			});
		}
		if (chartInstance) chartInstance.destroy();
		chartInstance = new Chart(chartCanvas, {
			type: 'line',
			data: {
				labels: labels,
				datasets: datasets
			},
			options: {
				responsive: true,
				plugins: {
					legend: { display: true },
					title: {
						display: true,
						text: 'Andamento teorico Zero Coupon'
					}
				},
				scales: {
					y: {
						beginAtZero: false,
						title: { display: true, text: 'Prezzo (€)' }
					},
					x: {
						title: { display: true, text: 'Data' }
					}
				}
			}
		});
	}

	form.addEventListener('submit', function(e) {
		e.preventDefault();
		calcolaZeroCoupon();
	});

	// Aggiorna calcolo se cambia il tipo di obbligazione
	const tipoObbSel = document.getElementById('tipoObbligazione');
	if (tipoObbSel) {
		tipoObbSel.addEventListener('change', function() {
			calcolaZeroCoupon();
		});
	}

	// Esegui subito il calcolo di esempio al caricamento
	setTimeout(calcolaZeroCoupon, 100);
	
	// Aggiorna calcolo se cambia qualsiasi campo del form
	const campi = [
		'tipoObbligazione',
		'dataAcquisto',
		'dataScadenza',
		'prezzoAcquisto',
		'valoreNominale',
		'dataVendita',
		'prezzoVendita'
	];
	campi.forEach(id => {
		const el = document.getElementById(id);
		if (el) {
			el.addEventListener('input', calcolaZeroCoupon);
		}
	});
});
