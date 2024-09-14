const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors({
    origin: '*',
  }));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

app.use(express.json());

// Fetch top 10 results from API and store in DB
async function fetchAndStoreData() {
  try {
    const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
    const tickers = Object.values(response.data).slice(0, 10);

    const client = await pool.connect();
    await client.query('DELETE FROM tickers'); // Clear previous data

    tickers.forEach(async ticker => {
      await client.query(
        'INSERT INTO tickers (name, last, buy, sell, volume, base_unit) VALUES ($1, $2, $3, $4, $5, $6)',
        [ticker.name, ticker.last, ticker.buy, ticker.sell, ticker.volume, ticker.base_unit]
      );
    });
    client.release();
  } catch (err) {
    console.error(err);
  }
}

// Run fetch function every time server starts
fetchAndStoreData();

// Route to get data from DB
app.get('/api/tickers', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM tickers');
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
