const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SHOP_ITEMS, buyWithPucks, emptyShop, parseShop } = require('../.test-build/store.js');

test('puck purchases are persistent, unique, and balance checked', () => {
  const item = SHOP_ITEMS[0];
  assert.equal(buyWithPucks(emptyShop(), item, item.puckPrice - 1), null);
  const bought = buyWithPucks(emptyShop(), item, item.puckPrice);
  assert.deepEqual(bought.owned, [item.cosmeticId]);
  assert.equal(bought.spent, item.puckPrice);
  assert.equal(buyWithPucks(bought, item, 9999), null);
  assert.deepEqual(parseShop(JSON.stringify(bought)), bought);
});

test('shop persistence rejects unknown inventory and malformed spending', () => {
  assert.deepEqual(parseShop('{broken'), emptyShop());
  assert.deepEqual(parseShop(JSON.stringify({ owned: ['not-real'], spent: -50 })), emptyShop());
});
