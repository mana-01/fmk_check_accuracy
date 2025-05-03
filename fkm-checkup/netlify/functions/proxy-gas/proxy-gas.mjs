// netlify/functions/proxy-gas.js
const fetch = require('node-fetch')

exports.handler = async (event) => {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbz1BoWmOF2wpk1lnrCQ_aD4wKAtLWKMyHdTAH1Wb86tr7iWuaY4WxUUf8ccqzxEFuUn/exec'

  if (event.httpMethod === 'GET') {
    const { action, batch } = event.queryStringParameters || {}
    const url = `${GAS_URL}?action=${action}&batch=${batch}`
    const resp = await fetch(url)
    const text = await resp.text()
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: text
    }
  } else {
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body
    })
    const text = await resp.text()
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: text
    }
  }
}
