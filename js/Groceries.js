const STORAGE_KEY = "p5_groceries_state_v1";
const FIXED_STORE_NAMES = ["Walmart", "Dollar Tree", "Sam's"];
const FIXED_TAX_RATES = {
  food: 3,
  other: 10.5,
};

const DEFAULT_STATE = {
  taxRates: { ...FIXED_TAX_RATES },
  stores: [
    { id: "store-1", name: FIXED_STORE_NAMES[0], items: [] },
    { id: "store-2", name: FIXED_STORE_NAMES[1], items: [] },
    { id: "store-3", name: FIXED_STORE_NAMES[2], items: [] },
  ],
};

let state = normalizeState(DEFAULT_STATE);

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeItem(item) {
  const safeItem = item && typeof item === "object" ? item : {};
  const normalizedCategory = safeItem.category === "other" ? "other" : "food";

  return {
    id: safeItem.id || makeId(),
    name: typeof safeItem.name === "string" ? safeItem.name.trim() : "",
    price: toMoney(safeItem.price),
    category: normalizedCategory,
    completed: Boolean(safeItem.completed),
  };
}

function normalizeStore(store, fallbackName) {
  const safeStore = store && typeof store === "object" ? store : {};
  const items = Array.isArray(safeStore.items) ? safeStore.items : [];

  return {
    id: safeStore.id || makeId(),
    name: fallbackName,
    items: items
      .map((item) => normalizeItem(item))
      .filter((item) => item.name.length > 0 && item.price >= 0),
  };
}

function normalizeState(source) {
  const safeSource = source && typeof source === "object" ? source : {};
  const stores = Array.isArray(safeSource.stores) ? safeSource.stores : [];

  const normalizedStores = [];
  for (let i = 0; i < 3; i += 1) {
    normalizedStores.push(normalizeStore(stores[i], FIXED_STORE_NAMES[i]));
  }

  return {
    taxRates: { ...FIXED_TAX_RATES },
    stores: normalizedStores,
  };
}

function formatMoney(amount) {
  return `$${toMoney(amount).toFixed(2)}`;
}

function getTaxRateDecimal(category) {
  const percent = category === "other" ? state.taxRates.other : state.taxRates.food;
  return toMoney(percent) / 100;
}

function calculateStoreTotals(store) {
  const totals = {
    subtotal: 0,
    foodTax: 0,
    otherTax: 0,
    taxTotal: 0,
    estimatedTotal: 0,
  };

  store.items.forEach((item) => {
    totals.subtotal += item.price;

    const taxAmount = item.price * getTaxRateDecimal(item.category);
    if (item.category === "other") {
      totals.otherTax += taxAmount;
    } else {
      totals.foodTax += taxAmount;
    }
  });

  totals.taxTotal = totals.foodTax + totals.otherTax;
  totals.estimatedTotal = totals.subtotal + totals.taxTotal;
  return totals;
}

function calculateCombinedTotals() {
  const combined = {
    subtotal: 0,
    foodTax: 0,
    otherTax: 0,
    taxTotal: 0,
    estimatedTotal: 0,
  };

  state.stores.forEach((store) => {
    const totals = calculateStoreTotals(store);
    combined.subtotal += totals.subtotal;
    combined.foodTax += totals.foodTax;
    combined.otherTax += totals.otherTax;
    combined.taxTotal += totals.taxTotal;
    combined.estimatedTotal += totals.estimatedTotal;
  });

  return combined;
}

function createSummaryStat(label, value, isTotal) {
  const wrapper = document.createElement("div");
  wrapper.className = "summary-stat";

  const labelEl = document.createElement("span");
  labelEl.className = "summary-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = `summary-value${isTotal ? " total" : ""}`;
  valueEl.textContent = formatMoney(value);

  wrapper.appendChild(labelEl);
  wrapper.appendChild(valueEl);
  return wrapper;
}

function renderSummaryGrid(container, totals) {
  container.textContent = "";
  container.appendChild(createSummaryStat("Planned Subtotal", totals.subtotal, false));
  container.appendChild(createSummaryStat("Food Tax", totals.foodTax, false));
  container.appendChild(createSummaryStat("Sales Tax", totals.otherTax, false));
  container.appendChild(createSummaryStat("Estimated Checkout", totals.estimatedTotal, true));
}

function createDefaultState() {
  return normalizeState(DEFAULT_STATE);
}

function saveLocalOnly() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function saveToDropbox() {
  const userToken = localStorage.getItem("dropbox_token");
  if (!userToken) {
    return;
  }

  try {
    await fetch("/api/save-to-dropbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userToken,
        dataType: "groceries",
        groceries: state,
      }),
    });
  } catch (error) {
    console.error("Groceries Dropbox save failed:", error);
  }
}

function saveState() {
  saveLocalOnly();
  saveToDropbox();
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    state = normalizeState(JSON.parse(saved));
  } catch (error) {
    console.error("Failed to load groceries data from localStorage:", error);
    state = normalizeState(DEFAULT_STATE);
  }
}

async function loadFromDropbox() {
  const userToken = localStorage.getItem("dropbox_token");
  if (!userToken) {
    return;
  }

  try {
    const response = await fetch("/api/load-from-dropbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userToken, dataType: "groceries" }),
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    if (!payload || !payload.groceries) {
      return;
    }

    state = normalizeState(payload.groceries);
    saveLocalOnly();
    render();
  } catch (error) {
    console.error("Failed to load groceries from Dropbox:", error);
  }
}

function addItem(storeId, name, price, category) {
  const store = state.stores.find((candidate) => candidate.id === storeId);
  if (!store) {
    return;
  }

  store.items.push({
    id: makeId(),
    name: name.trim(),
    price: toMoney(price),
    category: category === "other" ? "other" : "food",
    completed: false,
  });

  saveState();
  render();
}

function toggleItemCompleted(storeId, itemId) {
  const store = state.stores.find((candidate) => candidate.id === storeId);
  if (!store) {
    return;
  }

  const item = store.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    return;
  }

  item.completed = !item.completed;
  saveState();
  render();
}

function removeItem(storeId, itemId) {
  const store = state.stores.find((candidate) => candidate.id === storeId);
  if (!store) {
    return;
  }

  store.items = store.items.filter((item) => item.id !== itemId);
  saveState();
  render();
}

function resetPlanner() {
  const shouldReset = window.confirm(
    "Reset the groceries planner? This clears all store items."
  );

  if (!shouldReset) {
    return;
  }

  state = createDefaultState();
  saveState();
  render();
}

function createStoreMeta(store) {
  const meta = document.createElement("p");
  meta.className = "store-meta";

  const completedCount = store.items.filter((item) => item.completed).length;
  if (!store.items.length) {
    meta.textContent = "Start a list for this store before your next grocery run.";
    return meta;
  }

  meta.textContent = `${completedCount} of ${store.items.length} items checked off`;
  return meta;
}

function renderStoreCard(store) {
  const card = document.createElement("article");
  card.className = "store-card";

  const header = document.createElement("div");
  header.className = "store-card-header";

  const title = document.createElement("h3");
  title.textContent = store.name;
  header.appendChild(title);
  header.appendChild(createStoreMeta(store));
  card.appendChild(header);

  const addRow = document.createElement("div");
  addRow.className = "add-item-row";

  const itemNameLabel = document.createElement("label");
  itemNameLabel.textContent = "Item";
  const itemNameInput = document.createElement("input");
  itemNameInput.type = "text";
  itemNameInput.placeholder = "Milk, rice, soap...";
  itemNameLabel.appendChild(itemNameInput);

  const itemPriceLabel = document.createElement("label");
  itemPriceLabel.textContent = "Price";
  const itemPriceInput = document.createElement("input");
  itemPriceInput.type = "number";
  itemPriceInput.step = "0.01";
  itemPriceInput.min = "0";
  itemPriceInput.placeholder = "0.00";
  itemPriceLabel.appendChild(itemPriceInput);

  const categoryLabel = document.createElement("label");
  categoryLabel.textContent = "Tax Type";
  const categorySelect = document.createElement("select");
  const foodOption = document.createElement("option");
  foodOption.value = "food";
  foodOption.textContent = "Food Tax";
  const otherOption = document.createElement("option");
  otherOption.value = "other";
  otherOption.textContent = "Sales Tax";
  categorySelect.appendChild(foodOption);
  categorySelect.appendChild(otherOption);
  categoryLabel.appendChild(categorySelect);

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "Add Item";
  const submitItem = () => {
    const name = itemNameInput.value.trim();
    const price = Number(itemPriceInput.value);

    if (!name) {
      alert("Enter an item name.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      alert("Enter a valid item price.");
      return;
    }

    addItem(store.id, name, price, categorySelect.value);
    itemNameInput.value = "";
    itemPriceInput.value = "";
    categorySelect.value = "food";
    itemNameInput.focus();
  };
  addButton.addEventListener("click", submitItem);

  [itemNameInput, itemPriceInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitItem();
      }
    });
  });

  addRow.appendChild(itemNameLabel);
  addRow.appendChild(itemPriceLabel);
  addRow.appendChild(categoryLabel);
  addRow.appendChild(addButton);
  card.appendChild(addRow);

  const itemList = document.createElement("div");
  itemList.className = "item-list";

  if (!store.items.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No items planned for this store yet.";
    itemList.appendChild(emptyState);
  } else {
    const sortedItems = [...store.items].sort((a, b) => Number(a.completed) - Number(b.completed));

    sortedItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = `item-row${item.completed ? " is-complete" : ""}`;

      const checkboxWrap = document.createElement("label");
      checkboxWrap.className = "item-check";
      checkboxWrap.setAttribute("aria-label", `Mark ${item.name} complete`);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.completed;
      checkbox.addEventListener("change", () => toggleItemCompleted(store.id, item.id));
      checkboxWrap.appendChild(checkbox);

      const itemName = document.createElement("div");
      itemName.className = "item-name";
      itemName.textContent = item.name;

      const price = document.createElement("div");
      price.className = "item-line-price";
      price.textContent = formatMoney(item.price);

      const itemTaxType = document.createElement("div");
      itemTaxType.className = "item-tax-type";
      itemTaxType.textContent = item.category === "other" ? "Sales tax" : "Food tax";

      const taxAmount = item.price * getTaxRateDecimal(item.category);
      const taxDisplay = document.createElement("div");
      taxDisplay.className = "item-tax-amount";
      taxDisplay.textContent = `+${formatMoney(taxAmount)} tax`;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "danger-action item-remove-btn";
      removeButton.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';
      removeButton.setAttribute("aria-label", `Remove ${item.name}`);
      removeButton.title = `Remove ${item.name}`;
      removeButton.addEventListener("click", () => removeItem(store.id, item.id));

      row.appendChild(checkboxWrap);
      row.appendChild(itemName);
      row.appendChild(itemTaxType);
      row.appendChild(price);
      row.appendChild(taxDisplay);
      row.appendChild(removeButton);
      itemList.appendChild(row);
    });
  }

  card.appendChild(itemList);

  const storeSummaryGrid = document.createElement("div");
  storeSummaryGrid.className = "summary-grid";
  renderSummaryGrid(storeSummaryGrid, calculateStoreTotals(store));
  card.appendChild(storeSummaryGrid);

  return card;
}

function render() {
  const combinedSummaryGrid = document.getElementById("combined-summary-grid");
  const storeGrid = document.getElementById("store-grid");
  if (!combinedSummaryGrid || !storeGrid) {
    return;
  }

  renderSummaryGrid(combinedSummaryGrid, calculateCombinedTotals());

  storeGrid.textContent = "";
  state.stores.forEach((store) => {
    storeGrid.appendChild(renderStoreCard(store));
  });
}

function attachPlannerActions() {
  const resetButton = document.getElementById("reset-groceries");
  if (resetButton) {
    resetButton.addEventListener("click", resetPlanner);
  }
}

function init() {
  loadFromLocalStorage();
  attachPlannerActions();
  render();
  loadFromDropbox();
}

document.addEventListener("DOMContentLoaded", init);
