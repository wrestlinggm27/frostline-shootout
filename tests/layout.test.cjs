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

// After picking a preset, Save My Team should be visible without swiping.
// Check Save Goalie is visible within its own scrollable dialog.
async function goalieSaveIsInView(page) {
  return page.evaluate(() => {
    const dialog = document.getElementById('goalieDialog').getBoundingClientRect();
    const save = document.querySelector('#goalieForm .save-team').getBoundingClientRect();
    return save.top >= dialog.top - 2 && save.bottom <= dialog.bottom + 2;
  });
}

async function teamSaveIsInView(page) {
  return page.evaluate(() => {
    const dialog = document.getElementById('teamDialog').getBoundingClientRect();
    const save = document.querySelector('#teamForm .save-team').getBoundingClientRect();
    return save.top >= dialog.top - 2 && save.bottom <= dialog.bottom + 2;
  });
}

async function inspect(page) {
  return page.evaluate(() => {
    const frame = document.querySelector('#rinkFrame').getBoundingClientRect();
    const card = document.querySelector('.overlay-card').getBoundingClientRect();
    const selectors = [
      '#overlayTitle', '#endSummary:not([hidden])', '.difficulty-select',
      '.menu-utility-actions', '#playButton', '#resultsMenuButton:not([hidden])', '#overlayHint', '.player-bar'
    ];
    const pad = 1.5;
    const fits = b => b.left >= frame.left - pad && b.right <= frame.right + pad
      && b.top >= frame.top - pad && b.bottom <= frame.bottom + pad;
    // Hidden headings have a zero-sized rectangle at (0,0), which is not
    // content escaping the rink. Only verify elements actually rendered.
    const visible = selectors.filter(selector => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    }).map(selector => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      return { selector, fits: fits(rect), width: Math.round(rect.width), height: Math.round(rect.height) };
    });
    const buttons = [...document.querySelectorAll('.difficulty-choice, .menu-utility-actions button, .results-menu-button:not([hidden])')];
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
      assert.equal(await page.locator('#startupScreen').getAttribute('data-phase'), 'start',
        viewport.label + ': Stable opens in startup state');
      assert.equal(await page.locator('#startupScreen').isVisible(), true);
      assert.equal(await page.locator('#frostEdgeOverlay').getAttribute('data-frost'), 'off',
        viewport.label + ': frost must be clear before Press Start');
      assert.equal(await page.locator('#frostEdgeOverlay').evaluate(el=>getComputedStyle(el).pointerEvents), 'none',
        viewport.label + ': edge ice cannot steal taps or drag gestures');
      assert.equal(await page.locator('.frost-corner').count(), 4,
        viewport.label + ': four frosted corners remain mounted');
      assert.equal(await page.locator('#frost-grain feTurbulence').count(), 1,
        viewport.label + ': frosted corners use soft procedural grain');
      const frostEdgeStyle = await page.locator('.frost-corner').first().evaluate(el =>
        getComputedStyle(el).filter);
      assert.ok(frostEdgeStyle.includes('blur('),
        viewport.label + ': frosted edges should remain optically soft');
      assert.equal(await page.locator('#playerDialog').evaluate(el => el.open), false,
        viewport.label + ': onboarding should wait for the intro');
      assert.equal(await page.locator('#startupWelcome .startup-ice-f use').getAttribute('href'), '#frostline-ice',
        viewport.label + ': use approved Ice Cut F');
      const startupFits = await page.locator('#startupBeginButton').evaluate(button => {
        const r = button.getBoundingClientRect();
        return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      });
      assert.ok(startupFits, viewport.label + ': startup button out of viewport');
      // The phone layout centers the complete brand identity, while desktop
      // retains its approved compact left-aligned header.
      const brandHeader = await page.evaluate(() => {
        const topbar = document.querySelector('.topbar');
        const brand = document.querySelector('.topbar .brand');
        const logo = document.getElementById('brandLogoButton');
        const title = document.querySelector('.topbar h1');
        const team = document.querySelector('.topbar .team-header-identity');
        const speaker = document.getElementById('soundButton');
        const tb = topbar.getBoundingClientRect();
        const middle = r => (r.left + r.right) / 2;
        return {
          topbarCenter: middle(tb),
          logoCenter: middle(logo.getBoundingClientRect()),
          titleCenter: middle(title.getBoundingClientRect()),
          teamCenter: middle(team.getBoundingClientRect()),
          speakerRight: speaker.getBoundingClientRect().right,
          speakerLeft: speaker.getBoundingClientRect().left,
          logoRight: logo.getBoundingClientRect().right,
          brandDirection: getComputedStyle(brand).flexDirection,
          titleAlign: getComputedStyle(title).textAlign,
          titleOverflows: title.scrollWidth > title.clientWidth + 2
        };
      });
      if (viewport.width <= 600) {
        assert.equal(brandHeader.brandDirection, 'column', viewport.label + ': mobile brand should stack');
        assert.equal(brandHeader.titleAlign, 'center', viewport.label + ': mobile title should be centered');
        for (const key of ['logoCenter', 'titleCenter', 'teamCenter']) {
          assert.ok(Math.abs(brandHeader[key] - brandHeader.topbarCenter) <= 3,
            viewport.label + ': ' + key + ' not centered, ' + JSON.stringify(brandHeader));
        }
        assert.ok(brandHeader.logoRight < brandHeader.speakerLeft,
          viewport.label + ': speaker overlaps centered logo');
        assert.equal(brandHeader.titleOverflows, false, viewport.label + ': mobile title clipped');
      } else {
        assert.equal(brandHeader.brandDirection, 'row', viewport.label + ': desktop brand should remain inline');
        assert.notEqual(brandHeader.titleAlign, 'center', viewport.label + ': desktop brand alignment changed');
      }
      if (viewport.label === 'desktop window') {
        await page.locator('#startupBeginButton').click();
        assert.equal(await page.locator('#frostEdgeOverlay').getAttribute('data-frost'), 'on',
          viewport.label + ': pressing Start must activate the ice');
        assert.equal(await page.locator('#startupScreen').getAttribute('data-phase'), 'intro');
        assert.equal(await page.locator('#startupIntro').isVisible(), true);
        // The temporary credit beat should hand off automatically, without another click.
        await page.waitForFunction(() => document.getElementById('startupScreen').hidden, { timeout: 5000 });
      } else {
        await page.locator('#startupSkipButton').click();
      }
      assert.equal(await page.locator('#startupScreen').isVisible(), false,
        viewport.label + ': intro needs to release the existing game');
      assert.equal(await page.locator('#frostEdgeOverlay').getAttribute('data-frost'), 'on',
        viewport.label + ': ice should remain into the arcade game');
      await page.waitForSelector('#playerDialog[open]', { timeout:3000 });

      await page.locator('#playerNameInput').fill('Arcade Test Driver');
      await page.locator('#createPlayerButton').click();
      await page.waitForSelector('#teamDialog[open]', { timeout:3000 });
      assert.equal(await page.locator('[data-team-crest]').count(), 6, viewport.label + ': six shield designs');
      assert.equal(await page.locator('[data-city-club]').count(), 32, viewport.label + ': thirty-two city clubs');
      assert.equal(await page.locator('.city-club-icon svg').count(), 32, viewport.label + ': thirty-two original SVG crests');
      assert.equal(await page.locator('#previewTeamCrest svg').count(), 1, viewport.label + ': shield SVG preview');
      // The growing team catalog must be compact by default, but fully available on demand.
      const clubToggle = page.locator('#cityClubGallery > summary');
      assert.equal(await page.locator('#cityClubGallery').evaluate(el => el.open), false,
        viewport.label + ': city catalog should start collapsed');
      const foldedHeight = await page.locator('#cityClubGallery').evaluate(el => el.getBoundingClientRect().height);
      assert.ok(foldedHeight <= 90, viewport.label + ': collapsed city catalog exceeds 90px, got ' + foldedHeight);
      assert.equal(await page.locator('.city-club-options').isVisible(), false,
        viewport.label + ': city cards visible while collapsed');
      await clubToggle.click();
      assert.equal(await page.locator('#cityClubGallery').evaluate(el => el.open), true,
        viewport.label + ': expand city catalog');
      assert.equal(await page.locator('.city-club-options').isVisible(), true,
        viewport.label + ': expanded city catalog visible');
      assert.equal(await page.locator('.city-club-conference').count(), 2, viewport.label + ': conference headings');
      assert.equal(await page.locator('.city-club-division').count(), 4, viewport.label + ': four divisions');
      for (const [division, clubs] of [["atlantic",["boston","buffalo","detroit","florida","montreal","ottawa","tampa","toronto"]],["metropolitan",["carolina","columbus","newjersey","islanders","newyork","philadelphia","pittsburgh","washington"]],["central",["chicago","colorado","dallas","minnesota","nashville","stlouis","utah","winnipeg"]],["pacific",["anaheim","calgary","edmonton","losangeles","sanjose","seattle","vancouver","vegas"]]]) {
        const ids = await page.locator('[data-division="' + division + '"] [data-city-club]').evaluateAll(nodes => nodes.map(n => n.dataset.cityClub));
        assert.deepEqual(ids, clubs, viewport.label + ': correct ' + division + ' teams');
      }
      for (const [id, name] of [['newyork','Empire Salute'], ['detroit','Motor City Octopus'],
        ['chicago','Chicago Curve'], ['calgary','Prairie Fire'],
        ['boston','Boston Banner'], ['toronto','Toronto Grind'],
        ['montreal','Montreal Olé'], ['pittsburgh','Pittsburgh Gear'],
        ['philadelphia','Philly Bellline'], ['minnesota','Minnesota Northwoods'],
        ['nashville','Nashville Riff'], ['seattle','Seattle Rainline'],
        ['carolina','Carolina Warning'], ['florida','Florida Blue Rat'],
        ['tampa','Tampa Coil'], ['dallas','Dallas Brimline'],
        ['buffalo','Buffalo Blade Gang'], ['ottawa','Ottawa Legion'],
        ['columbus','Columbus Cannonfire'], ['newjersey','Newark Ironbound'],
        ['islanders','Island Yes Wave'], ['washington','Washington Fury'],
        ['colorado','Colorado Anthem'], ['stlouis','St. Louis Towel Wave'],
        ['utah','Utah Tusks Up'], ['winnipeg','Winnipeg True North'],
        ['anaheim','Anaheim Rally Flight'], ['edmonton','Edmonton Oil Country'],
        ['losangeles','Los Angeles Royal Army'], ['sanjose','San Jose Chomp'],
        ['vancouver','Vancouver Clock Chain'], ['vegas','Vegas Flamingo Toss']]) {
        await page.locator('[data-city-club="' + id + '"]').click();
        assert.equal(await teamSaveIsInView(page), true,
          viewport.label + ': selecting city club ' + id + ' must reveal Save My Team');
        assert.equal(await page.locator('#teamNameInput').inputValue(), name, viewport.label + ': chosen club name');
        assert.equal(await page.locator('[data-city-club="' + id + '"]').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('#previewTeamCrest svg').count(), 1);
      }
      // The menu uses location above nickname only; picking a club still loads
      // its full original name into the editor and player records.
      for (const [id, location, nickname] of [
        ['pittsburgh','PITTSBURGH','GEAR'],
        ['washington','WASHINGTON','FURY'],
        ['vancouver','VANCOUVER','CLOCK CHAIN'],
        ['philadelphia','PHILADELPHIA','BELLLINE'],
        ['vegas','LAS VEGAS','FLAMINGO TOSS'],
        ['islanders','LONG ISLAND','ISLAND YES WAVE']
      ]) {
        const card = page.locator('[data-city-club="' + id + '"]');
        assert.equal(await card.locator('small').first().textContent(), location,
          viewport.label + ': correct ' + id + ' city label');
        assert.equal(await card.locator('strong').first().textContent(), nickname,
          viewport.label + ': ' + id + ' card shows nickname without repeating location');
      }
      const cityOptionsFit = await page.evaluate(() => {
        const gallery = document.querySelector('.city-club-gallery');
        return [...gallery.querySelectorAll('.city-club-choice')].every(el => {
          const r=el.getBoundingClientRect(), parent=gallery.getBoundingClientRect();
          return r.left >= parent.left-2 && r.right <= parent.right+2 && el.scrollWidth <= el.clientWidth+2;
        });
      });
      // No player should see PITTSBURG/H or WASHINGTO/N on narrow phones.
      // Browser Range detects split words and checks every city/nickname token
      // stays inside its card's text column, not merely inside the button.
      const clubWordFailures = await page.evaluate(() => {
        const problems = [];
        for (const button of document.querySelectorAll('.city-club-choice')) {
          for (const element of button.querySelectorAll('.city-club-detail small, .city-club-detail strong')) {
            const textNode = element.firstChild;
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) continue;
            const bounds = element.getBoundingClientRect();
            for (const match of textNode.textContent.matchAll(/\S+/g)) {
              const word = document.createRange();
              word.setStart(textNode, match.index);
              word.setEnd(textNode, match.index + match[0].length);
              const pieces = [...word.getClientRects()];
              if (pieces.length !== 1 || pieces[0].left < bounds.left - 1 ||
                  pieces[0].right > bounds.right + 1) {
                problems.push({ team:button.dataset.cityClub, token:match[0], pieces:pieces.length });
              }
            }
          }
        }
        return problems;
      });
      assert.deepEqual(clubWordFailures, [],
        viewport.label + ': city club words must stay whole and inside the text column');
      assert.equal(await page.locator('[data-city-club="islanders"] .city-club-detail small').textContent(),
        'LONG ISLAND', viewport.label + ': original Long Island identity is used');
      assert.ok(cityOptionsFit, viewport.label + ': city club cards fit within customizer');
      await clubToggle.click();
      assert.equal(await page.locator('#cityClubGallery').evaluate(el => el.open), false,
        viewport.label + ': collapse control closes the catalog');
      assert.equal(await page.locator('.city-club-options').isVisible(), false,
        viewport.label + ': closed catalog hides choices');
      assert.ok((await page.locator('#cityClubSummary').textContent()).includes('Vegas Flamingo Toss'),
        viewport.label + ': collapsed label still shows selected club');
      await page.locator('[data-team-crest="wolf"]').click();
      assert.equal(await page.locator('[data-team-crest="wolf"]').getAttribute('aria-pressed'), 'true');
      await page.locator('#teamNameInput').fill('Blue Wolves');
      await page.locator('#teamForm button[type="submit"]').click();
      await page.waitForSelector('#overlay:not([hidden])');
      const storedTeam = await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem('frostline-player-profiles-v1'));
        return data?.players[0]?.team;
      });
      assert.equal(storedTeam.crest, 'wolf', viewport.label + ': saved crest');
      assert.equal(await page.locator('#headerTeamCrest svg').count(), 1, viewport.label + ': header shield');
      await page.locator('#customizeButton').click();
      await page.locator('[data-team-crest="bolt"]').click();
      await page.locator('#cancelTeam').click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('frostline-player-profiles-v1')).players[0].team.crest), 'wolf',
        viewport.label + ': cancelled shield change leaves saved design intact');
      await page.locator('#customizeButton').click();
      assert.equal(await page.locator('#cityClubGallery').evaluate(el => el.open), false,
        viewport.label + ': reopening editor starts compact');
      await clubToggle.click();
      await page.locator('[data-city-club="detroit"]').click();
      await page.locator('#teamForm button[type="submit"]').click();
      const selectedCity = await page.evaluate(() => JSON.parse(localStorage.getItem('frostline-player-profiles-v1')).players[0].team);
      assert.equal(selectedCity.crest, 'detOctopus', viewport.label + ': Detroit octopus saved');
      assert.equal(selectedCity.club, 'detroit', viewport.label + ': city club identity saved');
      assert.equal(selectedCity.primary, '#ce1126', viewport.label + ': Detroit color saved');
      await page.locator('#customizeButton').click();
      assert.equal(await page.locator('#cityClubGallery').evaluate(el => el.open), false,
        viewport.label + ': reopening with a saved city team remains collapsed');
      assert.ok((await page.locator('#cityClubSummary').textContent()).includes('Motor City Octopus'),
        viewport.label + ': saved city team is identified in collapsed header');
      await clubToggle.click();
      await page.locator('[data-city-club="vegas"]').click();
      await page.locator('#cancelTeam').click();
      const afterCancel = await page.evaluate(() => JSON.parse(localStorage.getItem('frostline-player-profiles-v1')).players[0].team);
      assert.equal(afterCancel.club, 'detroit', viewport.label + ': cancelling city selection must not overwrite saved club');


      // International identity is a separate, collapsed selector beneath
      // City Clubs. All eight nation flags need to fit even on small phones.
      await page.locator('#customizeButton').click();
      const nationalToggle=page.locator('#nationalTeamGallery > summary');
      assert.equal(await page.locator('#nationalTeamGallery').evaluate(el=>el.open),false,
        viewport.label+': national teams start collapsed');
      const nationalHeight=await page.locator('#nationalTeamGallery').evaluate(el=>el.getBoundingClientRect().height);
      assert.ok(nationalHeight<=90,viewport.label+': national summary is too tall ('+nationalHeight+')');
      await nationalToggle.click();
      assert.equal(await page.locator('.national-team-options').isVisible(),true,viewport.label+': nation choices expand');
      assert.equal(await page.locator('[data-national-team]').count(),8);
      for(const [id,name] of [['usa','USA'],['canada','Canada'],['sweden','Sweden'],['finland','Finland'],
        ['czechia','Czechia'],['slovakia','Slovakia'],['germany','Germany'],['switzerland','Switzerland']]){
        await page.locator('[data-national-team="'+id+'"]').click();
        assert.equal(await teamSaveIsInView(page), true,
          viewport.label + ': selecting national team ' + id + ' must reveal Save My Team');
        assert.equal(await page.locator('#teamNameInput').inputValue(),name,viewport.label+': '+name+' selected');
        assert.equal(await page.locator('[data-national-team="'+id+'"]').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('#previewTeamCrest svg').count(),1);
        assert.equal(await page.locator('#nationalTeamSummary').textContent(),'Selected: '+name);
      }
      const nationFit=await page.evaluate(()=>{
        const gallery=document.querySelector('#nationalTeamGallery');
        return [...gallery.querySelectorAll('.national-team-choice')].every(el=>{
          const r=el.getBoundingClientRect(),p=gallery.getBoundingClientRect();
          return r.left>=p.left-2&&r.right<=p.right+2&&el.scrollWidth<=el.clientWidth+2;
        });
      });
      // Countries such as SWITZERLAND must stay on one line, never SWITZERLAN/D.
      // A single Range rectangle verifies wrapping; its bounds also guard
      // against hiding or spilling the unbroken word past the card's text slot.
      const nationWordFailures = await page.evaluate(() => {
        const errors = [];
        for (const card of document.querySelectorAll('.national-team-choice')) {
          const strong = card.querySelector('.national-team-detail strong');
          const node = strong.firstChild;
          const rect = strong.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(node);
          const glyphRects = [...range.getClientRects()];
          if (glyphRects.length !== 1 || glyphRects[0].left < rect.left - 1 ||
              glyphRects[0].right > rect.right + 1 ||
              strong.scrollWidth > strong.clientWidth + 1) {
            errors.push({ country:card.dataset.nationalTeam, pieces:glyphRects.length,
              width:Math.round(rect.width), textWidth:Math.round(glyphRects[0]?.width || 0) });
          }
        }
        return errors;
      });
      assert.deepEqual(nationWordFailures, [],
        viewport.label+': all eight national team names must be unbroken and fit their text columns');
      assert.equal(await page.locator('[data-national-team="switzerland"] .national-team-detail strong').textContent(),
        'SWITZERLAND',viewport.label+': country label remains fully spelled');
      assert.ok(nationFit,viewport.label+': national flags/cards overflow customizer');
      await page.locator('[data-national-team="sweden"]').click();
      await page.locator('#teamForm button[type="submit"]').click();
      let nationalSaved=await page.evaluate(()=>{
        const data=JSON.parse(localStorage.getItem('frostline-player-profiles-v1'));
        return data.players[0].team;
      });
      assert.equal(nationalSaved.nation,'sweden',viewport.label+': country persisted');
      assert.equal(nationalSaved.crest,'natSweden',viewport.label+': flag shield persisted');
      assert.equal(nationalSaved.club,null,viewport.label+': countries and cities are exclusive');
      await page.locator('#customizeButton').click();
      assert.equal(await page.locator('#nationalTeamGallery').evaluate(el=>el.open),false);
      assert.equal(await page.locator('#nationalTeamSummary').textContent(),'Selected: Sweden');
      await page.locator('#teamNameInput').fill('My Sweden Crew');
      await page.locator('#teamForm button[type="submit"]').click();
      nationalSaved=await page.evaluate(()=>JSON.parse(localStorage.getItem('frostline-player-profiles-v1')).players[0].team);
      assert.equal(nationalSaved.nation,null,viewport.label+': custom team does not masquerade as official selection');
      assert.equal(nationalSaved.crest,'natSweden',viewport.label+': personalized nation keeps artwork');
      assert.equal(nationalSaved.name,'My Sweden Crew');

      // Goalie selection is a main-menu option, not part of the home-team editor.
      await page.locator('#customizeButton').click();
      assert.equal(await page.locator('#teamDialog #goaliePaletteOptions').count(), 0,
        viewport.label + ': opponent colors must be outside Customize Team');
      await page.locator('#cancelTeam').click();
      assert.equal(await page.locator('#goalieCustomizeButton').isVisible(), true,
        viewport.label + ': main menu goalie button is visible');
      assert.equal(await page.locator('.menu-utility-actions button').count(), 4,
        viewport.label + ': main menu keeps team, records, goalie, and logo options');
      await page.locator('#goalieCustomizeButton').click();
      assert.equal(await page.locator('#goalieDialog').evaluate(el => el.open), true);
      assert.equal(await page.locator('#goalieDialog').evaluate(el => el.scrollTop), 0,
        viewport.label + ': goalie chooser should start at top');
      assert.equal(await page.locator('[data-goalie-palette]').count(), 33,
        viewport.label + ': 32 city palettes plus Frostline original');
      assert.equal(await page.locator('.goalie-palette-choice').first().isVisible(), true);
      const paletteFit = await page.locator('#goaliePaletteOptions').evaluate(root => {
        const bounds = root.getBoundingClientRect();
        const tolerance = 2;
        return [...root.querySelectorAll('button')].every(button => {
          const b = button.getBoundingClientRect();
          return b.left >= bounds.left - tolerance && b.right <= bounds.right + tolerance;
        });
      });
      assert.ok(paletteFit, viewport.label + ': goalie palettes overflow their own dialog');
      await page.locator('[data-goalie-palette="boston"]').click();
      assert.equal(await goalieSaveIsInView(page), true,
        viewport.label + ': goalie selection should bring Save Goalie into view');
      assert.equal(await page.locator('[data-goalie-palette="boston"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#goaliePaletteSummary').textContent(), 'Selected: Boston');
      await page.locator('#cancelGoalie').click();
      await page.locator('#goalieCustomizeButton').click();
      assert.equal(await page.locator('#goalieDialog').evaluate(el => el.scrollTop), 0,
        viewport.label + ': reopening goalie chooser should start at top');
      assert.equal(await page.locator('#goaliePaletteSummary').textContent(),
        'Selected: Frostline Original', viewport.label + ': Cancel must not save Boston');
      await page.locator('[data-goalie-palette="boston"]').click();
      await page.locator('#goalieForm button[type="submit"]').click();
      const savedGoalie = await page.evaluate(() => {
        const profiles = JSON.parse(localStorage.getItem('frostline-player-profiles-v1'));
        return profiles.players[0].goaliePalette;
      });
      assert.equal(savedGoalie, 'boston', viewport.label + ': Boston opponent saved');
      await page.locator('#goalieCustomizeButton').click();
      assert.equal(await page.locator('#goaliePaletteSummary').textContent(),
        'Selected: Boston', viewport.label + ': saved opponent shown when reopened');
      await page.locator('#closeGoalieDialog').click();

      const start = await inspect(page);
      assert.equal(await page.locator('#overlayTitle').isVisible(), false,
        viewport.label + ': duplicate opening title must stay hidden in start menu');
      assert.equal(await page.locator('#overlayCopy').isVisible(), true,
        viewport.label + ': shooting instructions must remain visible');
      assert.ok(start.cardFits, viewport.label + ': start menu escaped rink, ' + JSON.stringify(start));
      // The player-approved layout should fill the yellow-highlighted ice,
      // while tiny rinks still fit all controls without clipping.
      if (viewport.width >= 390) {
        const coverage = await page.evaluate(() => {
          const frame = document.querySelector('#rinkFrame').getBoundingClientRect();
          const card = document.querySelector('.overlay-card').getBoundingClientRect();
          return { heightFraction:card.height / frame.height,
            sideFraction:card.width / frame.width };
        });
        assert.ok(coverage.heightFraction >= 0.88,
          viewport.label + ': start menu should use most of the rink height, ' + JSON.stringify(coverage));
        assert.ok(coverage.sideFraction >= 0.80,
          viewport.label + ': start menu should stay broad and readable, ' + JSON.stringify(coverage));
      }
      assert.ok(start.visible.every(v => v.fits), viewport.label + ': start content escaped rink, ' + JSON.stringify(start));
      assert.ok(start.overflow.every(v => !v.exceeds), viewport.label + ': start button overflow, ' + JSON.stringify(start));

      // Verify the return-to-menu button is compact, centered, and works during a game.
      await page.locator('#playButton').click();
      assert.equal(await page.locator('#frostEdgeOverlay').getAttribute('data-frost'), 'on',
        viewport.label + ': ice remains during live puck shooting');
      assert.equal(await page.locator('#mainMenuButton').isVisible(), true,
        viewport.label + ': in-game menu missing');
      const menuFits = await page.evaluate(() => {
        const button = document.getElementById('mainMenuButton').getBoundingClientRect();
        const rink = document.getElementById('rinkFrame').getBoundingClientRect();
        return button.left >= rink.left && button.right <= rink.right &&
          button.top >= rink.top && button.bottom <= rink.bottom;
      });
      assert.ok(menuFits, viewport.label + ': menu button outside rink');
      assert.equal((await page.locator('#mainMenuButton').textContent()).trim(), 'MENU');
      const compactMenu = await page.locator('#mainMenuButton').evaluate(button => {
        const size = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return { width: size.width, height: size.height, display: style.display,
          alignItems: style.alignItems, justifyContent: style.justifyContent };
      });
      assert.ok(compactMenu.width <= 50 && compactMenu.height <= 26,
        viewport.label + ': in-game Menu button should be compact, ' + JSON.stringify(compactMenu));
      assert.equal(compactMenu.display, 'flex');
      assert.equal(compactMenu.alignItems, 'center');
      assert.equal(compactMenu.justifyContent, 'center');
      await page.locator('#mainMenuButton').click();
      assert.equal(await page.locator('#overlay').isVisible(), true,
        viewport.label + ': returning to menu should show overlay');
      assert.equal(await page.locator('#overlayTitle').isVisible(), false,
        viewport.label + ': start menu should not restore duplicate headline');
      assert.match(await page.locator('#playButton').textContent(), /START GAME/);

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
        document.getElementById('resultsMenuButton').hidden = false;
        document.getElementById('overlayHint').textContent = 'ARCADE SHOOTOUT · MORE MODES COMING';
        window.dispatchEvent(new Event('resize'));
      });
      const result = await inspect(page);
      assert.equal(await page.locator('#overlayTitle').isVisible(), true,
        viewport.label + ': results should retain its headline');
      assert.ok(result.cardFits, viewport.label + ': result menu escaped rink, ' + JSON.stringify(result));
      assert.ok(result.visible.every(v => v.fits), viewport.label + ': results escaped rink, ' + JSON.stringify(result));
      assert.ok(result.overflow.every(v => !v.exceeds), viewport.label + ': results button overflow, ' + JSON.stringify(result));
      assert.equal((await page.locator('#resultsMenuButton').textContent()).trim(), 'MAIN MENU',
        viewport.label + ': results button should have no arrow');
      await page.locator('#resultsMenuButton').click();
      assert.equal(await page.locator('#resultsMenuButton').isVisible(), false);
      assert.match(await page.locator('#overlayTitle').textContent(), /THIRTY SECONDS/);
      assert.deepEqual(errors, [], viewport.label + ': browser errors');
      console.log(viewport.label + ': start and result fit, scale=' + result.fitScale);
      await context.close();
    }
  } finally { await browser.close(); }
});
