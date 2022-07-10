const { app } = require('electron');
const { Level } = require('level');
const path = require('path');

const dbPath = path.resolve(app.getPath('userData'), 'app.db');

module.exports = new Level(dbPath, { valueEncoding: 'json' });
