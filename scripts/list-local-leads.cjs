const {
  closeLocalLeadDb,
  getLocalLeadDbPath,
  listLocalLeads
} = require('../backend/localLeadDb');

const limit = Number(process.argv[2] || 20);

try {
  const rows = listLocalLeads(limit);
  console.log(`Local lead database: ${getLocalLeadDbPath()}`);

  if (!rows.length) {
    console.log('No local leads found.');
  } else {
    console.table(rows);
  }
} finally {
  closeLocalLeadDb();
}
