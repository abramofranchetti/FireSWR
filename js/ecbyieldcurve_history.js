document.addEventListener('DOMContentLoaded', async function () {
    const response = await fetch('json/ecb_yieldcurve_history.json');
    const history = await response.json();
    const dates = Object.keys(history.dates).sort();
    const ratingSelect = document.getElementById('rating');
    const curveSelect = document.getElementById('curve-type');
    const fromSelect = document.getElementById('date-from');
    const toSelect = document.getElementById('date-to');
    const metrics = document.getElementById('metrics');
    let animationTimer = null;

    dates.forEach(date => {
        fromSelect.add(new Option(date, date));
        toSelect.add(new Option(date, date));
    });
    fromSelect.selectedIndex = Math.max(0, dates.length - 2);
    toSelect.selectedIndex = dates.length - 1;

    function pointsFor(date, rating, curveType) {
        return history.dates[date]?.[rating]?.[curveType] || [];
    }

    function pointAt(points, maturity) {
        return points.find(point => Math.abs(point.maturity - maturity) < 0.01)?.yield ?? null;
    }

    function render() {
        const firstDate = fromSelect.value;
        const secondDate = toSelect.value;
        const rating = ratingSelect.value;
        const curveType = curveSelect.value;
        const firstPoints = pointsFor(firstDate, rating, curveType);
        const secondPoints = pointsFor(secondDate, rating, curveType);
        window.curveHistoryCharts?.forEach(chart => chart.destroy());

        const curveChart = new Chart(document.getElementById('curve-chart'), {
            type: 'line',
            data: { datasets: [
                { label: firstDate, data: firstPoints.map(point => ({ x: point.maturity, y: point.yield })), borderColor: '#1c5d99', pointRadius: 0, tension: 0.15 },
                { label: secondDate, data: secondPoints.map(point => ({ x: point.maturity, y: point.yield })), borderColor: '#e05a47', pointRadius: 0, tension: 0.15 }
            ] },
            options: chartOptions('Rendimento (%)', false)
        });
        const changes = secondPoints.map(secondPoint => {
            const firstPoint = firstPoints.find(point => Math.abs(point.maturity - secondPoint.maturity) < 0.01);
            return { x: secondPoint.maturity, y: firstPoint ? (secondPoint.yield - firstPoint.yield) * 100 : null };
        }).filter(point => point.y !== null);
        const changeChart = new Chart(document.getElementById('change-chart'), {
            type: 'line',
            data: { datasets: [{ label: `${secondDate} meno ${firstDate}`, data: changes, borderColor: '#d68b32', backgroundColor: 'rgba(214,139,50,.14)', fill: true, pointRadius: 0, tension: 0.15 }] },
            options: chartOptions('Variazione (bp)', changes)
        });
        window.curveHistoryCharts = [curveChart, changeChart];
        renderMetrics(firstDate, secondDate, firstPoints, secondPoints);
    }

    function chartOptions(yTitle, changes = null) {
        const maxChange = changes ? Math.max(1, ...changes.map(point => Math.abs(point.y))) : null;
        const changePadding = maxChange ? Math.max(1, maxChange * 0.15) : 0;
        const changeScale = maxChange ? { min: -(maxChange + changePadding), max: maxChange + changePadding } : {};
        return { responsive: true, maintainAspectRatio: false, interaction: { mode: 'nearest', intersect: false },
            plugins: { legend: { position: 'top' } },
            scales: { x: { type: 'linear', min: 0, max: 30, title: { display: true, text: 'Scadenza (anni)' } },
                y: { title: { display: true, text: yTitle }, ...changeScale } } };
    }

    function renderMetrics(firstDate, secondDate, firstPoints, secondPoints) {
        const values = [2, 10, 30].map(maturity => {
            const firstValue = pointAt(firstPoints, maturity);
            const secondValue = pointAt(secondPoints, maturity);
            return secondValue !== null && firstValue !== null ? (secondValue - firstValue) * 100 : null;
        });
        const slopeFirst = pointAt(firstPoints, 30) - pointAt(firstPoints, 2);
        const slopeSecond = pointAt(secondPoints, 30) - pointAt(secondPoints, 2);
        const average = secondPoints.reduce((total, secondPoint) => {
            const firstPoint = firstPoints.find(point => Math.abs(point.maturity - secondPoint.maturity) < 0.01);
            return total + (firstPoint ? Math.abs(secondPoint.yield - firstPoint.yield) * 100 : 0);
        }, 0) / Math.max(1, secondPoints.length);
        const slopeChange = (slopeSecond - slopeFirst) * 100;
        metrics.innerHTML = `<div><span>2 anni</span><strong>${formatBp(values[0])}</strong></div>
            <div><span>10 anni</span><strong>${formatBp(values[1])}</strong></div>
            <div><span>30 anni</span><strong>${formatBp(values[2])}</strong></div>
            <div><span>Pendenza 30Y-2Y</span><strong>${formatBp(slopeChange)}</strong></div>
            <div><span>Movimento medio</span><strong>${average.toFixed(0)} bp</strong></div>`;
    }

    function formatBp(value) { return value === null ? 'n/d' : `${value >= 0 ? '+' : ''}${value.toFixed(0)} bp`; }
    [ratingSelect, curveSelect, fromSelect, toSelect].forEach(select => select.addEventListener('change', render));
    document.getElementById('animate').addEventListener('click', function () {
        if (animationTimer) { clearInterval(animationTimer); animationTimer = null; this.textContent = 'Riproduci evoluzione'; return; }
        let index = Math.max(0, dates.indexOf(fromSelect.value));
        this.textContent = 'Pausa evoluzione';
        animationTimer = setInterval(() => {
            if (index >= dates.length) { clearInterval(animationTimer); animationTimer = null; this.textContent = 'Riproduci evoluzione'; return; }
            toSelect.value = dates[index++];
            render();
        }, 700);
    });
    render();
});