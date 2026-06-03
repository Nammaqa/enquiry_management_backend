const { BillingPaymentHistory } = require('./src/models');
async function test() {
  const rows = await BillingPaymentHistory.findAll({ order: [['id', 'DESC']], limit: 5 });
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
test();
