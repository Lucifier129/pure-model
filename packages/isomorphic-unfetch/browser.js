const fetch = require('unfetch').default || require('unfetch')

if (!window.fetch) {
  window.fetch = fetch
}

module.exports = fetch
