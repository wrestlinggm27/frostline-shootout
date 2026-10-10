// Visual sizing regression for the compact arcade cabinet on desktop and mobile.
// Run after: npm install --no-save playwright && npx playwright install chromium
// Then: node --test tests/layout.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');

const url = 'file://' + path.resolve(__dirname, '../index.html');
const viewports = [
  { width: 1440, height: 720, label: 'short desktop window' },
  { width: 1440, height: 900, label: 'desktop window' },
  { width: 390, height: 844, label: 'regular phone portrait' },
  { width: 320, height: 568, label: 'small phone portrait' }
];

async function inspect(page) {
  return page.evaluate(() => {
    const frame = document.querySelector('#rinkFrame').getBoundingClientRect();
    const card = document.querySelector('.overlay-card').getBoundingClientRect();
    const selectors = [
      '#overlayTitle', '#endSummary:not([hidden])', '.difficulty-select',
      '.menu-utility-actions', '#playButton', '#overlayHint', '.player-bar'
    ];
    const pad = 1.5;
    const fits = b => b.left >= frame.left - pad && b.right <= frame.right + pad
      && b.top >= frame.top - pad && b.bottom <= frame.bottom + pad;
    const visible = selectors.filter(selector => document.querySelector(selector))
      .map(selector => {
        const element = document.querySelector(selector);
        const rect = element.getBoundingClientRect();
        return { selector, fits: fits(rect), width: Math.round(rect.width), height: Math.round(rect.height) };
      });
    const buttons = [...document.querySelectorAll('.difficulty-choice, .menu-utility-actions button')];
    return {
      cardFits: fits(card),
      visible,
      overflow: buttons.map(button => ({ label: button.textContent.trim(),
        exceeds: button.scrollWidth > button.clientWidth + 2 })),
      fitScale: getComputedStyle(document.querySelector('.overlay-card')).getPropertyValue('--overlay-fit').trim()
    };
  });
}

test('Arcade menus remain inside the cabinet with no clipped labels at desktop and phone sizes', async () => {
  const browser = await chromium.launch({ headless:true, args: ['--no-sandbox'] });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width:viewport.width, height:viewport.height } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(url);
      await page.waitForSelector('#playerDialog[open]', { timeout:3000 });
      await page.locator('#playerNameInput').fill('Arcade Test Driver');
      await page.locator('#createPlayerButton').click();
      await page.waitForSelector('#teamDialog[open]', { timeout:3000 });
      await page.locator('#cancelTeam').click();
      await page.waitForSelector('#overlay:not([hidden])');

      const start = await inspect(page);
      assert.ok(start.cardFits, viewport.label + ': start menu escaped rink, ' + JSON.stringify(start));
      assert.ok(start.visible.every(v => v.fits), viewport.label + ': start content escaped rink, ' + JSON.stringify(start));
      assert.ok(start.overflow.every(v => !v.exceeds), viewport.label + ': start button overflow, ' + JSON.stringify(start));

      await page.evaluate(() => {
        const overlay = document.getElementById('overlay');
        overlay.classList.add('results');
        document.getElementById('overlayTitle').innerHTML = "TIME'S UP.<br><em>GOOD HUSTLE.</em>";
        document.getElementById('overlayCopy').textContent = 'Find the corners and beat the goalie next round.';
        const summary = document.getElementById('endSummary');
        summary.hidden = false;
        summary.innerHTML = '<div><span>GOALS</span><strong>5</strong></div>'
          + '<div><span>SHOTS</span><strong>9</strong></div>'
          + '<div><span>ACCURACY</span><strong>56%</strong></div>';
        document.getElementById('playButton').innerHTML = 'PLAY AGAIN <span aria-hidden="true">↗</span>';
        document.getElementById('overlayHint').textContent = 'ARCADE SHOOTOUT · MORE MODES COMING';
        window.dispatchEvent(new Event('resize'));
      });
      const result = await inspect(page);
      assert.ok(result.cardFits, viewport.label + ': result menu escaped rink, ' + JSON.stringify(result));
      assert.ok(result.visible.every(v => v.fits), viewport.label + ': results escaped rink, ' + JSON.stringify(result));
      assert.ok(result.overflow.every(v => !v.exceeds), viewport.label + ': results button overflow, ' + JSON.stringify(result));
      assert.deepEqual(errors, [], viewport.label + ': browser errors');
      console.log(viewport.label + ': start and result fit, scale=' + result.fitScale);
      await context.close();
    }
  } finally { await browser.close(); }
});
