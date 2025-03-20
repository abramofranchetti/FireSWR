document.addEventListener('DOMContentLoaded', function () {
    const buyBook = document.getElementById('buy-book');
    const sellBook = document.getElementById('sell-book');
    const buyOrderButton = document.getElementById('buy-order');
    const sellOrderButton = document.getElementById('sell-order');
    const buyMarketOrderButton = document.getElementById('buy-market-order');
    const sellMarketOrderButton = document.getElementById('sell-market-order');
    const addBuyOrderButton = document.getElementById('add-buy-order');
    const addSellOrderButton = document.getElementById('add-sell-order');
    const resultContainer = document.querySelector('.result p');
    const accountBalanceElement = document.getElementById('account-balance');
    const stockQuantityElement = document.getElementById('stock-quantity');
    const spreadValueElement = document.getElementById('spread-value');
    let accountBalance = 10000; // Conto personale iniziale
    let stockQuantity = 0; // Numero di azioni possedute

    class Order {
        constructor(price, quantity) {
            this.price = price;
            this.quantity = quantity;
        }
    }

    buyOrderButton.addEventListener('click', function () {
        const price = parseFloat(document.getElementById('order-price').value);
        const quantity = parseInt(document.getElementById('order-quantity').value);
        const totalCost = price * quantity;
        if (price && quantity && totalCost <= accountBalance) {
            processOrder(buyBook, sellBook, new Order(price, quantity), 'success', 'acquisto');
        } else {
            alert('Non hai abbastanza soldi per comprare.');
        }
    });

    sellOrderButton.addEventListener('click', function () {
        const price = parseFloat(document.getElementById('order-price').value);
        const quantity = parseInt(document.getElementById('order-quantity').value);
        if (price && quantity && quantity <= stockQuantity) {
            processOrder(sellBook, buyBook, new Order(price, quantity), 'danger', 'vendita');
        } else {
            alert('Non hai abbastanza azioni per vendere.');
        }
    });

    buyMarketOrderButton.addEventListener('click', function () {
        const quantity = parseInt(document.getElementById('order-quantity').value);
        if (quantity) {
            const bestSellOrder = getFirstNonEmptyChild(sellBook);
            if (bestSellOrder) {
                const price = parseFloat(bestSellOrder.textContent.match(/\d+(\.\d+)?/)[0]);
                const totalCost = price * quantity;
                if (totalCost <= accountBalance) {
                    processOrder(buyBook, sellBook, new Order(price, quantity), 'success', 'acquisto al meglio');
                } else {
                    alert('Non hai abbastanza soldi per comprare.');
                }
            }
        }
    });

    sellMarketOrderButton.addEventListener('click', function () {
        const quantity = parseInt(document.getElementById('order-quantity').value);
        if (quantity && quantity <= stockQuantity) {
            const bestBuyOrder = getFirstNonEmptyChild(buyBook);
            if (bestBuyOrder) {
                const price = parseFloat(bestBuyOrder.textContent.match(/\d+(\.\d+)?/)[0]);
                processOrder(sellBook, buyBook, new Order(price, quantity), 'danger', 'vendita al meglio');
            }
        } else {
            alert('Non hai abbastanza azioni per vendere.');
        }
    });

    addBuyOrderButton.addEventListener('click', function () {
        const price = parseFloat(document.getElementById('external-order-price').value);
        const quantity = parseInt(document.getElementById('external-order-quantity').value);
        if (price && quantity) {
            processOrder(buyBook, sellBook, new Order(price, quantity), 'success', 'offerta esterna');
        }
    });

    addSellOrderButton.addEventListener('click', function () {
        const price = parseFloat(document.getElementById('external-order-price').value);
        const quantity = parseInt(document.getElementById('external-order-quantity').value);
        if (price && quantity) {
            processOrder(sellBook, buyBook, new Order(price, quantity), 'danger', 'offerta esterna');
        }
    });

    function getFirstNonEmptyChild(book) {
        return Array.from(book.children).find(child => child.textContent.trim() !== '');
    }

    function processOrder(book, oppositeBook, order, type, operationType) {
        let oppositeOrders = Array.from(oppositeBook.children);
        let matched = false;

        for (let i = 0; i < oppositeOrders.length; i++) {
            let [orderPrice, orderQuantity] = oppositeOrders[i].textContent.match(/\d+(\.\d+)?/g).map(Number);
            if ((type === 'success' && order.price >= orderPrice) || (type === 'danger' && order.price <= orderPrice)) {
                if (order.quantity <= orderQuantity) {
                    let newQuantity = orderQuantity - order.quantity;
                    if (newQuantity > 0) {
                        oppositeOrders[i].textContent = `Prezzo: ${orderPrice}, Quantità: ${newQuantity}`;
                    } else {
                        oppositeBook.removeChild(oppositeOrders[i]);
                    }
                    matched = true;
                    if (operationType !== 'offerta esterna') {
                        updateAccountBalanceAndStock(operationType, order.price, order.quantity);
                    }
                    displayResult(operationType, order.price, order.quantity);
                    break;
                } else {
                    oppositeBook.removeChild(oppositeOrders[i]);
                    order.quantity -= orderQuantity;
                    if (operationType !== 'offerta esterna') {
                        updateAccountBalanceAndStock(operationType, order.price, orderQuantity);
                    }
                    displayResult(operationType, order.price, orderQuantity);
                }
            }
        }

        if (!matched) {
            addOrder(book, order, type);
        }

        sortBook(buyBook, 'desc');
        sortBook(sellBook, 'asc');
        updateSpreadValue();
    }

    function addOrder(book, order, type) {
        let existingOrder = Array.from(book.children).find(orderItem => {
            let orderPrice = parseFloat(orderItem.textContent.match(/\d+(\.\d+)?/)[0]);
            return orderPrice === order.price;
        });

        if (existingOrder) {
            let currentQuantity = parseInt(existingOrder.textContent.match(/\d+(\.\d+)?/g)[1]);
            existingOrder.textContent = `Prezzo: ${order.price}, Quantità: ${currentQuantity + order.quantity}`;
        } else {
            const orderItem = document.createElement('li');
            orderItem.className = `list-group-item list-group-item-${type}`;
            orderItem.textContent = `Prezzo: ${order.price}, Quantità: ${order.quantity}`;
            book.appendChild(orderItem);
        }
    }

    function sortBook(book, order) {
        let orders = Array.from(book.children);
        orders.sort((a, b) => {
            let priceA = parseFloat(a.textContent.match(/\d+(\.\d+)?/)[0]);
            let priceB = parseFloat(b.textContent.match(/\d+(\.\d+)?/)[0]);
            return order === 'asc' ? priceA - priceB : priceB - priceA;
        });
        orders.forEach(order => book.appendChild(order));
    }

    function displayResult(operationType, price, quantity) {
        const resultItem = document.createElement('p');
        const now = new Date();
        const formattedDate = now.toLocaleString();
        resultItem.textContent = `${formattedDate} ||  ${operationType} || Prezzo ${price} || Quantità ${quantity}`;
        resultContainer.insertBefore(resultItem, resultContainer.firstChild);
    }

    function updateAccountBalanceAndStock(operationType, price, quantity) {
        const total = price * quantity;
        if (operationType.includes('acquisto')) {
            accountBalance -= total;
            stockQuantity += quantity;
        } else if (operationType.includes('vendita')) {
            accountBalance += total;
            stockQuantity -= quantity;
        }
        accountBalanceElement.textContent = accountBalance.toFixed(2);
        stockQuantityElement.textContent = stockQuantity;
        console.log(`Saldo attuale: €${accountBalance.toFixed(2)}, Azioni possedute: ${stockQuantity}`);
    }

    function updateSpreadValue() {
        const bestBuyOrder = getFirstNonEmptyChild(buyBook);
        const bestSellOrder = getFirstNonEmptyChild(sellBook);
        if (bestBuyOrder && bestSellOrder) {
            const bestBuyPrice = parseFloat(bestBuyOrder.textContent.match(/\d+(\.\d+)?/)[0]);
            const bestSellPrice = parseFloat(bestSellOrder.textContent.match(/\d+(\.\d+)?/)[0]);
            const spread = bestSellPrice - bestBuyPrice;
            spreadValueElement.textContent = `${spread.toFixed(2)}€`;
        } else {
            spreadValueElement.textContent = '0.00€';
        }
    }

    // Popola il book con dati di test
    const testBuyOrders = [
        new Order(100, 10),
        new Order(99, 20),
        new Order(98, 30),
        new Order(97, 40),
        new Order(96, 50),
        new Order(95, 60),
        new Order(94, 70),
        new Order(93, 80),
        new Order(92, 90),
        new Order(91, 100),
        new Order(90, 110)
        
    ];
    const testSellOrders = [
        new Order(101, 10),
        new Order(102, 20),
        new Order(103, 30),
        new Order(104, 40),
        new Order(105, 50),
        new Order(106, 60),
        new Order(107, 70),
        new Order(108, 80),
        new Order(109, 90),
        new Order(110, 100)
    ];

    testBuyOrders.forEach(order => addOrder(buyBook, order, 'success'));
    testSellOrders.forEach(order => addOrder(sellBook, order, 'danger'));
    sortBook(buyBook, 'desc');
    sortBook(sellBook, 'asc');
    updateSpreadValue();
});
