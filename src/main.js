import {cloneConfig} from './core/defaults.js';
import {loadImage, drawImageToCanvas, getImageData} from './core/imageLoader.js';
import {buildPreviewData, generateDocument} from './core/pipeline.js';
import {generateSvg, downloadFile} from './core/svgExport.js';
import {PRESETS, applyPreset} from './core/presets.js';
import {showImageData} from './ui/previewCanvas.js';
import {setSvgPreview} from './ui/svgPreview.js';
import {saveSettings, loadSettings} from './ui/storage.js';

try {
  bootstrap();
} catch (error) {
  console.error(error);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="fatal-error"><h1>HatchForge failed to start</h1><pre>${escapeHtml(error?.stack || error?.message || String(error))}</pre></div>`;
  }
}

function bootstrap() {
  let config = loadSettings() || cloneConfig();
  let source = null;
  let lastDoc = null;
  let lastSvg = '';
  let timer = null;

  const app = document.getElementById('app');
  if (!app) throw new Error('Missing #app root element.');

  app.innerHTML = renderApp(config);

  const els = {
    file: document.getElementById('file'),
    original: document.getElementById('original'),
    gray: document.getElementById('gray'),
    poster: document.getElementById('poster'),
    vector: document.getElementById('vector'),
    debug: document.getElementById('debug'),
    size: document.getElementById('size'),
    hatchControls: document.getElementById('hatchControls'),
    generate: document.getElementById('generate'),
    download: document.getElementById('download'),
    copy: document.getElementById('copy'),
    save: document.getElementById('save'),
    reset: document.getElementById('reset'),
    applyPreset: document.getElementById('applyPreset'),
    preset: document.getElementById('preset'),
    layers: document.getElementById('layers'),
    status: document.getElementById('status'),
    nav: document.querySelector('nav')
  };

  for (const [name, el] of Object.entries(els)) {
    if (!el) throw new Error(`Missing required UI element: ${name}`);
  }

  hatchUI();

  app.addEventListener('input', event => {
    const path = event.target.dataset.path;
    if (!path) return;
    let value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (event.target.type === 'range' || event.target.type === 'number') value = Number(value);
    if (value === '') value = null;
    setConfig(path, value);
    if (path === 'posterize.levels') hatchUI();
    if (event.target.nextElementSibling?.tagName === 'OUTPUT') event.target.nextElementSibling.textContent = value;
    clearTimeout(timer);
    timer = setTimeout(updatePreviews, 200);
  });

  els.file.addEventListener('change', async () => {
    const file = els.file.files[0];
    if (!file) return;
    try {
      const image = await loadImage(file);
      source = drawImageToCanvas(image, config.image.maxDimension);
      els.original.width = source.width;
      els.original.height = source.height;
      els.original.getContext('2d').drawImage(source.canvas, 0, 0);
      els.size.textContent = `Original ${source.originalWidth}×${source.originalHeight}; processed ${source.width}×${source.height}`;
      updatePreviews();
    } catch (error) {
      showError(error, 'Could not load image.');
    }
  });

  els.generate.addEventListener('click', () => {
    if (!source) return alert('Load an image first');
    try {
      lastDoc = generateDocument(getImageData(source.canvas), config);
      lastSvg = generateSvg(lastDoc.model, config.export);
      setSvgPreview(els.vector, lastSvg);
      els.layers.innerHTML = lastDoc.layers.map(layer => `<label><input type="checkbox" checked data-layer="${layer.id}"> <span style="color:${layer.color}">${layer.name}</span> ${layer.stats.segments || layer.stats.points || 0}</label>`).join('');
      els.status.textContent = `Generated ${lastDoc.stats.segments} segments in ${lastDoc.stats.ms.toFixed(0)} ms. ${lastDoc.stats.warnings.join(' ')}`;
      els.debug.textContent = JSON.stringify(lastDoc.stats, null, 2);
    } catch (error) {
      showError(error, 'Generation failed.');
    }
  });

  els.download.addEventListener('click', () => lastSvg && downloadFile('hatchforge.svg', lastSvg));
  els.copy.addEventListener('click', () => lastSvg && navigator.clipboard.writeText(lastSvg));
  els.save.addEventListener('click', () => {
    saveSettings(config);
    els.status.textContent = 'Settings saved.';
  });
  els.reset.addEventListener('click', () => {
    config = cloneConfig();
    location.reload();
  });
  els.applyPreset.addEventListener('click', () => {
    config = applyPreset(els.preset.value);
    hatchUI();
    els.status.textContent = `Preset applied: ${els.preset.value}`;
    updatePreviews();
  });
  els.nav.addEventListener('click', event => {
    if (!event.target.dataset.tab) return;
    ['original', 'gray', 'poster', 'vector', 'debug'].forEach(id => {
      document.getElementById(id).hidden = id !== event.target.dataset.tab;
    });
  });
  els.layers.addEventListener('click', event => {
    if (!event.target.dataset.layer) return;
    const group = els.vector.querySelector(`#${CSS.escape(event.target.dataset.layer)}`);
    if (group) group.style.display = event.target.checked ? '' : 'none';
  });

  function updatePreviews() {
    if (!source) return;
    try {
      const preview = buildPreviewData(getImageData(source.canvas), config);
      showImageData(els.gray, preview.adjustedImageData);
      showImageData(els.poster, preview.posterImageData);
      els.debug.textContent = JSON.stringify({
        size: [preview.levelMap.width, preview.levelMap.height],
        levels: preview.levelMap.levels,
        thresholds: preview.levelMap.thresholds,
        maskPixels: preview.mask.reduce((sum, value) => sum + value, 0)
      }, null, 2);
    } catch (error) {
      showError(error, 'Preview update failed.');
    }
  }

  function hatchUI() {
    ensureHatchLevels();
    els.hatchControls.innerHTML = '';
    for (let i = 1; i < config.posterize.levels; i++) {
      const levelConfig = config.hatching.levels[i];
      els.hatchControls.insertAdjacentHTML('beforeend', `<fieldset><legend>Level ${i}</legend><label><input data-path="hatching.levels.${i}.enabled" type="checkbox" ${levelConfig.enabled ? 'checked' : ''}> enabled</label>${['spacing', 'angle', 'strokeWidth', 'jitter', 'minSegmentLength', 'sampleStep'].map(key => `<label>${key}<input data-path="hatching.levels.${i}.${key}" type="number" step="0.1" value="${levelConfig[key]}"></label>`).join('')}<label>secondAngle <input data-path="hatching.levels.${i}.secondAngle" placeholder="empty" value="${levelConfig.secondAngle ?? ''}"></label></fieldset>`);
    }
  }

  function ensureHatchLevels() {
    for (let i = 1; i < config.posterize.levels; i++) {
      if (!config.hatching.levels[i]) {
        config.hatching.levels[i] = {
          ...config.hatching.levels.at(-1),
          spacing: Math.max(3, 18 - i * 2),
          angle: i % 2 ? 45 : -45,
          secondAngle: i > 3 ? 90 : null,
          color: ['#3478f6', '#28a745', '#f59f00', '#d6336c', '#111', '#7950f2', '#0ca678'][i - 1] || '#111'
        };
      }
    }
  }

  function showError(error, prefix) {
    console.error(error);
    els.status.textContent = `${prefix} ${error?.message || error}`;
    els.debug.textContent = error?.stack || String(error);
  }

  function getConfig(path) {
    return path.split('.').reduce((object, key) => object?.[key], config);
  }

  function setConfig(path, value) {
    const parts = path.split('.');
    const key = parts.pop();
    const object = parts.reduce((current, part) => current[part], config);
    object[key] = value;
  }

  function range(path, min, max, step) {
    return `<label>${path} <input data-path="${path}" type="range" min="${min}" max="${max}" step="${step}" value="${getConfig(path)}"><output>${getConfig(path)}</output></label>`;
  }

  function check(path, label) {
    return `<label><input data-path="${path}" type="checkbox" ${getConfig(path) ? 'checked' : ''}> ${label}</label>`;
  }

  function renderApp() {
    return `<aside><h1>HatchForge</h1><p>Offline vector hatching for laser engraving.</p><section><h2>Image</h2><input id="file" type="file" accept="image/png,image/jpeg,image/webp"><label>Max px <input data-path="image.maxDimension" type="number" value="${config.image.maxDimension}"></label><div id="size">Load an image.</div></section><section><h2>Presets</h2><select id="preset">${Object.keys(PRESETS).map(presetName => `<option>${presetName}</option>`).join('')}</select><button id="applyPreset">Apply</button></section><section><h2>Tone</h2>${range('tone.brightness', -100, 100, 1)}${range('tone.contrast', .2, 2.5, .05)}${range('tone.gamma', .2, 3, .05)}${check('tone.invert', 'Invert')}</section><section><h2>Posterize & Mask</h2>${range('posterize.levels', 3, 8, 1)}${range('mask.whiteThreshold', 180, 255, 1)}${check('mask.useAlpha', 'Use alpha mask')}${check('mask.removeWhite', 'Remove white bg')}<label>Min region area <input data-path="mask.minRegionArea" type="number" value="${config.mask.minRegionArea}"></label></section><section><h2>Accumulation</h2>${check('accumulation.cumulativeMode', 'Cumulative by threshold masks')}${check('accumulation.inverted', 'Inverted accumulation')}<select data-path="accumulation.cumulativeStrategy"><option>byThresholdMask</option><option>byRegionTone</option><option>globalLevelAccumulation</option></select></section><section><h2>Hatching per level</h2><div id="hatchControls"></div></section><section><h2>Edges / Details / Border</h2>${check('edges.internal', 'Internal edges')}${range('edges.minToneJump', 1, 5, 1)}${check('details.enabled', 'Detail edges')}${range('details.detailThreshold', 10, 100, 1)}${check('border.enabled', 'Outer border')}${range('border.strokeWidth', .2, 5, .1)}</section><section><h2>Export</h2>${range('export.widthMm', 20, 400, 1)}${check('export.allBlack', 'All black SVG')}<button id="generate">Generate vector</button><button id="download">Download SVG</button><button id="copy">Copy SVG</button><button id="save">Save settings</button><button id="reset">Reset</button></section></aside><main><nav><button data-tab="original">Original</button><button data-tab="gray">Gray</button><button data-tab="poster">Posterized</button><button data-tab="vector">Vector SVG</button><button data-tab="debug">Debug</button></nav><div class="stage"><canvas id="original"></canvas><canvas id="gray" hidden></canvas><canvas id="poster" hidden></canvas><div id="vector" hidden></div><pre id="debug" hidden></pre></div><section class="layers"><h2>Layers</h2><div id="layers"></div></section><footer id="status">Ready.</footer></main>`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[character]));
}
