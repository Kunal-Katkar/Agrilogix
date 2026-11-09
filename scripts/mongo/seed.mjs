// Loads the AgriLogiX demo data into MongoDB (Atlas or any server).
//
//   node scripts/mongo/seed.mjs --dry-run        checks and converts the data, no connection needed
//   node --env-file=.env scripts/mongo/seed.mjs  creates collections, validators, indexes and loads the data
//
// The connection string is read from MONGODB_URI (never hard-code it). The database name comes from MONGODB_DB
// (default "agrilogix"). Re-running replaces the demo data in the collections this script owns.
import { randomBytes, scryptSync } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { buildSeed } from '../../src/data/seed.js';
import { checkIntegrity } from '../../src/data/integrity.js';
import { COLLECTIONS } from './schema.mjs';

const dry = process.argv.includes('--dry-run');
const seed = buildSeed();

// Passwords are stored as scrypt hashes, never in plain text. The demo accounts keep the password "demo123".
const hash = (pw) => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(pw, salt, 32).toString('hex')}`;
};

const toDoc = (row, idField = 'id') => {
  const { [idField]: id, ...rest } = row;
  return { _id: id, ...rest };
};

function convert(db) {
  const out = {};
  out.users = db.users.map((u) => {
    const { password, ...rest } = toDoc(u);
    return { ...rest, passwordHash: hash(password) };
  });
  for (const name of ['listings', 'storages', 'vehicles', 'orders', 'payments', 'disputes', 'payouts', 'enquiries', 'transportRequests', 'transportBids', 'storageRequests', 'storageBids', 'events']) {
    out[name] = db[name].map((r) => toDoc(r));
  }
  out.shipments = db.shipments.map((r) => toDoc(r, 'trackingId'));
  for (const name of ['orders', 'enquiries', 'disputes', 'payouts', 'payments', 'transportRequests', 'storageRequests', 'storageBids', 'transportBids', 'events']) {
    // Every ISO timestamp field (createdAt, paidAt, releasedAt, requestedAt, ...) becomes a real date.
    out[name].forEach((d) => {
      for (const [k, val] of Object.entries(d)) if ((k.endsWith('At') || k === 'timestamp') && typeof val === 'string') d[k] = new Date(val);
      if (Array.isArray(d.history)) d.history = d.history.map((h) => ({ ...h, at: new Date(h.at) }));
    });
  }
  return out;
}

// Local checks that do not need a server: referential integrity, unique emails, one live bid per provider per request.
function preflight(db, docs) {
  const problems = [...checkIntegrity(db)];
  const emails = new Set();
  docs.users.forEach((u) => { const e = u.email.toLowerCase(); if (emails.has(e)) problems.push(`duplicate email ${e}`); emails.add(e); });
  for (const [coll, who] of [['transportBids', 'transporterId'], ['storageBids', 'ownerId']]) {
    const seen = new Set();
    docs[coll].filter((b) => ['Pending', 'Outdated', 'Selected'].includes(b.status)).forEach((b) => {
      const k = `${b.requestId}|${b[who]}`; if (seen.has(k)) problems.push(`${coll}: two live bids ${k}`); seen.add(k);
    });
  }
  // Mirror of the server-side validators (required, type, enum), so mistakes show up before connecting.
  const typeOk = (bt, val) => [].concat(bt).some((t) => ({
    null: val === null, string: typeof val === 'string', bool: typeof val === 'boolean', array: Array.isArray(val),
    object: val && typeof val === 'object' && !Array.isArray(val), int: typeof val === 'number', long: typeof val === 'number',
    double: typeof val === 'number', decimal: typeof val === 'number',
  }[t]));
  const check = (coll, d, schema, path = '') => {
    for (const r of schema.required || []) if (d[r] === undefined) problems.push(`${coll} ${d._id}: missing ${path}${r}`);
    for (const [k, p] of Object.entries(schema.properties || {})) {
      if (d[k] === undefined) continue;
      if (!typeOk(p.bsonType, d[k])) problems.push(`${coll} ${d._id}: ${path}${k} has the wrong type`);
      else if (p.enum && !p.enum.includes(d[k])) problems.push(`${coll} ${d._id}: ${path}${k}="${d[k]}" not allowed`);
      else if (p.bsonType === 'object') check(coll, d[k], p, `${path}${k}.`);
    }
  };
  for (const [coll, def] of Object.entries(COLLECTIONS)) docs[coll].forEach((d) => check(coll, d, def.validator.$jsonSchema));
  const regs = new Set();
  docs.vehicles.forEach((x) => { if (regs.has(x.regNo)) problems.push(`duplicate regNo ${x.regNo}`); regs.add(x.regNo); });
  return problems;
}

const docs = convert(seed);
const problems = preflight(seed, docs);
if (problems.length) { console.error('Data problems:\n' + problems.join('\n')); process.exit(1); }
const summary = Object.entries(docs).map(([k, v]) => `${k}: ${v.length}`).join(', ');

if (dry) {
  console.log('Dry run OK. Documents ready:', summary);
  process.exit(0);
}

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI is not set. Copy .env.example to .env and put your Atlas connection string in it.'); process.exit(1); }
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'agrilogix');
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const [name, def] of Object.entries(COLLECTIONS)) {
    if (!existing.has(name)) await db.createCollection(name, { validator: def.validator, validationLevel: 'strict' });
    else await db.command({ collMod: name, validator: def.validator, validationLevel: 'strict' });
    const col = db.collection(name);
    await col.deleteMany({});
    for (const [keys, opts] of def.indexes) await col.createIndex(keys, opts || {});
    await col.insertMany(docs[name]);
    console.log(`ok  ${name}: ${docs[name].length} documents, ${def.indexes.length} indexes`);
  }
  console.log(`Done. Database "${db.databaseName}" is loaded.`);
} catch (e) {
  console.error('MongoDB error:', e.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
