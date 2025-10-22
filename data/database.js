// data/database.js
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');

const readDB = async () => {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { characters: {}, posts: {} };
  }
};

const writeDB = async (data) => {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
};

module.exports = { readDB, writeDB };