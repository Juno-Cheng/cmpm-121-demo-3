// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

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

const APP_NAME = "Coin Hunter 💰";

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

    <!-- Directional Controls at the top-right -->
    <div id="controls" class="controls">
      <button id="moveUp">⬆️</button>
      <button id="moveLeft">⬅️</button>
      <button id="moveRight">➡️</button>
      <button id="moveDown">⬇️</button>
    </div>
  </div>
`;

const NULL_ISLAND = leaflet.latLng(0, 0); 
const OAKES_COORDINATES = { lat: 36.98949379578401, lng: -122.06277128548504 }; // Latitude/Longitude of Oakes College
const TILE_DEGREES = 1e-4; // Grid cell size in degrees
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
// Convert Oakes College coordinates to a unique Cell instance
const oakesCell = convertLatLngToGrid(
  OAKES_COORDINATES.lat,
  OAKES_COORDINATES.lng,
);

// =========== Map Settings =============
// Initialize Leaflet map with initial view on Oakes College but center at Null Island
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

// =========== Map Functions =============

function convertLatLngToGrid(lat: number, lng: number): Cell {
  const i = Math.floor(lat / TILE_DEGREES);
  const j = Math.floor(lng / TILE_DEGREES);
  return CellFactory.getCell(i, j);
}

function generateCoinID(cell: Cell, serial: number): string {
  return `${cell.toString()}#${serial}`;
}

// Spawn a cache at a specific Cell
function spawnCache(cell: Cell) {
  const cacheLat = cell.i * TILE_DEGREES;
  const cacheLng = cell.j * TILE_DEGREES;
  const cacheLocation = leaflet.latLng(cacheLat, cacheLng);

  const numberOfCoins = Math.floor(Math.random() * 5) + 1;
  const cacheCoins = Array.from(
    { length: numberOfCoins },
    (_, serial) => generateCoinID(cell, serial),
  );

  // Add a 🎁 marker for each cache
  const cacheMarker = leaflet.marker(cacheLocation, {
    icon: leaflet.divIcon({
      className: "cache-icon",
      html: "🎁",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }),
  });
  cacheMarker.addTo(map);

  cacheMarker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `<div>Cache at ${cell.toString()}</div>`;

    const coinList = document.createElement("ul");
    cacheCoins.forEach((coin, coinIndex) => {
      const coinItem = document.createElement("li");
      coinItem.textContent = `🪙 ${coin}`;

      const collectButton = document.createElement("button");
      collectButton.textContent = "Collect";
      collectButton.onclick = () => {
        const collectedCoin = cacheCoins.splice(coinIndex, 1)[0];
        playerInventory.push(collectedCoin);
        updateInventoryDisplay();
        cacheMarker.closePopup();
        cacheMarker.openPopup();
      };

      coinItem.appendChild(collectButton);
      coinList.appendChild(coinItem);
    });
    popupDiv.appendChild(coinList);

    const depositButton = document.createElement("button");
    depositButton.textContent = "Deposit Selected Coin";
    depositButton.onclick = () => {
      if (selectedCoin) {
        playerInventory = playerInventory.filter(
          (coin) => coin !== selectedCoin,
        );
        cacheCoins.push(selectedCoin);
        selectedCoin = null;
        updateInventoryDisplay();
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

// Generate caches randomly in a neighborhood around Oakes College
for (
  let i = oakesCell.i - NEIGHBORHOOD_SIZE;
  i < oakesCell.i + NEIGHBORHOOD_SIZE;
  i++
) {
  for (
    let j = oakesCell.j - NEIGHBORHOOD_SIZE;
    j < oakesCell.j + NEIGHBORHOOD_SIZE;
    j++
  ) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(CellFactory.getCell(i, j));
    }
  }
}

// =========== Controls =============

let playerCell = oakesCell; // Start at Oakes College initially
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

  // Update player position and map view
  playerCell = CellFactory.getCell(i, j);
  const newLat = i * TILE_DEGREES;
  const newLng = j * TILE_DEGREES;
  map.setView([newLat, newLng]);
}

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