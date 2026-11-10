(function () {
    'use strict';

    const DATA_URL = 'json/inflazione_personale.json';
    const STORAGE_KEY = 'fireswr-personal-inflation-expenses-v1';
    const groupNames = {
        CP01: 'Alimentari e bevande analcoliche',
        CP02: 'Bevande alcoliche, tabacchi e narcotici',
        CP03: 'Abbigliamento e calzature',
        CP04: 'Abitazione, acqua, elettricità, gas e altri combustibili',
        CP05: 'Mobili, articoli e servizi per la casa',
        CP06: 'Salute',
        CP07: 'Trasporti',
        CP08: 'Comunicazioni',
        CP09: 'Ricreazione e cultura',
        CP10: 'Istruzione',
        CP11: 'Ristoranti e alberghi',
        CP12: 'Beni e servizi vari'
    };

    const elements = {
        baseMonth: document.getElementById('baseMonth'),
        targetMonth: document.getElementById('targetMonth'),
        clearExpenses: document.getElementById('clearExpenses'),
        exportExpenses: document.getElementById('exportExpenses'),
        loadStatus: document.getElementById('loadStatus'),
        personalRate: document.getElementById('personalRate'),
        monthlyTotal: document.getElementById('monthlyTotal'),
        updatedTotal: document.getElementById('updatedTotal'),
        categorySearch: document.getElementById('categorySearch'),
        dataInfo: document.getElementById('dataInfo'),
        expenseRows: document.getElementById('expenseRows'),
        dataSource: document.getElementById('dataSource')
    };

    const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
    const percent = new Intl.NumberFormat('it-IT', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: 'always'
    });

    let categories = [];
    let expenses = {};

    function setStatus(message, kind) {
        elements.loadStatus.className = 'alert alert-' + kind;
        elements.loadStatus.textContent = message;
    }

    function formatMonth(month) {
        const parts = month.split('-');
        return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
            .format(new Date(Number(parts[0]), Number(parts[1]) - 1, 15));
    }

    function readSavedExpenses() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === null) {
            return {};
        }

        const parsed = JSON.parse(saved);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('I dati delle spese salvati nel browser non sono validi.');
        }
        return parsed;
    }

    function saveExpenses() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }

    function setButtonAvailability(enabled) {
        elements.baseMonth.disabled = !enabled;
        elements.targetMonth.disabled = !enabled;
        elements.clearExpenses.disabled = !enabled;
        elements.exportExpenses.disabled = !enabled;
        elements.categorySearch.disabled = !enabled;
    }

    function createMonthOptions(months) {
        for (const month of months) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = formatMonth(month);
            elements.baseMonth.appendChild(option);

            const targetOption = option.cloneNode(true);
            elements.targetMonth.appendChild(targetOption);
        }

        const target = months[months.length - 1];
        const targetIndex = months.indexOf(target);
        const priorYearDate = (Number(target.slice(0, 4)) - 1) + '-' + target.slice(5);
        const base = months.includes(priorYearDate) ? priorYearDate : months[Math.max(0, targetIndex - 12)];

        elements.targetMonth.value = target;
        elements.baseMonth.value = base || months[0];
    }

    function categoryGroup(category) {
        return category.code.slice(0, 4);
    }

    function createTable() {
        const groups = new Map();
        for (const category of categories) {
            const groupCode = categoryGroup(category);
            if (!groups.has(groupCode)) {
                groups.set(groupCode, []);
            }
            groups.get(groupCode).push(category);
        }

        const fragment = document.createDocumentFragment();
        for (const [groupCode, entries] of groups) {
            const groupRow = document.createElement('tr');
            groupRow.className = 'group-row';
            groupRow.dataset.group = groupCode;
            const groupHeader = document.createElement('th');
            groupHeader.colSpan = 2;
            groupHeader.scope = 'rowgroup';
            groupHeader.className = 'group-name';
            groupHeader.textContent = groupNames[groupCode] || entries[0].group;

            const amountCell = document.createElement('th');
            amountCell.colSpan = 1;
            amountCell.className = 'text-right';
            amountCell.dataset.groupTotal = groupCode;
            amountCell.textContent = '—';

            const shareCell = document.createElement('th');
            shareCell.colSpan = 1;
            shareCell.className = 'text-right';
            shareCell.dataset.groupShare = groupCode;
            shareCell.textContent = '—';

            const emptyCell = document.createElement('th');
            emptyCell.colSpan = 2;
            emptyCell.setAttribute('aria-hidden', 'true');
            groupRow.append(groupHeader, amountCell, shareCell, emptyCell);
            fragment.appendChild(groupRow);

            for (const category of entries) {
                const row = document.createElement('tr');
                row.className = 'category-row';
                row.dataset.code = category.code;
                row.dataset.group = groupCode;

                const nameCell = document.createElement('td');
                nameCell.textContent = category.name;
                nameCell.dataset.search = (category.name + ' ' + category.code + ' ' +
                    (groupNames[groupCode] || category.group)).toLocaleLowerCase('it');

                const codeCell = document.createElement('td');
                codeCell.className = 'category-code';
                codeCell.textContent = category.code;

                const expenseCell = document.createElement('td');
                expenseCell.className = 'text-right';
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.step = '0.01';
                input.inputMode = 'decimal';
                input.className = 'form-control form-control-sm expense-input ml-auto';
                input.setAttribute('aria-label', 'Spesa mensile per ' + category.name);
                input.value = Number.isFinite(Number(expenses[category.code]))
                    ? expenses[category.code]
                    : '';
                input.addEventListener('input', function () {
                    const value = input.valueAsNumber;
                    if (input.value === '') {
                        delete expenses[category.code];
                    } else if (Number.isFinite(value) && value >= 0) {
                        expenses[category.code] = value;
                    } else {
                        delete expenses[category.code];
                    }
                    saveExpenses();
                    updateResults();
                });
                expenseCell.appendChild(input);

                const weightCell = document.createElement('td');
                weightCell.className = 'text-right';
                weightCell.dataset.weight = category.code;
                weightCell.textContent = '—';

                const rateCell = document.createElement('td');
                rateCell.className = 'text-right';
                rateCell.dataset.rate = category.code;
                rateCell.textContent = '—';

                const contributionCell = document.createElement('td');
                contributionCell.className = 'text-right';
                contributionCell.dataset.contribution = category.code;
                contributionCell.textContent = '—';

                row.append(nameCell, codeCell, expenseCell, weightCell, rateCell, contributionCell);
                fragment.appendChild(row);
            }
        }

        elements.expenseRows.replaceChildren(fragment);
    }

    function getPeriodRate(category, base, target) {
        const startIndex = category.values[base];
        const endIndex = category.values[target];
        if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex) || startIndex <= 0) {
            return null;
        }
        return endIndex / startIndex - 1;
    }

    function updateResults() {
        const base = elements.baseMonth.value;
        const target = elements.targetMonth.value;
        const totalsByGroup = new Map();
        const active = [];
        let total = 0;
        let missing = 0;

        for (const category of categories) {
            const amount = Number(expenses[category.code]) || 0;
            const rate = getPeriodRate(category, base, target);
            const row = elements.expenseRows.querySelector('[data-code="' + category.code + '"]');

            if (amount > 0) {
                total += amount;
                active.push({ category, amount, rate });
                if (rate === null) {
                    missing += 1;
                }
            }

            if (row) {
                row.querySelector('[data-rate]').textContent = rate === null ? 'n.d.' : percent.format(rate);
                row.querySelector('[data-weight]').textContent = '—';
                row.querySelector('[data-contribution]').textContent = '—';
            }

            const groupCode = categoryGroup(category);
            totalsByGroup.set(groupCode, (totalsByGroup.get(groupCode) || 0) + amount);
        }

        for (const [groupCode, amount] of totalsByGroup) {
            const groupTotal = elements.expenseRows.querySelector('[data-group-total="' + groupCode + '"]');
            const groupShare = elements.expenseRows.querySelector('[data-group-share="' + groupCode + '"]');
            groupTotal.textContent = amount > 0 ? euro.format(amount) : '—';
            groupShare.textContent = total > 0 && amount > 0
                ? percent.format(amount / total)
                : '—';
        }

        if (total <= 0) {
            elements.personalRate.textContent = '—';
            elements.monthlyTotal.textContent = euro.format(0);
            elements.updatedTotal.textContent = '—';
            setStatus('Inserisci la spesa mensile in almeno una sottocategoria per calcolare il tuo paniere.', 'info');
            return;
        }

        elements.monthlyTotal.textContent = euro.format(total);
        if (missing > 0) {
            elements.personalRate.textContent = '—';
            elements.updatedTotal.textContent = '—';
            setStatus(
                missing + ' voce/i con spesa inserita non hanno un indice disponibile per entrambi i mesi selezionati. ' +
                'Scegli un altro periodo oppure rimuovi la spesa dalle voci senza dati.',
                'danger'
            );
            return;
        }

        let weightedRate = 0;
        for (const item of active) {
            const weight = item.amount / total;
            weightedRate += weight * item.rate;
            const row = elements.expenseRows.querySelector('[data-code="' + item.category.code + '"]');
            row.querySelector('[data-weight]').textContent = percent.format(weight);
            row.querySelector('[data-contribution]').textContent = percent.format(weight * item.rate);
        }

        elements.personalRate.textContent = percent.format(weightedRate);
        elements.updatedTotal.textContent = euro.format(total * (1 + weightedRate));
        setStatus(
            'Stima calcolata per il periodo ' + formatMonth(base) + ' – ' + formatMonth(target) +
            ' su ' + active.length + ' sottocategorie.',
            'success'
        );
    }

    function filterCategories() {
        const query = elements.categorySearch.value.trim().toLocaleLowerCase('it');
        const visibleGroups = new Set();
        for (const row of elements.expenseRows.querySelectorAll('.category-row')) {
            const visible = row.firstElementChild.dataset.search.includes(query);
            row.hidden = !visible;
            if (visible) {
                visibleGroups.add(row.dataset.group);
            }
        }
        for (const row of elements.expenseRows.querySelectorAll('.group-row')) {
            row.hidden = !visibleGroups.has(row.dataset.group);
        }
    }

    function exportCsv() {
        const lines = [['Codice COICOP', 'Sottocategoria', 'Spesa mensile EUR']];
        for (const category of categories) {
            const amount = Number(expenses[category.code]) || 0;
            if (amount > 0) {
                lines.push([category.code, category.name, String(amount)]);
            }
        }
        const csv = '\uFEFF' + lines.map(function (line) {
            return line.map(function (field) {
                return '"' + String(field).replaceAll('"', '""') + '"';
            }).join(';');
        }).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'spese-inflazione-personale.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    function bindEvents() {
        elements.baseMonth.addEventListener('change', updateResults);
        elements.targetMonth.addEventListener('change', updateResults);
        elements.categorySearch.addEventListener('input', filterCategories);
        elements.clearExpenses.addEventListener('click', function () {
            if (!window.confirm('Vuoi cancellare tutte le spese salvate in questo browser?')) {
                return;
            }
            expenses = {};
            saveExpenses();
            for (const input of elements.expenseRows.querySelectorAll('.expense-input')) {
                input.value = '';
            }
            updateResults();
        });
        elements.exportExpenses.addEventListener('click', exportCsv);
    }

    async function initialize() {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error('Impossibile caricare i dati Eurostat (HTTP ' + response.status + ').');
        }

        const data = await response.json();
        if (!Array.isArray(data.categories) || !Array.isArray(data.months) || data.months.length < 2) {
            throw new Error('Il file degli indici Eurostat non ha il formato atteso.');
        }

        categories = data.categories;
        expenses = readSavedExpenses();
        createMonthOptions(data.months);
        createTable();
        setButtonAvailability(true);
        elements.dataInfo.textContent = categories.length + ' sottocategorie · dati aggiornati al ' +
            (data.updated || 'dato non disponibile');
        const sourceLink = document.createElement('a');
        sourceLink.href = 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_midx/default/table?lang=en';
        sourceLink.textContent = 'Eurostat, HICP monthly data (index), dataset prc_hicp_midx';
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        elements.dataSource.replaceChildren(
            'Fonte: ',
            sourceLink,
            '; Italia, frequenza mensile. Ultimo aggiornamento dichiarato da Eurostat: ',
            data.updated || 'dato non disponibile',
            '.'
        );
        bindEvents();
        updateResults();
    }

    initialize().catch(function (error) {
        setStatus(error.message || 'Errore durante il caricamento dei dati.', 'danger');
        elements.dataInfo.textContent = 'Verifica la connessione o riprova più tardi.';
    });
}());
