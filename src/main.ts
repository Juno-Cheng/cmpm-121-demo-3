// Import CSS styles
import "./style.css";

const APP_NAME = "Unknown";
const app = document.querySelector<HTMLDivElement>("#app")!;

// Set document title and add innerHTML structure
document.title = APP_NAME;
app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <canvas id="canvas" width="256" height="256"></canvas>
  <!-- First row for tool buttons -->
  <div id="R1Button">
    <button id="alertBtn">Show Alert</button> <!-- New button -->
  </div>
`;

// Select existing buttons
const alertBtn = document.querySelector<HTMLButtonElement>("#alertBtn")!; // Select the new button


// Add event listener for the new alert button
alertBtn.addEventListener("click", () => {
    alert("You clicked the alert button!");
});
