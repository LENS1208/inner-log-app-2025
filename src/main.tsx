// src/main.tsx
// Cache Buster: v2025-11-17-001
import React from "react";
import ReactDOM from "react-dom/client";
import "./lib/tokens.css";
import "./index.css";
import App from "./App";
import "./scripts/migrate-demo-data";
import { ThemeProvider } from "./lib/theme.context";

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Chart.js setup
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

function updateChartColors() {
  const styles = getComputedStyle(document.documentElement);
  const gridColor = styles.getPropertyValue('--grid-line').trim();
  const chartTextColor = styles.getPropertyValue('--chart-text').trim();

  if (!ChartJS.defaults.scales) {
    ChartJS.defaults.scales = {};
  }

  ChartJS.defaults.scale = ChartJS.defaults.scale || {};
  ChartJS.defaults.scale.grid = ChartJS.defaults.scale.grid || {};
  ChartJS.defaults.scale.grid.color = gridColor;
  ChartJS.defaults.scale.ticks = ChartJS.defaults.scale.ticks || {};
  ChartJS.defaults.scale.ticks.color = chartTextColor;

  // Doughnut/Pie chart defaults - remove borders
  ChartJS.defaults.datasets = ChartJS.defaults.datasets || {};
  ChartJS.defaults.datasets.doughnut = ChartJS.defaults.datasets.doughnut || {};
  ChartJS.defaults.datasets.doughnut.borderWidth = 0;
  ChartJS.defaults.datasets.doughnut.borderColor = 'transparent';
  ChartJS.defaults.datasets.pie = ChartJS.defaults.datasets.pie || {};
  ChartJS.defaults.datasets.pie.borderWidth = 0;
  ChartJS.defaults.datasets.pie.borderColor = 'transparent';

  // Tooltip styling
  ChartJS.defaults.plugins = ChartJS.defaults.plugins || {};
  ChartJS.defaults.plugins.tooltip = ChartJS.defaults.plugins.tooltip || {};
  (ChartJS.defaults.plugins.tooltip as any).z = 9999;
  ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.95)';
  ChartJS.defaults.plugins.tooltip.titleColor = '#fff';
  ChartJS.defaults.plugins.tooltip.bodyColor = '#fff';
  ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.2)';
  ChartJS.defaults.plugins.tooltip.borderWidth = 1;
  ChartJS.defaults.plugins.tooltip.padding = 12;
  ChartJS.defaults.plugins.tooltip.displayColors = true;
}

updateChartColors();

const observer = new MutationObserver(() => {
  updateChartColors();
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme']
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
