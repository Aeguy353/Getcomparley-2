const express = require('express');
const path = require('path');
const axios = require('axios');
const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));
app.use(express.static('public')); // Serve static files from 'public' directory for logo

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/stores', (req, res) => {
  const advertiserMap = {
    '2ndcharles': '6423982',
    'airvape': '5146556',
    'birdfy': '7389113',
    'booksamillion': '129899',
    'corro': '7304564',
    'designshop': '7310766',
    'directdeals': '6271057',
    'durangoboots': '6284905',
    'edenfantasys': '1880835',
    'entirelypets': '1475632',
    'fragranceshop': '7287203',
    'homery': '7423765',
    'lightingnewyork': '7345655',
    'mms': '2603623',
    'melodysusie': '5619253',
    'mobilepixels': '5725421',
    'modloft': '5921758',
    'muckbootus': '5535808',
    'perfumania': '904674',
    'pinter': '7268812',
    'pittmandavis': '5126239',
    'powersystems': '3056145',
    'roborock': '6100283',
    'rockyboots': '6284903',
    'roobi': '7420130',
    'rugsource': '5656292',
    'sicotas': '7421130',
    'soccergarage': '2061630',
    'sportsmanswarehouse': '4148179',
    'sullenclothing': '5775818',
    'tinyland': '7268655',
    'willworkjewelry': '7211160',
    'xtratuf': '5535819',
    'yarden': '5262261',
    'georgiaboot': '6284907'
  };
  const stores = Object.keys(advertiserMap);
  res.json({ stores });
});

app.post('/api/cj-products', async (req, res) => {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const fetchCJProducts = async (attempt = 1) => {
    try {
      const cjToken = process.env.CJ_TOKEN;
      const websiteId = process.env.CJ_WEBSITE_ID;
      const keywords = req.body.keywords || 'shoes';
      const store = req.body.store;
      if (!cjToken || !websiteId) {
        throw new Error('Missing CJ_TOKEN or CJ_WEBSITE_ID in environment variables');
      }

      const advertiserMap = {
        '2ndcharles': '6423982',
        'airvape': '5146556',
        'birdfy': '7389113',
        'booksamillion': '129899',
        'corro': '7304564',
        'designshop': '7310766',
        'directdeals': '6271057',
        'durangoboots': '6284905',
        'edenfantasys': '1880835',
        'entirelypets': '1475632',
        'fragranceshop': '7287203',
        'homery': '7423765',
        'lightingnewyork': '7345655',
        'mms': '2603623',
        'melodysusie': '5619253',
        'mobilepixels': '5725421',
        'modloft': '5921758',
        'muckbootus': '5535808',
        'perfumania': '904674',
        'pinter': '7268812',
        'pittmandavis': '5126239',
        'powersystems': '3056145',
        'roborock': '6100283',
        'rockyboots': '6284903',
        'roobi': '7420130',
        'rugsource': '5656292',
        'sicotas': '7421130',
        'soccergarage': '2061630',
        'sportsmanswarehouse': '4148179',
        'sullenclothing': '5775818',
        'tinyland': '7268655',
        'willworkjewelry': '7211160',
        'xtratuf': '5535819',
        'yarden': '5262261',
        'georgiaboot': '6284907'
      };

      const advertiserId = advertiserMap[store];
      if (!advertiserId) {
        throw new Error(`Invalid store: ${store}`);
      }

      console.log(`[${new Date().toISOString()}] CJ API Request - Store: ${store}, Advertiser ID: ${advertiserId}, Keywords: ${keywords}`);

      const response = await axios.get('https://link-search.api.cj.com/v2/link-search', {
        headers: {
          Authorization: `Bearer ${cjToken}`,
        },
        params: {
          'website-id': websiteId,
          keywords: keywords,
          'records-per-page': 10,
          'advertiser-ids': advertiserId
        },
      });

      console.log(`[${new Date().toISOString()}] CJ API Raw Response:`, response.data);

      const parsedXml = await parseStringPromise(response.data);
      const links = parsedXml['cj-api']?.links?.link || (parsedXml['cj-api']?.links?.[0]?.link) || [];
      console.log(`[${new Date().toISOString()}] Links parsed for ${store}:`, links);

      const linksArray = Array.isArray(links) ? links : [links].filter(Boolean);
      if (linksArray.length === 0) {
        console.log(`[${new Date().toISOString()}] No links returned for ${store} with keywords: ${keywords}`);
        return [];
      }

      // Filter out promotional links, keep those that look like products
      const productLinks = linksArray.filter(link => {
        const linkName = typeof link['link-name'] === 'string' ? link['link-name'].toLowerCase() : '';
        const description = typeof link['description'] === 'string' ? link['description'].toLowerCase() : '';
        const hasPrice = !!link['price'];
        const hasImage = !!link['image-url'];
        const hasSku = !!link['sku'];
        // Skip links that are clearly promotions
        const isPromotion = linkName.includes('off') || linkName.includes('sale') || linkName.includes('coupon') || description.includes('off') || description.includes('sale');
        // Keep links that have product indicators
        return (hasPrice || hasImage || hasSku) && !isPromotion;
      });

      if (productLinks.length === 0) {
        console.log(`[${new Date().toISOString()}] No product-specific links found for ${store}, returning all links as fallback`);
        const productsWithLinks = linksArray.map(link => ({
          name: typeof link['link-name'] === 'string' ? link['link-name'] : link['promotion-type'] || 'No title available',
          price: { 
            value: link['price'] || 'N/A', 
            currency: link['currency'] || 'USD' 
          },
          description: typeof link['description'] === 'string' ? link['description'] : link['category'] || 'No description available. This may be a promotional link.',
          shipping: link['shipping'] || 'Shipping information not available.',
          link: link['clickUrl'] || link['link-url'] || '#',
          image: link['image-url'] || link['advertiser-image-url'] || 'https://via.placeholder.com/150'
        }));
        return productsWithLinks;
      }

      const productsWithLinks = productLinks.map(link => ({
        name: typeof link['link-name'] === 'string' ? link['link-name'] : link['promotion-type'] || 'No title available',
        price: { 
          value: link['price'] || 'N/A', 
          currency: link['currency'] || 'USD' 
        },
        description: typeof link['description'] === 'string' ? link['description'] : link['category'] || 'No description available.',
        shipping: link['shipping'] || 'Shipping information not available.',
        link: link['clickUrl'] || link['link-url'] || '#',
        image: link['image-url'] || link['advertiser-image-url'] || 'https://via.placeholder.com/150'
      }));
      console.log(`[${new Date().toISOString()}] Products parsed for ${store}:`, productsWithLinks);
      return productsWithLinks;
    } catch (error) {
      if (error.response?.status === 429 && attempt < 3) {
        console.log(`[${new Date().toISOString()}] Rate limit hit, retrying after delay (attempt ${attempt})...`);
        await delay(1000);
        return fetchCJProducts(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const products = await fetchCJProducts();
    console.log(`[${new Date().toISOString()}] Response being sent:`, { products });
    res.status(200).json({ products });
  } catch (error) {
    const errorResponse = { 
      error: `Failed to fetch products from ${req.body.store} (via CJ): ${error.message}`, 
      details: error.response?.data || ''
    };
    console.error(`[${new Date().toISOString()}] CJ API Error:`, error.message, error.response?.status, error.response?.data || '');
    console.log(`[${new Date().toISOString()}] Error Response being sent:`, errorResponse);
    res.status(500).json(errorResponse);
  }
});

app.get('/api/ebay-products', async (req, res) => {
  try {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    const keywords = req.query.keywords || 'shoes';

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log(`[${new Date().toISOString()}] eBay token obtained:`, accessToken);

    const searchResponse = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?q=${keywords}&limit=10`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const searchData = await searchResponse.json();
    console.log(`[${new Date().toISOString()}] eBay API raw response:`, searchData);
    const items = searchData.itemSummaries || [];
    const itemsWithLinks = items.map(item => ({
      title: item.title,
      price: { value: item.price.value, currency: item.price.currency },
      description: item.shortDescription || 'No description available.',
      shipping: item.shippingOptions?.[0]?.shippingCost?.value 
        ? `$${item.shippingOptions[0].shippingCost.value} ${item.shippingOptions[0].shippingCost.currency}`
        : 'Shipping information not available.',
      link: item.itemAffiliateWebUrl || item.itemWebUrl,
      image: item.thumbnailImages?.[0]?.imageUrl || 'https://via.placeholder.com/150'
    }));
    console.log(`[${new Date().toISOString()}] eBay items parsed:`, itemsWithLinks);
    res.json({ itemSummaries: itemsWithLinks });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] eBay API Error:`, error.message, error.response?.status, error.response?.data || '');
    res.status(500).json({ error: 'Failed to fetch eBay products: ' + (error.response?.status || '') + ' ' + (error.message) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${port}`);
});
