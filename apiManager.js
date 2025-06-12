const fetch = require('node-fetch');
const xml2js = require('xml2js');
const querystring = require('querystring');

// CJ.com Product Catalog Search API
async function searchCJ(keywords, advertiserId, token, websiteId) {
    const url = `https://ads.api.cj.com/v2/product-catalog-search?${querystring.stringify({
        'website-id': websiteId,
        keywords: keywords,
        'advertiser-ids': advertiserId,
        currency: 'USD'
    })}`;

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const xml = await response.text();
    const parser = new xml2js.Parser();
    const data = await parser.parseStringPromise(xml);

    const products = data['product-catalog-search'].products[0].product || [];
    return products.map(product => ({
        name: product.name[0],
        store: (require('./stores.json').find(s => s.id === advertiserId)).name,
        price: parseFloat(product.price[0]),
        description: product.description[0],
        rating: null,
        shipping: product['in-stock'][0] === 'yes' ? 'In Stock' : 'Out of Stock',
        image: product['image-url'][0],
        buyLink: product['buy-url'][0]
    }));
}

// eBay Finding API (findItemsAdvanced)
async function searchEbay(keywords, category, clientId, accessToken) {
    const categoryIds = {
        tools: '11700',
        furniture: '3197',
        bedbath: '20444',
        toys: '220',
        jewelry: '10968',
        sports: '888',
        outdoors: '159136',
        books: '267',
        electronics: '293',
        garden: '159912',
        apparel: '11450',
        shoes: '11450',
        fragrance: '180345',
        homeappliances: '20710',
        gifts: '26395',
        pets: '1281',
        mens: '11450',
        computers: '58058',
        games: '1249'
    };

    const url = `https://svcs.ebay.com/services/search/FindingService/v1?${querystring.stringify({
        'SECURITY-APPNAME': clientId,
        'OPERATION-NAME': 'findItemsAdvanced',
        'SERVICE-VERSION': '1.0.0',
        'RESPONSE-DATA-FORMAT': 'JSON',
        keywords: keywords,
        categoryId: category ? categoryIds[category] : undefined
    })}`;

    const response = await fetch(url);
    const data = await response.json();
    const items = data.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];

    return items.map(item => ({
        name: item.title[0],
        store: 'eBay',
        price: parseFloat(item.sellingStatus[0].currentPrice[0].__value__),
        description: item.subtitle?.[0] || 'N/A',
        rating: item.sellerInfo?.[0]?.feedbackScore?.[0] || 'N/A',
        shipping: item.shippingInfo[0].shippingServiceCost?.[0]?.__value__ === '0.0' ? 'Free Shipping' : 'Shipping at Checkout',
        image: item.galleryURL[0],
        buyLink: item.viewItemURL[0]
    }));
}

// Placeholder for future Amazon API integration
async function searchAmazon(keywords, category, accessKey, secretKey) {
    // Add Amazon Product Advertising API integration here
    return [];
}

module.exports = {
    searchCJ,
    searchEbay,
    searchAmazon
};
