document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("store-select");
  if (select) {
    select.innerHTML = `
      <option value="">Select Stores</option>
      <option value="2ndcharles-cj">2nd & Charles</option>
      <option value="booksamillion-cj">BOOKSAMILLION.COM</option>
      <option value="airvape-cj">AirVape</option>
      <option value="mobilepixels-cj">Mobile Pixels</option>
      <option value="birdfy-cj">Birdfy</option>
      <option value="yarden-cj">Yarden</option>
      <option value="corro-cj">Corro</option>
      <option value="sportsmanswarehouse-cj">Sportsman's Warehouse</option>
      <option value="designshop-cj">DesignShop</option>
      <option value="directdeals-cj">DirectDeals</option>
      <option value="durangoboots-cj">DurangoBoots.com</option>
      <option value="rockyboots-cj">RockyBoots.com</option>
      <option value="muckbootus-cj">Muck Boot US</option>
      <option value="edenfantasys-cj">EdenFantasys.com</option>
      <option value="melodysusie-cj">MelodySusie</option>
      <option value="entirelypets-cj">EntirelyPets</option>
      <option value="fragranceshop-cj">FragranceShop.com</option>
      <option value="perfumania-cj">Perfumania.com</option>
      <option value="homery-cj">Homery</option>
      <option value="lightingnewyork-cj">Lighting New York</option>
      <option value="pinter-cj">Pinter - All-in-One Beer Making Machine</option>
      <option value="roborock-cj">Roborock</option>
      <option value="roobi-cj">Roobi | Viante</option>
      <option value="mms-cj">M&M's</option>
      <option value="pittmandavis-cj">Pittman & Davis</option>
      <option value="modloft-cj">Modloft</option>
      <option value="rugsource-cj">Rug Source</option>
      <option value="sicotas-cj">Sicotas</option>
      <option value="sullenclothing-cj">Sullen Clothing</option>
      <option value="xtratuf-cj">Xtratuf</option>
      <option value="soccergarage-cj">SoccerGarage.com</option>
      <option value="powersystems-cj">Power Systems</option>
      <option value="tinyland-cj">Tiny Land</option>
      <option value="willworkjewelry-cj">WillWork Jewelry</option>
      <option value="ebay">eBay</option>
      <option value="georgiaboot-cj">GeorgiaBoot.com</option>
    `;
  } else {
    console.warn("No store-select element found on this page.");
  }

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", clearResults);
  }
});

let selectedStores = [];

function addStore() {
  const select = document.getElementById("store-select");
  const store = select.value;
  if (!store) {
    displayError("Please select a store to add.");
    return;
  }

  if (!selectedStores.includes(store)) {
    selectedStores.push(store);
    updateSelectedStoresList();
  } else {
    displayError("Store already added.");
  }
  select.value = ""; // Reset the dropdown
}

function removeStore(store) {
  selectedStores = selectedStores.filter(s => s !== store);
  updateSelectedStoresList();
}

function updateSelectedStoresList() {
  const list = document.getElementById("selected-stores-list");
  list.innerHTML = "";
  selectedStores.forEach(store => {
    const storeDiv = document.createElement("div");
    storeDiv.className = "store-item";
    const [storeName, platform] = store.includes('-') ? store.split('-') : [store, store === 'ebay' ? 'ebay' : ''];
    storeDiv.innerHTML = `
      <span>${storeName.replace(/([A-Z])/g, ' $1').trim()}${platform === 'cj' ? ' (via CJ)' : ''}</span>
      <button onclick="removeStore('${store}')">Remove</button>
    `;
    list.appendChild(storeDiv);
  });
}

async function searchAllStores() {
  const searchInput = document.getElementById("search-input").value.trim();
  if (!searchInput) {
    displayError("Please enter a search term (e.g., shoes)");
    return;
  }

  if (selectedStores.length === 0) {
    displayError("Please add at least one store to search.");
    return;
  }

  clearResults();

  const allProducts = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  for (const store of selectedStores) {
    const [storeName, platform] = store.includes('-') ? store.split('-') : [store, store === 'ebay' ? 'ebay' : ''];
    try {
      console.log(`[${new Date().toISOString()}] Fetching products for ${storeName} (${platform})...`);
      let response;
      if (platform === 'cj') {
        response = await fetch('/api/cj-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: searchInput, store: storeName }),
          signal: AbortSignal.timeout(10000) // 10-second timeout
        });
      } else if (platform === 'ebay' || store === 'ebay') {
        response = await fetch(`/api/ebay-products?keywords=${encodeURIComponent(searchInput)}`, {
          signal: AbortSignal.timeout(10000) // 10-second timeout
        });
      } else {
        throw new Error("Invalid store");
      }

      if (!response.ok) {
        const text = await response.text();
        console.error(`[${new Date().toISOString()}] Fetch failed for ${storeName} (${platform}): HTTP ${response.status}: ${text}`);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      console.log(`[${new Date().toISOString()}] Raw API response for ${storeName} (${platform}):`, data);

      let products = [];
      if (platform === 'ebay' || store === 'ebay') {
        products = data.itemSummaries || [];
      } else if (platform === 'cj') {
        products = Array.isArray(data.products) ? data.products : [];
      }
      if (products.length === 0) {
        console.log(`[${new Date().toISOString()}] No products found for ${storeName} (${platform})`);
      } else {
        console.log(`[${new Date().toISOString()}] Products parsed for ${storeName} (${platform}):`, products);
      }
      products.forEach(product => {
        product.store = platform === 'ebay' || store === 'ebay' ? "eBay" : `${storeName.replace(/([A-Z])/g, ' $1').trim()} (via CJ)`;
        allProducts.push(product);
      });

      await delay(3000); // Increased to 3-second delay to avoid CJ rate limits
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error for ${storeName} (${platform}):`, err.message);
      displayError(`Failed to fetch products from ${storeName.replace(/([A-Z])/g, ' $1').trim()}${platform === 'cj' ? ' (via CJ)' : ''}: ${err.message}`);
    }
  }

  console.log(`[${new Date().toISOString()}] Final collected products:`, allProducts);
  if (allProducts.length > 0) {
    displayResults(allProducts);
  } else {
    console.warn("No products were collected.");
    displayError("No products found for the selected stores.");
  }
}

function displayResults(products) {
  const searchSection = document.querySelector(".search-section");
  const resultsSection = document.createElement("div");
  resultsSection.className = "results-section";
  resultsSection.innerHTML = `<h2>Search Results</h2>`;
  
  products.forEach(product => {
    const productDiv = document.createElement("div");
    productDiv.className = "product";
    productDiv.style.border = "1px solid #ccc";
    productDiv.style.margin = "10px 0";
    productDiv.style.padding = "10px";
    productDiv.innerHTML = `
      <h3>${product.name || product.title}</h3>
      <p><strong>Store:</strong> ${product.store}${product.store === 'eBay' ? '' : ' (via CJ)'}</p>
      <p><strong>Price:</strong> ${product.price.value} ${product.price.currency}</p>
      <p><strong>Description:</strong> ${product.description}</p>
      <p><strong>Shipping:</strong> ${product.shipping}</p>
      <a href="${product.link}" target="_blank">View Product</a>
      <br>
      <img src="${product.image}" alt="${product.name || product.title}" width="150" height="150">
    `;
    resultsSection.appendChild(productDiv);
  });

  searchSection.appendChild(resultsSection);
}

function trustUsSearch() {
  const searchInput = document.getElementById("search-input").value.trim();
  if (!searchInput) {
    displayError("Please enter a search term (e.g., shoes)");
    return;
  }

  clearResults();

  const stores = [
    '2ndcharles', 'booksamillion', 'airvape', 'mobilepixels', 'birdfy', 'yarden', 'corro', 'sportsmanswarehouse',
    'designshop', 'directdeals', 'durangoboots', 'rockyboots', 'edenfantasys', 'melodysusie', 'entirelypets',
    'fragranceshop', 'perfumania', 'homery', 'lightingnewyork', 'pinter', 'roborock', 'roobi', 'mms', 'pittmandavis',
    'modloft', 'rugsource', 'sicotas', 'muckbootus', 'sullenclothing', 'xtratuf', 'powersystems', 'soccergarage',
    'tinyland', 'willworkjewelry', 'georgiaboot'
  ];

  const cjPromises = stores.map(store =>
    fetch('/api/cj-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: searchInput, store })
    })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
        }
        return res.json();
      })
      .catch(err => ({ error: err.message, store }))
  );
  const ebayPromise = fetch(`/api/ebay-products?keywords=${encodeURIComponent(searchInput)}`)
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
      }
      return res.json();
    })
    .catch(err => ({ error: err.message, store: 'ebay' }));

  Promise.all([...cjPromises, ebayPromise])
    .then(results => {
      const allProducts = [];
      results.forEach(result => {
        if (result.error) {
          console.log(`[${new Date().toISOString()}] Error for ${result.store}: ${result.error}`);
          displayError(`Failed to fetch products from ${result.store.replace(/([A-Z])/g, ' $1').trim()}${result.store.endsWith('-cj') ? ' (via CJ)' : ''}`);
        } else if (result.store === 'ebay') {
          const products = result.itemSummaries || [];
          console.log(`[${new Date().toISOString()}] eBay products:`, products);
          products.forEach(product => {
            product.store = "eBay";
            allProducts.push(product);
          });
        } else {
          const products = Array.isArray(result.products) ? result.products : [];
          console.log(`[${new Date().toISOString()}] CJ products for ${result.store}:`, products);
          products.forEach(product => {
            product.store = result.store.replace(/([A-Z])/g, ' $1').trim() + " (via CJ)";
            allProducts.push(product);
          });
        }
      });
      console.log(`[${new Date().toISOString()}] All products collected in trustUsSearch:`, allProducts);
      if (allProducts.length > 0) {
        displayResults(allProducts);
      } else {
        console.warn("No products were collected in trustUsSearch.");
        displayError("No products found for the selected stores.");
      }
    })
    .catch(error => {
      console.error(`[${new Date().toISOString()}] Error in trustUsSearch:`, error);
      displayError("An unexpected error occurred during search");
    });
}

function displayError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `<p style="color: red;">${message}</p>`;
  document.querySelector("main").appendChild(errorDiv);
}

function clearResults() {
  const main = document.querySelector("main");
  const existingResults = main.querySelectorAll(".results-section, .error-message");
  existingResults.forEach(result => result.remove());
}

console.log("Main.js loaded and ready");
