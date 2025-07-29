document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('meteo-previsioni');
    const feedUrl = 'xml/bollettino_utenti.xml';

    // Mappa icone ARPAV -> FontAwesome/meteo
    const iconMap = {
        'sereno': 'fas fa-sun text-warning',
        'poco nuvoloso': 'fas fa-cloud-sun text-info',
        'parzialmente nuvoloso': 'fas fa-cloud-sun text-secondary',
        'nuvoloso': 'fas fa-cloud text-secondary',
        'molto nuvoloso': 'fas fa-cloud text-dark',
        'coperto': 'fas fa-smog text-dark',
        'pioggia': 'fas fa-cloud-showers-heavy text-primary',
        'rovesci': 'fas fa-cloud-rain text-primary',
        'temporale': 'fas fa-bolt text-warning',
        'neve': 'fas fa-snowflake text-info',
        'nebbia': 'fas fa-smog text-muted'
    };

    fetch(feedUrl)
        .then(response => response.text())
        .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
        .then(data => {
            const provinceNodes = data.querySelectorAll('bollettino > provincia');
            if (provinceNodes.length === 0) {
                container.innerHTML = '<div class="alert alert-warning">Nessun dato disponibile.</div>';
                return;
            }

            let html = '<div class="row">';
            provinceNodes.forEach(provincia => {
                const nome = provincia.getAttribute('nome');
                const previsioni = provincia.querySelectorAll('giorno');
                html += `<div class="col-lg-4 col-md-6 mb-4"><div class="card h-100 shadow border-primary">
                    <div class="card-header bg-primary text-white text-center font-weight-bold">${nome}</div>
                    <div class="card-body p-2">`;

                previsioni.forEach(giorno => {
                    const dataGiorno = giorno.getAttribute('data');
                    const testo = giorno.querySelector('testo') ? giorno.querySelector('testo').textContent : '';
                    const statoCielo = giorno.querySelector('stato_cielo') ? giorno.querySelector('stato_cielo').textContent.toLowerCase() : '';
                    const tmin = giorno.querySelector('tmin') ? giorno.querySelector('tmin').textContent : '';
                    const tmax = giorno.querySelector('tmax') ? giorno.querySelector('tmax').textContent : '';
                    // Scegli l'icona
                    let iconClass = iconMap[statoCielo] || 'fas fa-question-circle text-muted';

                    html += `<div class="border-bottom pb-2 mb-2">
                        <div class="d-flex align-items-center mb-1">
                            <span class="badge badge-secondary mr-2">${dataGiorno}</span>
                            <i class="${iconClass} fa-2x mr-2"></i>
                            <span class="ml-auto">
                                <span class="badge badge-info">Min ${tmin}°C</span>
                                <span class="badge badge-danger">Max ${tmax}°C</span>
                            </span>
                        </div>
                        <div style="font-size:0.95em">${testo}</div>
                    </div>`;
                });

                html += `</div></div></div>`;
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei dati meteo.</div>';
        });
});
