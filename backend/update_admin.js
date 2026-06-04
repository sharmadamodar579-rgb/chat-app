const pg = require('pg'); 
const client = new pg.Client({connectionString: 'postgresql://neondb_owner:npg_SsJa80rDMbtl@ep-withered-credit-aot2plbr.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'}); 
client.connect().then(() => {
  return client.query("UPDATE users SET profile_picture = 'spiderman-theme.png' WHERE username = 'admin'");
}).then(res => { 
  console.log('Admin avatar updated:', res.rowCount); 
  return client.end();
}).catch(console.error);
