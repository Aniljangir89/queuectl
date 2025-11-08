// src/config.js
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

const DEFAULTS = {
  max_retries: 3,
  backoff_base: 2,
  poll_interval_seconds: 2
};

function read() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch (e) {
    return Object.assign({}, DEFAULTS);
  }
}

function write(newConf) {
  const conf = Object.assign({}, read(), newConf);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(conf, null, 2));
  return conf;
}

module.exports = { read, write, CONFIG_PATH, DEFAULTS };
