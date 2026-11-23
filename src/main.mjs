import { addToCart, countCartItems, getVisibleProducts, MAX_PRICE, MIN_PRICE, toggleFavorite } from './catalog.mjs';

const byId = (id) => document.getElementById(id);
const rubles = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
});
const productPlural = new Intl.PluralRules('ru-RU');
const productForms = { one: 'товар', few: 'товара', many: 'товаров', other: 'товара' };
const productCount = (count) => `${count} ${productForms[productPlural.select(count)]}`;

const categories = [
  { value: '', label: 'Все товары' },
  { value: 'Устройства', label: 'Устройства' },
  { value: 'Подставки', label: 'Подставки' },
  { value: 'Аксессуары', label: 'Аксессуары' },
];

const state = {
  products: [],
  query: '',
  category: '',
  minPrice: MIN_PRICE,
  maxPrice: MAX_PRICE,
  sort: 'popular',
  cart: new Map(),
  favorites: new Set(),
  favoritesOnly: false,
  selectedProduct: null,
};

const search = byId('search');
const sort = byId('sort');
const priceMin = byId('price-min');
const priceMax = byId('price-max');
const priceSlider = byId('price-slider');
const grid = byId('product-grid');
const catalogTitle = byId('catalog-title');
const emptyState = byId('empty-state');
const emptyAction = byId('empty-action');
const productDialog = byId('product-dialog');
const filterControls = byId('filter-controls');
const mobileQuery = matchMedia('(max-width: 820px)');

function setFilterLayout() {
  if (mobileQuery.matches) {
    byId('mobile-filter-panel').append(filterControls);
  } else {
    byId('filters-dialog').close();
    byId('menu-dialog').close();
    byId('desktop-filters').append(filterControls);
  }
  search.placeholder = mobileQuery.matches ? 'Найти товар' : 'Поиск по каталогу';
}

function createCategoryOption(category, mobile) {
  const label = document.createElement('label');
  label.className = mobile ? 'chip' : 'category-option';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = mobile ? 'chip-category' : 'filter-category';
  input.value = category.value;
  input.checked = category.value === state.category;
  if (mobile) input.className = 'sr-only';

  const name = document.createElement('span');
  name.textContent = category.label;
  label.append(input, name);

  if (!mobile) {
    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';
    checkmark.setAttribute('aria-hidden', 'true');
    input.after(checkmark);

    const quantity = document.createElement('span');
    quantity.className = 'category-count';
    quantity.textContent = state.products.filter((product) => !category.value || product.category === category.value).length;
    label.append(quantity);
  }

  input.addEventListener('change', () => {
    state.category = input.value;
    syncCategory();
    renderResults();
  });
  return label;
}

function syncCategory() {
  document.querySelectorAll('.category-option input, .chip input').forEach((input) => {
    input.checked = input.value === state.category;
  });
}

function renderPrice() {
  const minLabel = rubles.format(state.minPrice);
  const maxLabel = rubles.format(state.maxPrice);
  priceMin.value = state.minPrice;
  priceMax.value = state.maxPrice;
  priceMin.setAttribute('aria-valuetext', minLabel);
  priceMax.setAttribute('aria-valuetext', maxLabel);
  byId('price-from').textContent = minLabel;
  byId('price-to').textContent = maxLabel;
  priceSlider.style.setProperty('--min', `${state.minPrice / MAX_PRICE * 100}%`);
  priceSlider.style.setProperty('--max', `${state.maxPrice / MAX_PRICE * 100}%`);
}

function updatePrice(input, value) {
  if (input === priceMin) {
    state.minPrice = Math.min(value, state.maxPrice);
  } else {
    state.maxPrice = Math.max(value, state.minPrice);
  }
  renderPrice();
  renderResults();
}

function setFavoriteButton(button, product) {
  button.setAttribute('aria-label', `Избранное — ${product.name}`);
  button.setAttribute('aria-pressed', String(state.favorites.has(product.id)));
}

function setProductImage(image, product) {
  image.src = product.image;
  image.alt = product.imageAlt ?? `${product.name} — ${product.subtitle.toLocaleLowerCase('ru')}`;
}

function createProductCard(product) {
  const card = byId('product-template').content.cloneNode(true);
  setProductImage(card.querySelector('img'), product);
  card.querySelector('.product-category').textContent = product.category;
  card.querySelector('.product-name').textContent = product.name;
  card.querySelector('.product-price').textContent = rubles.format(product.price);
  card.querySelector('.product-subtitle').textContent = product.subtitle;

  const openButton = card.querySelector('.product-open');
  openButton.setAttribute('aria-label', `Открыть товар ${product.name}`);
  openButton.addEventListener('click', () => showProduct(product));

  const favoriteButton = card.querySelector('.favorite-button');
  setFavoriteButton(favoriteButton, product);
  favoriteButton.addEventListener('click', () => {
    state.favorites = toggleFavorite(state.favorites, product.id);
    if (state.favoritesOnly) {
      const index = [...grid.querySelectorAll('.favorite-button')].indexOf(favoriteButton);
      renderResults();
      const buttons = grid.querySelectorAll('.favorite-button');
      const nextFocus = buttons[index] ?? buttons[buttons.length - 1] ?? emptyAction;
      nextFocus.focus();
    } else {
      setFavoriteButton(favoriteButton, product);
    }
  });
  return card;
}

function renderResults() {
  const products = state.favoritesOnly
    ? state.products.filter((product) => state.favorites.has(product.id))
    : state.products;
  const results = getVisibleProducts(products, { ...state, category: state.category || null });
  catalogTitle.textContent = state.favoritesOnly ? 'Избранное' : state.category || 'Все товары';
  byId('result-count').textContent = productCount(results.length);
  grid.replaceChildren(...results.map(createProductCard));
  emptyState.hidden = results.length > 0;
  grid.hidden = results.length === 0;

  const noFavorites = state.favoritesOnly && state.favorites.size === 0;
  byId('empty-title').textContent = noFavorites ? 'В избранном пока пусто' : 'Товары не найдены';
  byId('empty-message').textContent = noFavorites
    ? 'Нажмите на сердечко у товара, чтобы сохранить его здесь.'
    : 'Измените условия поиска или сбросьте фильтры.';
  emptyAction.textContent = noFavorites ? 'К каталогу' : 'Сбросить фильтры';
}

function resetFilters() {
  state.category = '';
  state.query = '';
  state.minPrice = MIN_PRICE;
  state.maxPrice = MAX_PRICE;
  state.sort = 'popular';
  search.value = state.query;
  sort.value = state.sort;
  syncCategory();
  renderPrice();
  renderResults();
}

function setFavoritesView(active) {
  state.favoritesOnly = active;
  document.querySelectorAll('[data-favorites]').forEach((button) => {
    button.setAttribute('aria-pressed', String(active));
  });
  const catalogLink = document.querySelector('.desktop-nav a');
  if (active) catalogLink.removeAttribute('aria-current');
  else catalogLink.setAttribute('aria-current', 'page');
  renderResults();
}

function showProduct(product) {
  state.selectedProduct = product;
  setProductImage(byId('detail-image'), product);
  byId('detail-category').textContent = product.subcategory
    ? `${product.category} / ${product.subcategory}`
    : product.category;
  byId('detail-title').textContent = product.name;
  byId('detail-subtitle').textContent = product.subtitle;
  byId('detail-price').textContent = rubles.format(product.price);
  byId('detail-description').textContent = product.description;
  byId('detail-color').textContent = product.color;
  byId('add-to-cart').textContent = `Добавить в корзину — ${rubles.format(product.price)}`;
  byId('cart-announcement').textContent = '';
  productDialog.showModal();
  productDialog.scrollTop = 0;
}

function addSelectedProduct() {
  const product = state.selectedProduct;
  state.cart = addToCart(state.cart, product.id);
  const count = countCartItems(state.cart);
  byId('cart-count').textContent = count;
  document.querySelector('.cart').setAttribute('aria-label', `Корзина, ${productCount(count)}`);
  byId('cart-announcement').textContent = `${product.name} добавлен. В корзине ${productCount(count)}.`;
}

function bindControls() {
  search.addEventListener('input', () => {
    state.query = search.value;
    renderResults();
  });
  sort.addEventListener('change', () => {
    state.sort = sort.value;
    renderResults();
  });
  for (const input of [priceMin, priceMax]) {
    input.addEventListener('input', () => updatePrice(input, input.valueAsNumber));
  }
  const sliderTrack = priceSlider.querySelector('.slider-track');
  sliderTrack.addEventListener('click', (event) => {
    const track = sliderTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - track.left) / track.width));
    const value = Math.round(ratio * MAX_PRICE);
    const midpoint = (state.minPrice + state.maxPrice) / 2;
    const input = value < midpoint ? priceMin : priceMax;
    updatePrice(input, value);
    input.focus();
  });

  document.querySelectorAll('[data-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button === emptyAction && state.favoritesOnly && state.favorites.size === 0) {
        setFavoritesView(false);
      }
      resetFilters();
      if (button === emptyAction) catalogTitle.focus();
    });
  });
  document.querySelectorAll('[data-catalog]').forEach((link) => {
    link.addEventListener('click', () => {
      byId('menu-dialog').close();
      if (state.favoritesOnly) setFavoritesView(false);
    });
  });
  document.querySelectorAll('[data-favorites]').forEach((button) => {
    button.addEventListener('click', () => {
      byId('menu-dialog').close();
      setFavoritesView(!state.favoritesOnly);
      catalogTitle.focus();
    });
  });
  document.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', () => byId(button.dataset.open).showModal());
  });
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', () => dialog.close());
    });
    let pressedOnBackdrop = false;
    dialog.addEventListener('pointerdown', (event) => {
      pressedOnBackdrop = event.target === dialog;
    });
    dialog.addEventListener('click', (event) => {
      if (pressedOnBackdrop && event.target === dialog) dialog.close();
      pressedOnBackdrop = false;
    });
  });

  byId('add-to-cart').addEventListener('click', addSelectedProduct);
  mobileQuery.addEventListener('change', setFilterLayout);
  setFilterLayout();
}

async function start() {
  const response = await fetch(new URL('../products.json', import.meta.url));
  if (!response.ok) throw new Error(`Не удалось загрузить каталог (${response.status})`);
  state.products = await response.json();
  for (const category of categories) {
    byId('sidebar-categories').append(createCategoryOption(category, false));
    byId('mobile-categories').append(createCategoryOption(category, true));
  }
  bindControls();
  renderResults();
}

start().catch((error) => {
  console.error(error);
  byId('empty-title').textContent = 'Каталог не загрузился';
  byId('empty-message').textContent = 'Обновите страницу, чтобы повторить попытку.';
  emptyAction.hidden = true;
  emptyState.hidden = false;
});
