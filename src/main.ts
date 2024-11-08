// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

const APP_NAME = "Coin Hunter 💰";
const NULL_ISLAND = leaflet.latLng(0, 0); // Null Island at (0°N, 0°E)
const OAKES_COORDINATES = { lat: 36.98949379578401, lng: -122.06277128548504 }; // Latitude/Longitude of Oakes College - FROM EXAMPLE
const TILE_DEGREES = 1e-4; // Grid cell size in degrees
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Convert latitude and longitude to grid cell coordinates {i, j} relative to Null Island
function convertLatLngToGrid(lat: number, lng: number): { i: number; j: number } {
  const i = Math.floor(lat / TILE_DEGREES);
  const j = Math.floor(lng / TILE_DEGREES);
  return { i, j };
}

// Function to generate a unique coin identifier
function generateCoinID(i: number, j: number, serial: number): string {
  return `{i: ${i}, j: ${j}, serial: ${serial}}`;
}

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
  </div>
`;

// Initialize Leaflet map centered on Null Island
const map = leaflet.map("map", {
  center: NULL_ISLAND,
  zoom: 3, // Lower zoom to see larger area around Null Island
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Convert Oakes College coordinates to {i, j} grid coordinates
const oakesGridCoordinates = convertLatLngToGrid(OAKES_COORDINATES.lat, OAKES_COORDINATES.lng);

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

// Spawn a cache at a specific grid cell {i, j}
function spawnCache(i: number, j: number) {
  const cacheLat = i * TILE_DEGREES;
  const cacheLng = j * TILE_DEGREES;
  const cacheLocation = leaflet.latLng(cacheLat, cacheLng);

  const numberOfCoins = Math.floor(Math.random() * 5) + 1;
  const cacheCoins = Array.from(
    { length: numberOfCoins },
    (_, serial) => generateCoinID(i, j, serial),
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
    popupDiv.innerHTML = `<div>Cache at {i: ${i}, j: ${j}}</div>`;

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
for (let i = oakesGridCoordinates.i - NEIGHBORHOOD_SIZE; i < oakesGridCoordinates.i + NEIGHBORHOOD_SIZE; i++) {
  for (let j = oakesGridCoordinates.j - NEIGHBORHOOD_SIZE; j < oakesGridCoordinates.j + NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
