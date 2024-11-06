// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Import CSS styles
import "./style.css";
import "leaflet/dist/leaflet.css";

// Import additional utilities
import "./leafletWorkaround.ts";
import luck from "./luck.ts"; // Deterministic random number generator

// Define constants
const APP_NAME = "Coin Hunter 💰";
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504); // Classroom location
const GAMEPLAY_ZOOM_LEVEL = 17; // Adjusted zoom level to make the map appear smaller
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Set up the app's HTML structure
const app = document.querySelector<HTMLDivElement>("#app")!;
document.title = APP_NAME;
app.innerHTML = `
  <header class="app-header">
    <h1>${APP_NAME}</h1>
  </header>
  
  <div class="app-body">
    <!-- Main Content with Map -->
    <main class="main-content">
      <div id="map" class="map-container"></div> <!-- Map container for Leaflet -->
      <div id="statusPanel" class="status-panel">No coins collected yet...</div> <!-- Status panel for player coins -->
    </main>

    <!-- Sidebar on the right side -->
    <aside class="sidebar" id="sidebar">
      <h2>Inventory</h2>
      <ul id="inventoryList">
        <!-- Player's collected coins will be listed here -->
      </ul>
    </aside>
  </div>
`;

// Initialize Leaflet Map
const map = leaflet.map("map", {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

let playerInventory: string[] = [];

function updateInventoryDisplay() {
  const inventoryList = document.getElementById("inventoryList")!;
  inventoryList.innerHTML = ""; // Clear current list

  playerInventory.forEach((coin) => {
    const listItem = document.createElement("li");
    listItem.textContent = coin;
    inventoryList.appendChild(listItem);
  });
}

function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  const numberOfCoins = Math.floor(Math.random() * 5) + 1;
  const cacheCoins = Array.from({ length: numberOfCoins }, (_, index) => `${i},${j}-Coin${index + 1}`);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");

    popupDiv.innerHTML = `<div>Cache at "${i},${j}"</div>`;
    const coinList = document.createElement("ul");
    cacheCoins.forEach((coin) => {
      const coinItem = document.createElement("li");
      coinItem.textContent = coin;
      coinList.appendChild(coinItem);
    });
    popupDiv.appendChild(coinList);

    const collectButton = document.createElement("button");
    collectButton.textContent = "Collect";
    collectButton.onclick = () => {
      if (cacheCoins.length > 0) {
        const collectedCoin = cacheCoins.pop()!;
        playerInventory.push(collectedCoin);
        updateInventoryDisplay(); 
        rect.closePopup();
      } else {
        alert("No coins left to collect!");
      }
    };
    popupDiv.appendChild(collectButton);

    const depositButton = document.createElement("button");
    depositButton.textContent = "Deposit";
    depositButton.onclick = () => {
      if (playerInventory.length > 0) {
        const depositedCoin = playerInventory.pop()!;
        cacheCoins.push(depositedCoin);
        updateInventoryDisplay(); 
        rect.closePopup();
      } else {
        alert("No coins in inventory to deposit!");
      }
    };
    popupDiv.appendChild(depositButton);

    return popupDiv;
  });
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
