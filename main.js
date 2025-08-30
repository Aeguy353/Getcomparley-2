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
  }

  // Attach event listeners if buttons exist
  const addBtn = document.getElementById("add-store-btn");
  if (addBtn) addBtn.addEventListener("click", addStore);

  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) searchBtn.addEventListener("click", searchAllStores);

  const trustBtn = document.getElementById("trustus-btn");
  if (trustBtn) trustBtn.addEventListener("click", trustUsSearch);

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", clearResults);
  }
});

let selectedStores = [];

function addStore() {
  const select = document.getElementById("store-select");
  if (!select) return;
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
  select.value = "";
}

function removeStore(store) {
  selectedStores = selectedStores.filter(s => s !== store);
  updateSelectedStoresList();
}

function updateSelectedStoresList() {
  const list = document.getElementById("selected-stores-list");
  if (!list) return;
  list.innerHTML = "";
  selectedStores.forEach(store => {
    const storeDiv = document.createElement("div");
    storeDiv.className = "store-item";
    const [storeName, platform] = store.includes('-') ? store.split('-') : [store, store === 'ebay' ? 'ebay' : ''];
    storeDiv.innerHTML = `
      <span>${storeName.replace(/([A-Z])/g, ' $1').trim()}${platform === 'cj' ? ' (via CJ)' : ''}</span>
      <button type="button" data-store="${store}">Remove</button>
    `;
    storeDiv.querySelector("button").addEventListener("click", () => removeStore(store));
    list.appendChild(storeDiv);
  });
}

async function searchAllStores() {
  const searchInput = document.getElementById("search-input");
  if (!searchInput) return;
  const searchTerm = searchInput.value.trim();
  if (!searchTerm) {
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
      let response;
      let controller, signal;
      if (window.AbortController && AbortSignal.timeout) {
        controller = new AbortController();
        signal = AbortSignal.timeout(10000);
      }
      if (platform === 'cj') {
        response = await fetch('/api/cj-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: searchTerm, store: storeName }),
          signal: signal
        });
      } else if (platform === 'ebay' || store === 'ebay') {
        response = await fetch(`/api/ebay-products?keywords=${encodeURIComponent(searchTerm)}`, {
          signal: signal
        });
      } else {
        throw new Error("Invalid store");
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      let products = [];
      if (platform === 'ebay' || store === 'ebay') {
        products = data.itemSummaries || [];
      } else if (platform === 'cj') {
        products = Array.isArray(data.products) ? data.products : [];
      }
      products.forEach(product => {
        product.store = platform === 'ebay' || store === 'ebay' ? "eBay" : `${storeName.replace(/([A-Z])/g, ' $1').trim()} (via CJ)`;
        allProducts.push(product);
      });
      await delay(3000);
    } catch (err) {
      displayError(`Failed to fetch products from ${store.replace(/([A-Z])/g, ' $1').trim()}: ${err.message}`);
    }
  }
  if (allProducts.length > 0) {
    displayResults(allProducts);
  } else {
    displayError("No products found for the selected stores.");
  }
}

function displayResults(products) {
  const searchSection = document.querySelector(".search-section");
  if (!searchSection) return;
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
      <h3>${product.name || product.title || "No Title"}</h3>
      <p><strong>Store:</strong> ${product.store}</p>
      <p><strong>Price:</strong> ${product.price?.value || "N/A"} ${product.price?.currency || ""}</p>
      <p><strong>Description:</strong> ${product.description || ""}</p>
      <p><strong>Shipping:</strong> ${product.shipping || ""}</p>
      <a href="${product.link || "#"}" target="_blank">View Product</a>
      <br>
      <img src="${product.image || ""}" alt="${product.name || product.title || ""}" width="150" height="150">
    `;
    resultsSection.appendChild(productDiv);
  });
  searchSection.appendChild(resultsSection);
}

function trustUsSearch() {
  const searchInput = document.getElementById("search-input");
  if (!searchInput) return;
  const searchTerm = searchInput.value.trim();
  if (!searchTerm) {
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
      body: JSON.stringify({ keywords: searchTerm, store })
    })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(`HTTP ${res.status}: ${text}`); });
        }
        return res.json();
      })
      .catch(err => ({ error: err.message, store }))
  );
  const ebayPromise = fetch(`/api/ebay-products?keywords=${encodeURIComponent(searchTerm)}`)
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
          displayError(`Failed to fetch products from ${result.store.replace(/([A-Z])/g, ' $1').trim()}`);
        } else if (result.store === 'ebay') {
          const products = result.itemSummaries || [];
          products.forEach(product => {
            product.store = "eBay";
            allProducts.push(product);
          });
        } else {
          const products = Array.isArray(result.products) ? result.products : [];
          products.forEach(product => {
            product.store = result.store.replace(/([A-Z])/g, ' $1').trim() + " (via CJ)";
            allProducts.push(product);
          });
        }
      });
      if (allProducts.length > 0) {
        displayResults(allProducts);
      } else {
        displayError("No products found for the selected stores.");
      }
    })
    .catch(() => {
      displayError("An unexpected error occurred during search");
    });
}

function displayError(message) {
  const main = document.querySelector("main");
  if (!main) return;
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `<p style="color: red;">${message}</p>`;
  main.appendChild(errorDiv);
}

function clearResults() {
  const main = document.querySelector("main");
  if (!main) return;
  const existingResults = main.querySelectorAll(".results-section, .error-message");
  existingResults.forEach(result => result.remove());
}

console.log("Main.js loaded and ready");
