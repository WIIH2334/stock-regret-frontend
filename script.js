document.addEventListener('DOMContentLoaded', function() {
  let companies = []; // Initialize empty, to be filled by fetch

  // Fetch the full stock list from the server
  fetch('https://stock-regret-backend.onrender.com/stocks')
    .then(response => {
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      return response.json();
    })
    .then(data => {
      companies = data;
      console.log(`Loaded ${companies.length} stocks`);
    })
    .catch(err => console.error('Error loading stocks:', err));

  const items = [
    { name: "MacBook Air", price: 1000, icon: "fa-laptop" },
    { name: "iPhone", price: 800, icon: "fa-mobile-alt" },
    { name: "AirPods", price: 150, icon: "fa-headphones" },
    { name: "Tesla Model 3", price: 40000, icon: "fa-car" },
    { name: "Vacation Trip", price: 2000, icon: "fa-plane" }
  ];

  async function getHistoricalPrice(ticker, date) {
    const response = await fetch(`https://stock-regret-backend.onrender.com/stock/${ticker}/${date}`);
    const data = await response.json();
    if (data.error) {
      console.error(`Error fetching ${ticker} on ${date}: ${data.error}`);
      return null;
    }
    const price = Number(data.price).toFixed(2);
    console.log(`Price for ${ticker} on ${date}:`, price);
    return price;
  }

  async function getCurrentPrice(ticker) {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`https://stock-regret-backend.onrender.com/stock/${ticker}/${today}`);
    const data = await response.json();
    if (data.error) {
      console.error(`Error fetching ${ticker} today: ${data.error}`);
      return null;
    }
    const price = Number(data.price).toFixed(2);
    console.log(`Price for ${ticker} today:`, price);
    return price;
  }

  const tickerSearch = document.getElementById('ticker-search');
  const suggestionsDiv = document.getElementById('ticker-suggestions');
  const tickerInput = document.getElementById('ticker');
  const sharesInput = document.getElementById('shares');
  const boughtDateInput = document.getElementById('bought-date');
  const soldDateInput = document.getElementById('sold-date');

  function updateSuggestions(query) {
    suggestionsDiv.innerHTML = '';
    const clearSearch = document.getElementById('clear-search');
    if (clearSearch) clearSearch.style.display = query ? 'block' : 'none';
    
    if (!query || companies.length === 0) { // Check if companies is still empty
      suggestionsDiv.style.display = 'none';
      return;
    }

    const matches = companies.filter(company => {
      const symbol = company.symbol || ""; // Use symbol, fallback to empty
      const name = company.name || "";
      return symbol.toLowerCase().includes(query) || 
             name.toLowerCase().includes(query);
    }).slice(0, 10); // Limit to 10 suggestions

    if (matches.length > 0) {
      matches.forEach(company => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
          <span>${company.symbol} - ${company.name}</span>
        `; // Use symbol directly, no fallbacks needed now
        item.addEventListener('click', function() {
          tickerSearch.value = `${company.symbol} - ${company.name}`;
          tickerInput.value = company.symbol; // Just the symbol for form
          suggestionsDiv.style.display = 'none';
          tickerSearch.style.background = 'none';
          tickerSearch.style.paddingLeft = '8px';
        });
        suggestionsDiv.appendChild(item);
      });
      suggestionsDiv.style.display = 'block';
    } else {
      suggestionsDiv.style.display = 'none';
    }
  }

  tickerSearch.addEventListener('input', function() {
    updateSuggestions(this.value.toLowerCase());
  });

  document.getElementById('clear-search').addEventListener('click', function() {
    const tickerSearch = document.getElementById('ticker-search');
    if (tickerSearch) {
      tickerSearch.value = '';
      tickerInput.value = '';
      suggestionsDiv.style.display = 'none';
      this.style.display = 'none';
      tickerSearch.style.background = 'none';
      tickerSearch.style.paddingLeft = '8px';
    }
  });

  document.getElementById('clear-shares').addEventListener('click', function() {
    sharesInput.value = '';
    this.style.display = 'none';
  });

  document.getElementById('clear-bought').addEventListener('click', function() {
    boughtDateInput.value = '';
    this.style.display = 'none';
  });

  document.getElementById('clear-sold').addEventListener('click', function() {
    soldDateInput.value = '';
    this.style.display = 'none';
  });

  [tickerSearch, sharesInput, boughtDateInput, soldDateInput].forEach(input => {
    input.addEventListener('input', function() {
      const clearBtn = document.getElementById(`clear-${input.id.split('-')[0]}`);
      if (clearBtn) clearBtn.style.display = this.value ? 'block' : 'none';
    });
  });

  document.addEventListener('click', function(event) {
    if (!tickerSearch.contains(event.target) && !suggestionsDiv.contains(event.target)) {
      suggestionsDiv.style.display = 'none';
    }
  });

  document.getElementById('stock-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const ticker = tickerInput.value;
    const shares = parseFloat(sharesInput.value);
    const boughtDate = boughtDateInput.value;
    const soldDate = soldDateInput.value;

    if (!ticker) {
      document.getElementById('results').innerHTML = '<p>Please select a ticker symbol.</p>';
      document.getElementById('results').style.display = 'block';
      return;
    }

    document.getElementById('results').innerHTML = '<p>Calculating...</p>';
    document.getElementById('results').style.display = 'block';

    try {
      const historicalPriceSold = await getHistoricalPrice(ticker, soldDate);
      const currentPrice = await getCurrentPrice(ticker);
      let historicalPriceBought = null;
      if (boughtDate) {
        historicalPriceBought = await getHistoricalPrice(ticker, boughtDate);
      }

      if (!historicalPriceSold || !currentPrice) {
        document.getElementById('results').innerHTML = '<p>No data available for that date or ticker. Try a different trading day (weekdays only).</p>';
        return;
      }

      const soldValue = historicalPriceSold * shares;
      const currentValue = currentPrice * shares;
      const difference = currentValue - soldValue;
      const percentageChange = ((currentPrice - historicalPriceSold) / historicalPriceSold) * 100;

      const company = companies.find(c => c.symbol === ticker) || { name: ticker }; // Use symbol here
      const formatNumber = num => Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let tableRows = '';
      items.forEach(item => {
        const quantity = Math.floor(Math.abs(difference) / item.price);
        if (quantity > 0) {
          tableRows += `
            <tr>
              <td><i class="fas ${item.icon}"></i> ${item.name}</td>
              <td>$${formatNumber(item.price)}</td>
              <td>${quantity}</td>
            </tr>
          `;
        }
      });

      let purchaseInfo = '';
      if (boughtDate && historicalPriceBought) {
        const boughtValue = historicalPriceBought * shares;
        const totalGainLoss = currentValue - boughtValue;
        purchaseInfo = `
          <details>
            <summary>Extended Info</summary>
            <p>You bought them on ${boughtDate} for <span class="highlight number">$${formatNumber(boughtValue)}</span> (<span class="number">$${historicalPriceBought}</span> per share). Your total unrealized gain would be <span class="highlight number">$${formatNumber(totalGainLoss)}</span>.</p>
          </details>
        `;
      }

      document.getElementById('results').innerHTML = `
        <div class="result-message ${difference >= 0 ? 'loss' : 'gain'}">
          <p>You sold your ${shares} ${company.name} shares on ${soldDate} for <span class="highlight number">$${formatNumber(soldValue)}</span> (<span class="number">$${historicalPriceSold}</span> per share). 
          If you’d held onto them, they’d be worth <span class="highlight number">$${formatNumber(currentValue)}</span> today (<span class="number">$${currentPrice}</span> per share).</p>
          <p>That’s a ${difference >= 0 ? 'missed opportunity' : 'smart move'} of <span class="highlight final-total">$${formatNumber(difference)}</span> – a <span class="highlight number">${percentageChange.toFixed(2)}%</span> change!</p>
          ${purchaseInfo}
        </div>
        <div class="items-section">
          <p>Here’s what you could have ${difference >= 0 ? 'missed buying' : 'saved for'} with that amount (each item separately):</p>
          <table class="items-table">
            <thead><tr><th>Item</th><th>Price</th><th>Quantity</th></tr></thead>
            <tbody>${tableRows || '<tr><td colspan="3">Not enough for these items!</td></tr>'}</tbody>
          </table>
        </div>
      `;
    } catch (error) {
      document.getElementById('results').innerHTML = '<p>Error fetching data. Check ticker, date, or try later.</p>';
      console.error('API Error:', error);
    }
  });
});
