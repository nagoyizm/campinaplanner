const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Configures Puppeteer to store its cache inside the project directory
  // instead of the global Render cache, preventing it from being lost after build.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
