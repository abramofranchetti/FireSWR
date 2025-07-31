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
            // Data emissione e aggiornamento
            let infoDate = '';
            const dataEm = data.querySelector('data_emissione');
            if (dataEm && dataEm.getAttribute('date')) {
                infoDate += `<span class="badge badge-info mr-2">Emissione: ${dataEm.getAttribute('date')}</span>`;
            }
            const dataAgg = data.querySelector('data_aggiornamento');
            if (dataAgg && dataAgg.getAttribute('date')) {
                infoDate += `<span class="badge badge-warning">Aggiornamento: ${dataAgg.getAttribute('date')}</span>`;
            }
            if (infoDate) {
                container.innerHTML = `<div class="mb-3 text-center">${infoDate}</div>`;
            } else {
                container.innerHTML = '';
            }

            const bollettini = data.querySelectorAll('bollettino');
            if (bollettini.length === 0) {
                container.innerHTML += '<div class="alert alert-warning">Nessun dato disponibile.</div>';
                return;
            }

            let html = '<div class="row">';
            bollettini.forEach(bollettino => {
                const nome = bollettino.getAttribute('name') || '';
                const titolo = bollettino.getAttribute('title') || '';
                const evoluzione = bollettino.querySelector('evoluzionegenerale') ? bollettino.querySelector('evoluzionegenerale').textContent : '';
                html += `<div class="col-lg-6 col-md-12 mb-4"><div class="card h-100 shadow border-primary">
                    <div class="card-header bg-primary text-white text-center font-weight-bold">${nome}</div>
                    <div class="card-body p-2">
                        <div class="font-italic mb-2" style="font-size:0.95em">${titolo}</div>
                        <div class="mb-2" style="font-size:0.95em">${evoluzione}</div>
                `;

                // Immagini principali dei giorni (se presenti)
                const giorni = bollettino.querySelectorAll('giorno');
                giorni.forEach(giorno => {
                    const dataGiorno = giorno.getAttribute('data') || '';
                    let testo = '';
                    const textNode = giorno.querySelector('text');
                    if (textNode && textNode.textContent.trim() !== '') {
                        testo = textNode.textContent.trim();
                    } else if (giorno.textContent && giorno.textContent.trim() !== '') {
                        testo = giorno.textContent.trim();
                    }
                    // Immagine/meteo
                    let imgHtml = '';
                    const imgNode = giorno.querySelector('img');
                    if (imgNode && imgNode.getAttribute('src')) {
                        const src = imgNode.getAttribute('src');
                        const caption = imgNode.getAttribute('caption')||'';
                        imgHtml = `<img src="${src}" alt="${caption}" class="img-fluid mb-2 meteo-thumb" style="max-height:80px;cursor:pointer;" data-full="${src}" data-caption="${caption}">`;
                    }
                    html += `<div class="border-bottom pb-2 mb-2">
                        <div class="d-flex align-items-center mb-1">
                            <span class="badge badge-secondary mr-2">${dataGiorno}</span>
                            ${imgHtml}
                        </div>
                        <div style="font-size:0.95em">${testo}</div>
                    </div>`;
                });

                // Località e temperature (solo per Dolomiti Meteo)
                const previsioniLocalita = bollettino.querySelectorAll('previsioni_localita > localita');
                if (previsioniLocalita.length > 0) {
                    html += `<div class="mt-3"><b>Previsioni località:</b></div>`;
                    previsioniLocalita.forEach(localita => {
                        const nomeLoc = localita.getAttribute('nome') || '';
                        const tmin = localita.querySelector('tmin') ? localita.querySelector('tmin').getAttribute('value') : '';
                        const tmax = localita.querySelector('tmax') ? localita.querySelector('tmax').getAttribute('value') : '';
                        // Simbolo/meteo per la prima scadenza (se presente)
                        let simbolo = '';
                        const scadenza = localita.querySelector('scadenza');
                        if (scadenza) {
                            const cielo = scadenza.querySelector('cielo') ? scadenza.querySelector('cielo').getAttribute('value').toLowerCase() : '';
                            let iconClass = iconMap[cielo] || 'fas fa-question-circle text-muted';
                            simbolo = `<i class="${iconClass} fa-lg mr-1"></i>`;
                        }
                        html += `<div class="d-flex align-items-center mb-1">
                            <span class="badge badge-info mr-2">${nomeLoc}</span>
                            ${simbolo}
                            <span class="badge badge-light ml-2">Min ${tmin}°C</span>
                            <span class="badge badge-danger ml-1">Max ${tmax}°C</span>
                        </div>`;
                    });
                }

                html += `</div></div></div>`;
            });
            html += '</div>';

            // Meteogrammi (icone e simboli per zone)
            const meteogrammi = data.querySelectorAll('meteogramma');
            if (meteogrammi.length > 0) {
                html += '<div class="row mt-4">';
                meteogrammi.forEach(meteogramma => {
                    const zona = meteogramma.getAttribute('name') || '';
                    html += `<div class="col-lg-4 col-md-6 mb-4"><div class="card h-100 border-info shadow">
                        <div class="card-header bg-info text-white text-center font-weight-bold">${zona}</div>
                        <div class="card-body p-2">`;
                    const scadenze = meteogramma.querySelectorAll('scadenza');
                    scadenze.forEach(scad => {
                        const dataScad = scad.getAttribute('data') || '';
                        // Simbolo/meteo
                        let simbolo = '';
                        const prevSimbolo = scad.querySelector('previsione[title="Simbolo"][type="image"]');
                        if (prevSimbolo && prevSimbolo.getAttribute('value')) {
                            const src = prevSimbolo.getAttribute('value');
                            simbolo = `<img src="${src}" alt="simbolo" style="max-height:32px;max-width:32px;cursor:pointer;" class="mr-1 meteo-thumb" data-full="${src}">`;
                        }
                        // Cielo
                        const prevCielo = scad.querySelector('previsione[title="Cielo"][type="text"]');
                        const cielo = prevCielo ? prevCielo.getAttribute('value') : '';
                        html += `<div class="d-flex align-items-center mb-1">
                            <span class="badge badge-secondary mr-2">${dataScad}</span>
                            ${simbolo}
                            <span class="ml-2">${cielo}</span>
                        </div>`;
                    });
                    html += `</div></div></div>`;
                });
                html += '</div>';
            }

            container.innerHTML += html;

            // Overlay per immagini ingrandite
            if (!document.getElementById('meteo-img-modal')) {
                const modal = document.createElement('div');
                modal.id = 'meteo-img-modal';
                modal.style = 'display:none;position:fixed;z-index:9999;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);justify-content:center;align-items:center;flex-direction:column;';
                modal.innerHTML = `<img id="meteo-img-modal-img" src="" style="max-width:90vw;max-height:80vh;border:4px solid #fff;border-radius:8px;box-shadow:0 0 20px #000;" alt=""><div id="meteo-img-modal-caption" style="color:#fff;margin-top:10px;text-align:center;"></div><button id="meteo-img-modal-close" style="margin-top:20px;padding:8px 24px;font-size:1.2em;border:none;border-radius:6px;background:#007bff;color:#fff;">Chiudi</button>`;
                modal.style.display = 'none';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100vw';
                modal.style.height = '100vh';
                modal.style.background = 'rgba(0,0,0,0.8)';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.flexDirection = 'column';
                modal.style.display = 'none';
                modal.style.zIndex = '9999';
                modal.style.textAlign = 'center';
                modal.style.padding = '20px';
                modal.style.boxSizing = 'border-box';
                modal.style.overflowY = 'auto';
                modal.style.transition = 'opacity 0.2s';
                modal.style.opacity = '0';
                document.body.appendChild(modal);
            }

            // Eventi click per immagini
            setTimeout(() => {
                document.querySelectorAll('.meteo-thumb').forEach(img => {
                    img.addEventListener('click', function(e) {
                        const modal = document.getElementById('meteo-img-modal');
                        const modalImg = document.getElementById('meteo-img-modal-img');
                        const modalCaption = document.getElementById('meteo-img-modal-caption');
                        modalImg.src = this.getAttribute('data-full');
                        modalCaption.textContent = this.getAttribute('data-caption') || '';
                        modal.style.display = 'flex';
                        setTimeout(()=>{modal.style.opacity='1';},10);
                    });
                });
                document.getElementById('meteo-img-modal-close').onclick = function() {
                    const modal = document.getElementById('meteo-img-modal');
                    modal.style.opacity = '0';
                    setTimeout(()=>{modal.style.display='none';},200);
                };
                document.getElementById('meteo-img-modal').onclick = function(e) {
                    if(e.target === this) {
                        this.style.opacity = '0';
                        setTimeout(()=>{this.style.display='none';},200);
                    }
                };
            }, 100);
        })
        .catch(err => {
            container.innerHTML = '<div class="alert alert-danger">Errore nel caricamento dei dati meteo.</div>';
        });
});
