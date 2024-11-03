// Import CSS styles
import "./style.css";

// Import Leaflet and its CSS
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

// App setup
const APP_NAME = "Coin Hunter 💰";
const app = document.querySelector<HTMLDivElement>("#app")!;

// Set document title and add innerHTML structure
document.title = APP_NAME;
app.innerHTML = `
  <header class="app-header">
    <h1>${APP_NAME}</h1>
  </header>
  
  <div class="app-body">
    <!-- Main Content with Map -->
    <main class="main-content">
      <div id="map" class="map-container"></div> <!-- Map container for Leaflet -->
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
const INITIAL_LOCATION = leaflet.latLng(36.98949379578401, -122.06277128548504); // Example coordinates
const ZOOM_LEVEL = 15; // Initial zoom level for the map

const map = leaflet.map("map", {
  center: INITIAL_LOCATION,
  zoom: ZOOM_LEVEL,
  minZoom: ZOOM_LEVEL,
  maxZoom: ZOOM_LEVEL,
  zoomControl: true, // Display zoom controls
  scrollWheelZoom: true // Allow zooming with scroll wheel
});

// Add a tile layer from OpenStreetMap
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  })
  .addTo(map);

// Add a player marker at the initial location
const playerMarker = leaflet.marker(INITIAL_LOCATION);
playerMarker.bindTooltip("You are here!"); // Tooltip to show on hover
playerMarker.addTo(map);

// Demo event listener for the central button
const centerBtn = document.querySelector<HTMLButtonElement>("#centerBtn")!;
centerBtn.addEventListener("click", () => {
    alert("You clicked the central button!");
});
