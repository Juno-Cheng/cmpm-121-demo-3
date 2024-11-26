// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

// ===========  Classes =============

// Interface for the Memento pattern
interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

// Cell class representing each unique grid cell with Flyweight pattern
class Cell {
  constructor(public i: number, public j: number) {}

  toString(): string {
    return `${this.i}:${this.j}`;
  }
}

// CellFactory to manage Flyweight instances of Cells
class CellFactory {
  private static cellCache: Map<string, Cell> = new Map();

  static getCell(i: number, j: number): Cell {
    const key = `${i}:${j}`;
    if (!CellFactory.cellCache.has(key)) {
      CellFactory.cellCache.set(key, new Cell(i, j));
    }
    return CellFactory.cellCache.get(key)!;
  }
}

// Cache class that implements Memento to save and restore state (State Management Only)
class Cache implements Memento<string> {
  public coins: string[];

  constructor(public cell: Cell, initialCoins: string[]) {
    this.coins = initialCoins;
  }

  toMemento(): string {
    return JSON.stringify(this.coins);
  }

  fromMemento(memento: string): void {
    this.coins = JSON.parse(memento);
  }

  removeCoin(index: number): string | null {
    return this.coins.splice(index, 1)[0] || null;
  }

  addCoin(coin: string): void {
    this.coins.push(coin);
  }

  getCoinList(): string[] {
    return [...this.coins];
  }
}

// CacheUI class to manage UI rendering and interactions
class CacheUI {
  private popupDiv: HTMLDivElement;

  constructor(private cache: Cache, private cacheStorage: Map<string, string>) {
    this.popupDiv = document.createElement("div");
  }

  createPopup(updateInventory: () => void): HTMLDivElement {
    this.popupDiv.innerHTML = `<div>Cache at ${this.cache.cell.toString()}</div>`;
    this.refreshCoinList(updateInventory);
    this.addDepositButton(updateInventory);
    return this.popupDiv;
  }

  private refreshCoinList(updateInventory: () => void): void {
    // Clear and rebuild the coin list
    const existingList = this.popupDiv.querySelector("ul");
    if (existingList) {
      existingList.remove();
    }

    const coinList = document.createElement("ul");
    this.cache.getCoinList().forEach((coin, coinIndex) => {
      const coinItem = document.createElement("li");
      coinItem.textContent = `🪙 ${coin}`;

      const collectButton = document.createElement("button");
      collectButton.textContent = "Collect";
      collectButton.onclick = () => {
        const collectedCoin = this.cache.removeCoin(coinIndex);
        if (collectedCoin) {
          playerInventory.push(collectedCoin);
          updateInventory();
          this.updateCacheState();
          this.refreshCoinList(updateInventory); // Dynamically refresh the coin list
        }
      };

      coinItem.appendChild(collectButton);
      coinList.appendChild(coinItem);
    });

    this.popupDiv.appendChild(coinList);
  }

  private addDepositButton(updateInventory: () => void): void {
    // Clear any existing deposit button
    const existingButton = this.popupDiv.querySelector("button.deposit");
    if (existingButton) {
      existingButton.remove();
    }

    const depositButton = document.createElement("button");
    depositButton.textContent = "Deposit Selected Coin";
    depositButton.className = "deposit";
    depositButton.onclick = () => {
      if (selectedCoin) {
        this.cache.addCoin(selectedCoin);
        playerInventory = playerInventory.filter((coin) => coin !== selectedCoin);
        selectedCoin = null;
        updateInventory();
        this.updateCacheState();
        this.refreshCoinList(updateInventory); // Refresh the coin list to reflect the deposited coin
      } else {
        alert("No coin selected for deposit!");
      }
    };
    this.popupDiv.appendChild(depositButton);
  }

  private updateCacheState(): void {
    const cellKey = this.cache.cell.toString();
    this.cacheStorage.set(cellKey, this.cache.toMemento());
    saveGameState();
  }
}


// =========== Constants and Initialization =============

const APP_NAME = "Coin Hunter 💰";
const TILE_DEGREES = 1e-4;
const VISIBLE_RADIUS = 5;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Set up main HTML structure
const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;
app.innerHTML = `
  <header class="app-header">
    <h1>${APP_NAME}</h1>
  </header>
  <div class="app-body">
    <main class="main-content">
      <div id="map" class="map-container"></div>
    </main>
    <aside class="sidebar" id="sidebar">
      <h2>Inventory</h2>
      <ul id="inventoryList"></ul>
      <p id="selectedCoinDisplay">Selected coin: None</p>
      <button id="reset">🚮 Reset</button>
    </aside>
    <div id="controls" class="controls">
      <button id="moveUp">⬆️</button>
      <button id="moveLeft">⬅️</button>
      <button id="moveRight">➡️</button>
      <button id="moveDown">⬇️</button>
      <button id="geoToggle">🌐</button>
    </div>
  </div>
`;

// Initialize Leaflet map
const NULL_ISLAND = leaflet.latLng(0, 0);
const OAKES_COORDINATES = { lat: 36.98949379578401, lng: -122.06277128548504 };
const map = leaflet.map("map", {
  center: NULL_ISLAND,
  zoom: 3,
  zoomControl: true,
  scrollWheelZoom: true,
});
map.setView([OAKES_COORDINATES.lat, OAKES_COORDINATES.lng], 17);
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// =========== Player and Cache State Management =============
let playerCell = convertLatLngToGrid(OAKES_COORDINATES.lat, OAKES_COORDINATES.lng);
const cacheStorage: Map<string, string> = new Map();
const originalCacheStorage: Map<string, string> = new Map();
let cacheMarkers: leaflet.Marker[] = [];

// =========== Movement History Tracking ===========
let movementHistory: leaflet.LatLng[] = [
  leaflet.latLng(OAKES_COORDINATES.lat, OAKES_COORDINATES.lng),
];
const movementPolyline = leaflet
  .polyline(movementHistory, { color: "blue" })
  .addTo(map);

// =========== Functions ===========
function convertLatLngToGrid(lat: number, lng: number): Cell {
  const i = Math.floor(lat / TILE_DEGREES);
  const j = Math.floor(lng / TILE_DEGREES);
  return CellFactory.getCell(i, j);
}

function generateCoinID(cell: Cell, serial: number): string {
  return `${cell.toString()}#${serial}`;
}

// Load and Save State
function saveGameState() {
  localStorage.setItem("playerCell", JSON.stringify([playerCell.i, playerCell.j]));
  localStorage.setItem("playerInventory", JSON.stringify(playerInventory));
  const cacheStorageObject: { [key: string]: string } = {};
  cacheStorage.forEach((value, key) => {
    cacheStorageObject[key] = value;
  });
  localStorage.setItem("cacheStorage", JSON.stringify(cacheStorageObject));
  localStorage.setItem(
    "movementHistory",
    JSON.stringify(movementHistory.map((latLng) => [latLng.lat, latLng.lng]))
  );
}

function loadGameState() {
  const savedPlayerCell = localStorage.getItem("playerCell");
  const savedInventory = localStorage.getItem("playerInventory");
  const savedCacheStorage = localStorage.getItem("cacheStorage");
  const savedMovementHistory = localStorage.getItem("movementHistory");

  if (savedPlayerCell) {
    const [i, j] = JSON.parse(savedPlayerCell);
    playerCell = CellFactory.getCell(i, j);
    map.setView([i * TILE_DEGREES, j * TILE_DEGREES]);
  }

  if (savedInventory) {
    playerInventory = JSON.parse(savedInventory);
    updateInventoryDisplay();
  }

  if (savedCacheStorage) {
    const cacheData = JSON.parse(savedCacheStorage);
    for (const key in cacheData) {
      if (Object.prototype.hasOwnProperty.call(cacheData, key)) {
        cacheStorage.set(key, cacheData[key] as string);
      }
    }
  }

  if (savedMovementHistory) {
    movementHistory = JSON.parse(savedMovementHistory).map(
      (coords: [number, number]) => leaflet.latLng(coords[0], coords[1])
    );
    movementPolyline.setLatLngs(movementHistory);
  }
}

// Spawn Cache Behaviors
function spawnCache(cell: Cell) {
  const cellKey = cell.toString();
  let cache: Cache;

  if (cacheStorage.has(cellKey)) {
    const savedState = cacheStorage.get(cellKey)!;
    cache = new Cache(cell, []);
    cache.fromMemento(savedState);
  } else {
    const numberOfCoins = Math.floor(Math.random() * 5) + 1;
    const initialCoins = Array.from({ length: numberOfCoins }, (_, serial) =>
      generateCoinID(cell, serial)
    );
    cache = new Cache(cell, initialCoins);

    const cacheState = cache.toMemento();
    cacheStorage.set(cellKey, cacheState);
    originalCacheStorage.set(cellKey, cacheState);
  }

  const cacheLat = cell.i * TILE_DEGREES;
  const cacheLng = cell.j * TILE_DEGREES;
  const cacheLocation = leaflet.latLng(cacheLat, cacheLng);

  const cacheMarker = leaflet.marker(cacheLocation, {
    icon: leaflet.divIcon({
      className: "cache-icon",
      html: "🎁",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }),
  });

  const cacheUI = new CacheUI(cache, cacheStorage);
  cacheMarker.bindPopup(() => cacheUI.createPopup(updateInventoryDisplay));
  cacheMarker.addTo(map);
  cacheMarkers.push(cacheMarker);
}

function regenerateCaches() {
  cacheMarkers.forEach((marker) => map.removeLayer(marker));
  cacheMarkers = [];
  for (
    let i = playerCell.i - VISIBLE_RADIUS;
    i <= playerCell.i + VISIBLE_RADIUS;
    i++
  ) {
    for (
      let j = playerCell.j - VISIBLE_RADIUS;
      j <= playerCell.j + VISIBLE_RADIUS;
      j++
    ) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(CellFactory.getCell(i, j));
      }
    }
  }
}

function movePlayer(direction: "north" | "south" | "east" | "west") {
  let { i, j } = playerCell;
  switch (direction) {
    case "north":
      i += 1;
      break;
    case "south":
      i -= 1;
      break;
    case "east":
      j += 1;
      break;
    case "west":
      j -= 1;
      break;
  }
  playerCell = CellFactory.getCell(i, j);
  const newLat = i * TILE_DEGREES;
  const newLng = j * TILE_DEGREES;

  map.setView([newLat, newLng]);

  const newPosition = leaflet.latLng(newLat, newLng);
  movementHistory.push(newPosition);
  movementPolyline.setLatLngs(movementHistory);

  saveGameState();
  regenerateCaches();
}

function getLocation() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      playerCell = convertLatLngToGrid(latitude, longitude);
      map.setView([latitude, longitude]);

      movementHistory.push(leaflet.latLng(latitude, longitude));
      movementPolyline.setLatLngs(movementHistory);

      saveGameState();
      regenerateCaches();
    },
    (error) => {
      console.error("Geolocation error:", error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 5000,
    },
  );
}

function updateInventoryDisplay() {
  const inventoryList = document.getElementById("inventoryList")!;
  const selectedCoinDisplay = document.getElementById("selectedCoinDisplay")!;
  inventoryList.innerHTML = "";

  playerInventory.forEach((coin) => {
    const listItem = document.createElement("li");
    listItem.textContent = `🪙 ${coin}`;
    listItem.style.cursor = "pointer";

    listItem.onclick = () => {
      selectedCoin = coin;
      selectedCoinDisplay.textContent = `Selected coin: 🪙 ${coin}`;
    };

    inventoryList.appendChild(listItem);
  });
}

// =========== Initial State - Function Assignment ===========

let playerInventory: string[] = [];
let selectedCoin: string | null = null;

document.getElementById("moveUp")!.onclick = () => movePlayer("north");
document.getElementById("moveDown")!.onclick = () => movePlayer("south");
document.getElementById("moveLeft")!.onclick = () => movePlayer("west");
document.getElementById("moveRight")!.onclick = () => movePlayer("east");
document.getElementById("geoToggle")!.onclick = () => getLocation();
document.getElementById("reset")!.onclick = () => {
  playerInventory = [];
  selectedCoin = null;
  updateInventoryDisplay();
  cacheStorage.clear();
  originalCacheStorage.forEach((initialState, cellKey) => {
    cacheStorage.set(cellKey, initialState);
  });
  playerCell = convertLatLngToGrid(OAKES_COORDINATES.lat, OAKES_COORDINATES.lng);
  map.setView([OAKES_COORDINATES.lat, OAKES_COORDINATES.lng], 17);
  movementHistory = [leaflet.latLng(OAKES_COORDINATES.lat, OAKES_COORDINATES.lng)];
  movementPolyline.setLatLngs(movementHistory);

  saveGameState();
  regenerateCaches();
};

loadGameState();
regenerateCaches();
