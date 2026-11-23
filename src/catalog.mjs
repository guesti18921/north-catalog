export const MIN_PRICE = 0;
export const MAX_PRICE = 10_000;

const nameCollator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

const productComparators = {
  'price-asc': (left, right) => left.price - right.price,
  'price-desc': (left, right) => right.price - left.price,
  alphabetical: (left, right) => nameCollator.compare(left.name, right.name),
};

function normalizeSearch(text) {
  return text.normalize('NFC').toLocaleLowerCase('ru').replaceAll('ё', 'е');
}

/**
 * Filters catalog records. Popularity follows the order in products.json.
 * @param {{ name: string, subtitle: string, category: string, price: number }[]} products
 */
export function getVisibleProducts(products, {
  query = '',
  category = null,
  minPrice = MIN_PRICE,
  maxPrice = MAX_PRICE,
  sort = 'popular',
} = {}) {
  const terms = normalizeSearch(query).trim().split(/\s+/u).filter(Boolean);

  const visibleProducts = products.filter((product) => {
    if (category !== null && product.category !== category) return false;
    if (product.price < minPrice || product.price > maxPrice) return false;
    if (terms.length === 0) return true;

    const name = normalizeSearch(product.name);
    const subtitle = normalizeSearch(product.subtitle);
    return terms.every((term) => name.includes(term) || subtitle.includes(term));
  });

  return Object.hasOwn(productComparators, sort)
    ? visibleProducts.sort(productComparators[sort])
    : visibleProducts;
}

export function addToCart(cart, productId) {
  const nextCart = new Map(cart);
  nextCart.set(productId, (nextCart.get(productId) ?? 0) + 1);
  return nextCart;
}

export function countCartItems(cart) {
  let count = 0;
  for (const quantity of cart.values()) count += quantity;
  return count;
}

export function toggleFavorite(favorites, productId) {
  const nextFavorites = new Set(favorites);
  if (!nextFavorites.delete(productId)) nextFavorites.add(productId);
  return nextFavorites;
}
