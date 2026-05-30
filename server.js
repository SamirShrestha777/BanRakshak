const http = require('http');
const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME   = 'banrakhshak';
const COL_NAME  = 'readings';

let db;
let latest = {};

async function connect() {
  try {
    const client = new MongoClient(MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      tls: true,
      tlsAllowInvalidCertificates: false,
    });
    await client.connect();
    db = client.db(DB_NAME);
    console.log('[DB] MongoDB connected');
  } catch (e) {
    console.error('[DB] Connection failed:', e.message);
    console.log('[DB] Retrying in 10 seconds...');
    setTimeout(connect, 10000);
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  if (req.method === 'POST' && req.url === '/data') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        latest = JSON.parse(body);
        latest.timestamp = new Date();
        if (db) {
          await db.collection(COL_NAME).insertOne({ ...latest });
          console.log('[POST] Saved to DB');
        } else {
          console.log('[POST] DB not ready — data received but not saved');
        }
      } catch (e) {
        console.error('[POST] Error:', e.message);
      }
      res.writeHead(200); res.end('OK');
    });

  } else if (req.method === 'GET' && req.url === '/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latest));

  } else if (req.method === 'GET' && req.url.startsWith('/history')) {
    if (!db) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DB not connected yet' }));
      return;
    }
    const params = new URL(req.url, 'http://x').searchParams;
    const limit  = Math.min(parseInt(params.get('limit') || '100'), 1000);
    try {
      const rows = await db.collection(COL_NAME)
        .find({}, { projection: { _id: 0 } })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows.reverse()));
    } catch (e) {
      res.writeHead(500); res.end('DB error');
    }

  } else if (req.method === 'GET' && req.url === '/stats') {
    if (!db) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'DB not connected yet' }));
      return;
    }
    try {
      const stats = await db.collection(COL_NAME).aggregate([
        {
          $group: {
            _id: {
              year:  { $year:  '$timestamp' },
              month: { $month: '$timestamp' },
              day:   { $dayOfMonth: '$timestamp' }
            },
            avgTemp:   { $avg: '$temp' },
            avgHum:    { $avg: '$hum' },
            avgSmoke:  { $avg: '$smoke' },
            avgScore:  { $avg: '$riskScore' },
            maxSmoke:  { $max: '$smoke' },
            maxTemp:   { $max: '$temp' },
            highCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] } },
            count:     { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]).toArray();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    } catch (e) {
      res.writeHead(500); res.end('DB error');
    }

  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), db: !!db }));

  } else {
    res.writeHead(404); res.end();
  }
});

const PORT = process.env.PORT || 3000;

// Start server immediately, connect to DB in background
server.listen(PORT, () => console.log(`[SERVER] Running on port ${PORT}`));
connect();
