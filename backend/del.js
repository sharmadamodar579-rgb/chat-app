const pg = require('pg'); 
const client = new pg.Client({connectionString: 'postgresql://neondb_owner:npg_SsJa80rDMbtl@ep-withered-credit-aot2plbr.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'}); 
client.connect().then(() => {
  return client.query("DELETE FROM users WHERE username IN ('alice', 'bob', 'charlie', 'diana')");
}).then(res => { 
  console.log('Deleted rows:', res.rowCount); 
  return client.query("DELETE FROM posts WHERE username IN ('alice', 'bob', 'charlie', 'diana')");
}).then(() => client.end()).catch(console.error);
