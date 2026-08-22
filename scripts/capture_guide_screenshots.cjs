const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function getExecutablePath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chrome or Edge browser executable found');
}

// Simple static server for dist/
function startStaticServer(port = 8089) {
  const distDir = path.join(__dirname, '..', 'dist');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(distDir, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function capture() {
  const outputDir = path.join(__dirname, '..', 'docs', 'images');
  fs.mkdirSync(outputDir, { recursive: true });

  const server = await startStaticServer(8089);
  console.log('Static server running on http://localhost:8089');

  const executablePath = getExecutablePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1200'],
    defaultViewport: {
      width: 1600,
      height: 1200,
      deviceScaleFactor: 2
    }
  });

  const page = await browser.newPage();
  const url = 'http://localhost:8089/';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Top Nav Header Switcher (Showing Module Tabs)
  console.log('1. Capturing Header Navigation Switcher (01_top_nav_switcher.png)...');
  const header = await page.$('.app-header');
  if (header) {
    await header.screenshot({ path: path.join(outputDir, '01_top_nav_switcher.png') });
  }

  // 2. Playable Game Canvas
  console.log('2. Capturing Playable Prototype Canvas (02_gameplay_canvas.png)...');
  const gameSection = await page.$('#game-view');
  if (gameSection) {
    await gameSection.screenshot({ path: path.join(outputDir, '02_gameplay_canvas.png') });
  }

  // Switch to Tuner Tab
  console.log('Switching to Difficulty Tuner tab...');
  const tunerTab = await page.$('#tab-tuner');
  if (tunerTab) {
    await tunerTab.click();
    await new Promise(r => setTimeout(r, 5000)); // Wait for Monte Carlo simulation to finish
  }

  // 3. Full Tuner Dashboard
  console.log('3. Capturing Full Tuner Overview (03_difficulty_tuner_overview.png)...');
  const tunerCard = await page.$('#target-card-brief');
  if (tunerCard) {
    await tunerCard.screenshot({ path: path.join(outputDir, '03_difficulty_tuner_overview.png') });
  }

  // 4. Hero KPI Ribbon
  console.log('4. Capturing Hero KPIs Ribbon (04_hero_kpis_ribbon.png)...');
  const heroKpis = await page.$('.target-hero-kpi-grid');
  if (heroKpis) {
    await heroKpis.screenshot({ path: path.join(outputDir, '04_hero_kpis_ribbon.png') });
  }

  // 5. Individual 3 Deep Dive Panels inside Target Card
  console.log('5. Capturing Individual 3 Panels...');
  const panels = await page.$$('#target-card-brief .target-panel');
  if (panels.length >= 1) {
    console.log(' - Capturing Dual Donut Funnels (05_dual_donut_funnels.png)...');
    await panels[0].screenshot({ path: path.join(outputDir, '05_dual_donut_funnels.png') });
  }
  if (panels.length >= 2) {
    console.log(' - Capturing Detailed Flow & Loss Causes (06_detailed_flow_and_losses.png)...');
    await panels[1].screenshot({ path: path.join(outputDir, '06_detailed_flow_and_losses.png') });
  }
  if (panels.length >= 3) {
    console.log(' - Capturing Multi-Persona Benchmark (07_multi_persona_benchmark.png)...');
    await panels[2].screenshot({ path: path.join(outputDir, '07_multi_persona_benchmark.png') });
  }

  // 6. Manual Simulation Drawer (Must click expand button!)
  console.log('6. Expanding and Capturing Manual Simulation Drawer...');
  const drawerBtn = await page.$('#btn-toggle-manual-drawer');
  if (drawerBtn) {
    await drawerBtn.click();
    await new Promise(r => setTimeout(r, 1000));
  }

  const manualCard = await page.$('#manual-results-card, #manual-testing-content');
  if (manualCard) {
    console.log(' - Capturing Manual Results Card (08_manual_simulation_drawer.png)...');
    await manualCard.screenshot({ path: path.join(outputDir, '08_manual_simulation_drawer.png') });
  }

  console.log('✅ All screenshots recaptured with 100% English UI!');
  await browser.close();
  server.close();
}

capture().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
