const fetch = require('unfetch').default || require('unfetch')

if (typeof window !== 'undefined' && !window.fetch) {
  window.fetch = fetch;
}

module.exports = fetch
