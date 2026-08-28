const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const number = (value) => euro.format(value);

function calcolaAmmortamento(event) {
    if (event) event.preventDefault();
    const prezzo = parseFloat(document.getElementById('prezzo').value);
    const anticipo = parseFloat(document.getElementById('anticipo').value);
    const anni = parseFloat(document.getElementById('anni').value);
    const tassoAnnuo = parseFloat(document.getElementById('tasso').value);
    const valoreResiduo = parseFloat(document.getElementById('valoreResiduo').value);

    // 2. Recupero dati Gestione
    const kmAnnui = parseFloat(document.getElementById('kmAnnui').value);
    const consumo = parseFloat(document.getElementById('consumo').value); // km/l
    const costoCarburante = parseFloat(document.getElementById('costoCarburante').value); // €/l
    const assicurazione = parseFloat(document.getElementById('assicurazione').value);
    const bollo = parseFloat(document.getElementById('bollo').value);
    const manutenzione = parseFloat(document.getElementById('manutenzione').value);
    const altriCosti = parseFloat(document.getElementById('altriCosti').value);
    const stipendio = parseFloat(document.getElementById('stipendio').value);
    const quotaStipendio = parseFloat(document.getElementById('quotaStipendio').value);
    const valori = [prezzo, anticipo, anni, tassoAnnuo, valoreResiduo, kmAnnui, consumo, costoCarburante, assicurazione, bollo, manutenzione, altriCosti, stipendio, quotaStipendio];
    const errore = document.getElementById('errore');
    const mostraErrore = (messaggio) => { errore.textContent = messaggio; errore.style.display = 'block'; };
    errore.style.display = 'none';
    if (valori.some((valore) => !Number.isFinite(valore)) || prezzo <= 0 || anticipo < 0 || anticipo > prezzo || !Number.isInteger(anni) || anni <= 0 || tassoAnnuo < 0 || valoreResiduo < 0 || valoreResiduo > prezzo || kmAnnui <= 0 || consumo <= 0 || costoCarburante < 0 || stipendio <= 0 || quotaStipendio <= 0 || quotaStipendio > 100) {
        mostraErrore('Controlla i valori: prezzo, durata, chilometri e consumi devono essere positivi; anticipo e valore residuo non possono superare il prezzo.');
        document.getElementById('risultati').classList.remove('hidden');
        return;
    }

    // 3. Calcolo Finanziamento (Ammortamento alla Francese)
    const importoFinanziato = prezzo - anticipo;
    const mesi = anni * 12;
    let rataMensile = 0;
    let costoTotaleInteressi = 0;

    if (importoFinanziato > 0) {
        if (tassoAnnuo > 0) {
            const tassoMensile = (tassoAnnuo / 100) / 12;
            // Formula rata: R = C * [i * (1 + i)^n] / [(1 + i)^n - 1]
            rataMensile = importoFinanziato * (tassoMensile * Math.pow(1 + tassoMensile, mesi)) / (Math.pow(1 + tassoMensile, mesi) - 1);
        } else {
            rataMensile = importoFinanziato / mesi;
        }
        costoTotaleInteressi = (rataMensile * mesi) - importoFinanziato;
    }

    // 4. Calcolo Svalutazione (Costo netto dell'auto nel periodo indicato)
    // Costo auto totale = Prezzo acquisto + Interessi pagati
    const svalutazioneTotale = prezzo - valoreResiduo;
    const svalutazioneAnnua = svalutazioneTotale / anni;

    // 5. Calcolo Costi Operativi Annui
    const litriCarburanteAnnui = kmAnnui / consumo;
    const costoCarburanteAnnuo = litriCarburanteAnnui * costoCarburante;
    
    const gestioneAnnua = assicurazione + bollo + manutenzione + altriCosti + costoCarburanteAnnuo;
    const costoAnnuoBase = svalutazioneAnnua + gestioneAnnua;
    const piano = [];
    let debitoResiduo = importoFinanziato;
    for (let anno = 1; anno <= anni; anno += 1) {
        let interessiAnno = 0;
        let rateAnno = 0;
        for (let mese = 0; mese < 12 && (anno - 1) * 12 + mese < mesi; mese += 1) {
            const interessiMese = debitoResiduo * ((tassoAnnuo / 100) / 12);
            const quotaCapitale = Math.min(rataMensile - interessiMese, debitoResiduo);
            interessiAnno += interessiMese; rateAnno += interessiMese + quotaCapitale; debitoResiduo -= quotaCapitale;
        }
        const costoRealeAnno = svalutazioneAnnua + gestioneAnnua + interessiAnno;
        piano.push({ anno, rate: rateAnno, interessi: interessiAnno, gestione: gestioneAnnua, reale: costoRealeAnno });
    }
    const costoAnnuoReale = costoAnnuoBase + costoTotaleInteressi / anni;
    const costoMensileReale = costoAnnuoReale / 12;
    const costoPerKm = costoAnnuoReale / kmAnnui;
    const costoTotale = costoAnnuoReale * anni;
    const budgetAutoMensile = stipendio * quotaStipendio / 100;
    const mesiPerPrezzo = prezzo / budgetAutoMensile;
    const mesiPerAnticipo = anticipo / budgetAutoMensile;
    const mesiPerTco = costoTotale / budgetAutoMensile;

    // 7. Aggiornamento UI
    document.getElementById('res-rata').innerText = number(rataMensile);
    document.getElementById('res-mensile-reale').innerText = number(costoMensileReale);
    document.getElementById('res-costo-km').innerText = euro.format(costoPerKm);
    document.getElementById('res-svalutazione').innerText = number(svalutazioneTotale);
    document.getElementById('res-totale').innerText = number(costoTotale);
    document.getElementById('res-anticipo').innerText = number(anticipo);
    document.getElementById('res-annuo').innerText = `${number(costoAnnuoReale)}/anno`;
    document.getElementById('res-peso-stipendio').innerText = `${quotaStipendio.toFixed(0)}%`;
    document.getElementById('res-tempo-prezzo').innerText = formattaMesi(mesiPerPrezzo);
    document.getElementById('res-tempo-anticipo').innerText = formattaMesi(mesiPerAnticipo);
    document.getElementById('res-tempo-tco').innerText = formattaMesi(mesiPerTco);
    document.getElementById('nota-stipendio').innerText = `Con ${number(budgetAutoMensile)} al mese (${quotaStipendio.toFixed(0)}% di ${number(stipendio)}), l'esborso complessivo del periodo equivale a ${mesiPerTco.toFixed(1)} mesi di budget auto.`;
    document.getElementById('tabella-annuale').innerHTML = piano.map((riga) => `<tr><td>${riga.anno}</td><td>${number(riga.rate)}</td><td>${number(riga.interessi)}</td><td>${number(riga.gestione)}</td><td><strong>${number(riga.reale)}</strong></td></tr>`).join('');
    disegnaGrafico(piano, svalutazioneAnnua);

    // Mostra il div dei risultati
    document.getElementById('risultati').classList.remove('hidden');
}

function formattaMesi(mesi) {
    return mesi < 12 ? `${mesi.toFixed(1)}` : `${(mesi / 12).toFixed(1)} anni`;
}

function disegnaGrafico(piano, svalutazioneAnnua) {
    const canvas = document.getElementById('grafico-costi');
    const rapporto = window.devicePixelRatio || 1;
    const larghezza = canvas.clientWidth || 500;
    canvas.width = larghezza * rapporto; canvas.height = 250 * rapporto;
    const ctx = canvas.getContext('2d'); ctx.scale(rapporto, rapporto);
    const altezza = 250; const margine = { top: 12, right: 12, bottom: 28, left: 42 };
    const massimo = Math.max(...piano.map((riga) => riga.reale), 1); const areaW = larghezza - margine.left - margine.right; const areaH = altezza - margine.top - margine.bottom;
    ctx.clearRect(0, 0, larghezza, altezza); ctx.font = '11px DM Sans'; ctx.fillStyle = '#58736b'; ctx.strokeStyle = '#e4ece7';
    for (let i = 0; i <= 4; i += 1) { const y = margine.top + areaH - (i / 4) * areaH; ctx.beginPath(); ctx.moveTo(margine.left, y); ctx.lineTo(larghezza - margine.right, y); ctx.stroke(); ctx.fillText(euro.format((massimo * i) / 4), 0, y + 4); }
    const larghezzaBarra = Math.min(42, areaW / piano.length * .6);
    piano.forEach((riga, indice) => { const x = margine.left + (indice + .5) * areaW / piano.length - larghezzaBarra / 2; let y = margine.top + areaH; const parti = [[svalutazioneAnnua, '#23745f'], [riga.interessi, '#e09b45'], [riga.gestione, '#dc6b3f']]; parti.forEach(([valore, colore]) => { const h = valore / massimo * areaH; y -= h; ctx.fillStyle = colore; ctx.fillRect(x, y, larghezzaBarra, h); }); ctx.fillStyle = '#58736b'; ctx.fillText(`A${riga.anno}`, x + 9, altezza - 8); });
    document.getElementById('legenda-grafico').innerHTML = [['Svalutazione', '#23745f'], ['Interessi', '#e09b45'], ['Gestione', '#dc6b3f']].map(([nome, colore]) => `<span style="--legend-color:${colore}">${nome}</span>`).join('');
}

document.getElementById('auto-calculator').addEventListener('submit', calcolaAmmortamento);
window.addEventListener('resize', () => { if (!document.getElementById('risultati').classList.contains('hidden')) calcolaAmmortamento(); });
calcolaAmmortamento();