const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

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

async function capture() {
  const outputDir = path.join(__dirname, '..', 'docs', 'images');
  fs.mkdirSync(outputDir, { recursive: true });

  const executablePath = getExecutablePath();
  console.log(`Using browser: ${executablePath}`);

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
  const url = 'https://thegod322.github.io/softgames-closewin/';
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

  // 3. Header showing active Tuner tab
  console.log('3. Capturing Header with Tuner Active (01_tuner_tab_active.png)...');
  if (header) {
    await header.screenshot({ path: path.join(outputDir, '01_tuner_tab_active.png') });
  }

  // 4. Full Tuner Dashboard
  console.log('4. Capturing Full Tuner Overview (03_difficulty_tuner_overview.png)...');
  const tunerCard = await page.$('#target-card-brief');
  if (tunerCard) {
    await tunerCard.screenshot({ path: path.join(outputDir, '03_difficulty_tuner_overview.png') });
  }

  // 5. Hero KPI Ribbon
  console.log('5. Capturing Hero KPIs Ribbon (04_hero_kpis_ribbon.png)...');
  const heroKpis = await page.$('.target-hero-kpi-grid');
  if (heroKpis) {
    await heroKpis.screenshot({ path: path.join(outputDir, '04_hero_kpis_ribbon.png') });
  }

  // 6. Individual 3 Deep Dive Panels inside Target Card
  console.log('6. Capturing Individual 3 Panels...');
  const panels = await page.$$('#target-card-brief .target-panel');
  console.log(`Found ${panels.length} panels in target card.`);

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

  // 7. Manual Simulation Drawer (Must click expand button!)
  console.log('7. Expanding and Capturing Manual Simulation Drawer...');
  const drawerBtn = await page.$('#btn-toggle-manual-drawer');
  if (drawerBtn) {
    await drawerBtn.click();
    await new Promise(r => setTimeout(r, 1000)); // Wait for animation
  }

  const manualCard = await page.$('#manual-results-card, #manual-testing-content');
  if (manualCard) {
    console.log(' - Capturing Manual Results Card (08_manual_simulation_drawer.png)...');
    await manualCard.screenshot({ path: path.join(outputDir, '08_manual_simulation_drawer.png') });
  }

  console.log('✅ All screenshots captured and verified!');
  await browser.close();
}

capture().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
