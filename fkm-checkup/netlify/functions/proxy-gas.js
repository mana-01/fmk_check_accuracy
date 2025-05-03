// netlify/functions/proxy-gas.js

/**
 * Proxy to Google Apps Script endpoint to avoid CORS in the browser.
 * Netlify Functions runtime (Node 18+) provides global fetch, so no need for node-fetch.
 */

exports.handler = async (event) => {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxaCKVt_pTuYM7TuO5jvU5nrtsnpIshTD31kg-Cny6Bs_FEgjA4y6zS9uWtCLb_WvgK/exec';

  // Allow both GET (data fetch) and POST (data save) through this single endpoint
  if (event.httpMethod === 'GET') {
    // e.g. /.netlify/functions/proxy-gas?action=getData&batch=1&sheet=1
    const { action, batch, sheet } = event.queryStringParameters || {};
    const url = new URL(GAS_URL);
    if (action) url.searchParams.set('action', action);
    if (batch)  url.searchParams.set('batch', batch);
    if (sheet)  url.searchParams.set('sheet',  sheet);

    const resp = await fetch(url.toString());
    const body = await resp.text();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body
    };
  }

  if (event.httpMethod === 'POST') {
    // e.g. fetch('/.netlify/functions/proxy-gas', { method:'POST', body: JSON.stringify({...}) })
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body
    });
    const body = await resp.text();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body
    };
  }

  // Reject other methods
  return {
    statusCode: 405,
    headers: { 'Allow': 'GET, POST' },
    body: 'Method Not Allowed'
  };
};
