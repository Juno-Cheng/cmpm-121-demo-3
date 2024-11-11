// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

// =========== Cell Classes =============

// Interface for the Memento pattern
interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

// Cell class representing each unique grid cell with Flyweight pattern
class Cell {
  constructor(
    public i: number,
    public j: number,
  ) {}

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

// Cache class that implements Memento to save and restore state
class Cache implements Memento<string> {
  public coins: string[];

  constructor(
    public cell: Cell,
    initialCoins: string[],
  ) {
    this.coins = initialCoins;
  }

  toMemento(): string {
    return JSON.stringify(this.coins); // Save the coins state as a JSON string
  }

  fromMemento(memento: string): void {
    this.coins = JSON.parse(memento); // Restore coins state from a JSON string
  }

  removeCoin(index: number): string | null {
    return this.coins.splice(index, 1)[0] || null;
  }

  addCoin(coin: string): void {
    this.coins.push(coin);
  }
}

// =========== Constants and Initialization =============

const APP_NAME = "Coin Hunter 💰";
const TILE_DEGREES = 1e-4; // Grid cell size in degrees
const VISIBLE_RADIUS = 5; // Radius (in cells) within which caches are shown
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
      <ul id="inventoryList">
      </ul>
      <p id="selectedCoinDisplay">Selected coin: None</p>
    </aside>

    <div id="controls" class="controls">
      <button id="moveUp">⬆️</button>
      <button id="moveLeft">⬅️</button>
      <button id="moveRight">➡️</button>
      <button id="moveDown">⬇️</button>
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
let playerCell = convertLatLngToGrid(
  OAKES_COORDINATES.lat,
  OAKES_COORDINATES.lng,
);
let cacheStorage: Map<string, string> = new Map(); // Stores mementos of cache states
let cacheMarkers: leaflet.Marker[] = []; // Stores current cache markers

function convertLatLngToGrid(lat: number, lng: number): Cell {
  const i = Math.floor(lat / TILE_DEGREES);
  const j = Math.floor(lng / TILE_DEGREES);
  return CellFactory.getCell(i, j);
}

function generateCoinID(cell: Cell, serial: number): string {
  return `${cell.toString()}#${serial}`;
}

// Spawn a cache and restore its state if previously visited
function spawnCache(cell: Cell) {
  const cellKey = cell.toString();
  let cache: Cache;

  // Check if cache has been visited and load state
  if (cacheStorage.has(cellKey)) {
    const savedState = cacheStorage.get(cellKey)!;
    cache = new Cache(cell, []);
    cache.fromMemento(savedState);
  } else {
    // Generate new coins for a fresh cache
    const numberOfCoins = Math.floor(Math.random() * 5) + 1;
    const initialCoins = Array.from({ length: numberOfCoins }, (_, serial) =>
      generateCoinID(cell, serial),
    );
    cache = new Cache(cell, initialCoins);
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
  cacheMarker.addTo(map);
  cacheMarkers.push(cacheMarker);

  cacheMarker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `<div>Cache at ${cell.toString()}</div>`;

    const coinList = document.createElement("ul");
    cache.coins.forEach((coin, coinIndex) => {
      const coinItem = document.createElement("li");
      coinItem.textContent = `🪙 ${coin}`;

      const collectButton = document.createElement("button");
      collectButton.textContent = "Collect";
      collectButton.onclick = () => {
        const collectedCoin = cache.removeCoin(coinIndex);
        if (collectedCoin) {
          playerInventory.push(collectedCoin);
          updateInventoryDisplay();
          cacheStorage.set(cellKey, cache.toMemento()); // Save cache state
          cacheMarker.closePopup();
          cacheMarker.openPopup();
        }
      };

      coinItem.appendChild(collectButton);
      coinList.appendChild(coinItem);
    });
    popupDiv.appendChild(coinList);

    // Deposit Button
    const depositButton = document.createElement("button");
    depositButton.textContent = "Deposit Selected Coin";
    depositButton.onclick = () => {
      if (selectedCoin) {
        cache.addCoin(selectedCoin);
        playerInventory = playerInventory.filter(
          (coin) => coin !== selectedCoin,
        );
        selectedCoin = null;
        updateInventoryDisplay();
        cacheStorage.set(cellKey, cache.toMemento()); // Save cache state
        cacheMarker.closePopup();
        cacheMarker.openPopup();
      } else {
        alert("No coin selected for deposit!");
      }
    };
    popupDiv.appendChild(depositButton);

    return popupDiv;
  });
}

// Move the player and regenerate caches
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
  regenerateCaches();
}

// Regenerate caches within radius around player's position
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

// =========== Controls =============
document.getElementById("moveUp")!.onclick = () => movePlayer("north");
document.getElementById("moveDown")!.onclick = () => movePlayer("south");
document.getElementById("moveLeft")!.onclick = () => movePlayer("west");
document.getElementById("moveRight")!.onclick = () => movePlayer("east");

// =========== Inventory =============
let playerInventory: string[] = [];
let selectedCoin: string | null = null;

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

// Initial cache generation around starting position
regenerateCaches();
