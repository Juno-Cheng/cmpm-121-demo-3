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
      <div id="statusPanel" class="status-panel">No points yet...</div> <!-- Status panel for player points -->
    </main>

    <!-- Sidebar on the right side -->
    <aside class="sidebar" id="sidebar">
      <h2>Inventory</h2>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
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
  scrollWheelZoom: false
});

// Populate the map with OpenStreetMap tiles
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  })
  .addTo(map);

// Add a marker to represent the player's starting location
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Player points display
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

// Function to spawn caches at random locations
function spawnCache(i: number, j: number) {
  // Calculate cell boundaries based on TILE_DEGREES
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent a cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Set up interaction for each cache
  rect.bindPopup(() => {
    let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>There is a cache here at "${i},${j}". It has value <span id="value">${pointValue}</span>.</div>
      <button id="poke">poke</button>`;

    popupDiv.querySelector<HTMLButtonElement>("#poke")!.addEventListener("click", () => {
      pointValue--;
      popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = pointValue.toString();
      playerPoints++;
      statusPanel.innerHTML = `${playerPoints} points accumulated`;
    });

    return popupDiv;
  });
}

// Populate the map with caches based on spawn probability
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
