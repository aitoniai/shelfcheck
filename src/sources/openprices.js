const API = 'https://prices.openfoodfacts.org/api/v1/prices';

/** Recent crowd-sourced shelf prices (per pack) for a barcode, in the given currency. */
export async function fetchPrices(barcode, currency) {
  // shortcut: filters by currency, not country (EUR covers all of the eurozone); add a country filter if prices look off.
  const url = `${API}?product_code=${encodeURIComponent(barcode)}&currency=${currency}&size=50&order_by=-date`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Prices error ${res.status}`);
  const { items = [] } = await res.json();
  return items.filter((i) => !i.price_is_discounted && i.price > 0).map((i) => ({ price: i.price, date: i.date }));
}
