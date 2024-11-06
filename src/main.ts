// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

const APP_NAME = "Coin Hunter 💰";
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const GAMEPLAY_ZOOM_LEVEL = 17;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

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
let selectedCoin: string | null = null;

function updateInventoryDisplay() {
  const inventoryList = document.getElementById("inventoryList")!;
  const selectedCoinDisplay = document.getElementById("selectedCoinDisplay")!;
  inventoryList.innerHTML = "";

  playerInventory.forEach((coin, index) => {
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

function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;
  const cacheLocation = leaflet.latLng(
    origin.lat + i * TILE_DEGREES,
    origin.lng + j * TILE_DEGREES,
  );

  const numberOfCoins = Math.floor(Math.random() * 5) + 1;
  const cacheCoins = Array.from(
    { length: numberOfCoins },
    (_, index) => `${i},${j}-Coin${index + 1}`,
  );

  // Add a 🎁 marker to represent the cache
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
    popupDiv.innerHTML = `<div>Cache at "${i},${j}"</div>`;

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

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
