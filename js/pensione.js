 function aggiornaCalcolo() {
      const renditaReale = parseFloat(document.getElementById('rendita').value);
      const anniContributivi = parseInt(document.getElementById('anniContributivi').value);
      const anniPensione = parseInt(document.getElementById('anniPensione').value);
      const inflazione = parseFloat(document.getElementById('inflazione').value) / 100;

      // Calcolo della rendita nominale futura
      const renditaNominale = renditaReale * Math.pow(1 + inflazione, anniContributivi);

      // Capitale totale necessario per sostenere quella rendita per X anni
      const capitaleRichiesto = renditaNominale * 12 * anniPensione;

      // Accantonamento mensile
      const accantonamentoMensile = capitaleRichiesto / (anniContributivi * 12);

      // Mostra risultati
      document.getElementById('risultati').innerHTML = `
        <strong>Rendita mensile futura rivalutata all'inflazione (per avere lo stesso potere d'acquisto di oggi):</strong> €${renditaNominale.toFixed(2)}<br>
        <strong>Capitale totale necessario:</strong> €${capitaleRichiesto.toFixed(2)}<br>
        <strong>Accantonamento mensile da oggi:</strong> €${accantonamentoMensile.toFixed(2)}
      `;
    }

    document.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', aggiornaCalcolo);
    });

    aggiornaCalcolo(); // iniziale