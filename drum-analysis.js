
(() => {
  const $ = id => document.getElementById(id);
  const button = $('analyze');
  if (!button) return;

  let events = [];
  let duration = 0;
  let page = 0;
  const bpm = 100;
  const beatsPerBar = 4;
  const barsPerPage = 4;
  const secondsPerBeat = 60 / bpm;
  const secondsPerPage = secondsPerBeat * beatsPerBar * barsPerPage;

  const svg = $('score');
  if (svg) {
    svg.setAttribute('viewBox', '0 0 900 240');
    svg.style.height = '240px';
    svg.style.minWidth = '650px';
  }

  const box = svg && svg.parentElement;
  if (box && !$('scoreControls')) {
    const controls = document.createElement('div');
    controls.id = 'scoreControls';
    controls.style.cssText =
      'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';
    controls.innerHTML = `
      <button id="prevPage" class="secondary">← Anterior</button>
      <button id="nextPage" class="secondary">Siguiente →</button>
      <button id="printScore">Imprimir / Guardar PDF</button>
      <span id="pageInfo" style="align-self:center;color:#a8b4c8"></span>`;
    box.appendChild(controls);
    $('prevPage').onclick = () => { page = Math.max(0, page - 1); draw(); };
    $('nextPage').onclick = () => {
      page = Math.min(Math.max(0, Math.ceil(duration / secondsPerPage) - 1), page + 1);
      draw();
    };
    $('printScore').onclick = printScore;
  }

  function el(tag, attrs, text) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (text !== undefined) n.textContent = text;
    svg.appendChild(n);
    return n;
  }

  function draw() {
    if (!svg) return;
    svg.innerHTML = '';
    const start = page * secondsPerPage;
    const end = start + secondsPerPage;
    const left = 110;
    const right = 880;
    const width = right - left;
    const staffTop = 55;
    const lineGap = 16;

    el('text', {x: left, y: 22, fill: '#f3f6fc', 'font-size': 16},
      'PARTITURA DE BATERÍA · PÁGINA ' + (page + 1));

    el('text', {x: left, y: 40, fill: '#a8b4c8', 'font-size': 11},
      'Tempo orientativo: ' + bpm + ' BPM · Compás: 4/4');

    for (let i = 0; i < 5; i++) {
      el('line', {
        x1: left, y1: staffTop + i * lineGap,
        x2: right, y2: staffTop + i * lineGap,
        stroke: '#a8b4c8', 'stroke-width': 1
      });
    }

    el('text', {x: 8, y: 62, fill: '#f6c85f', 'font-size': 12}, 'CHARLES');
    el('text', {x: 8, y: 86, fill: '#8ab4ff', 'font-size': 12}, 'CAJA');
    el('text', {x: 8, y: 126, fill: '#71e0b4', 'font-size': 12}, 'BOMBO');

    for (let bar = 0; bar <= barsPerPage; bar++) {
      const x = left + width * bar / barsPerPage;
      el('line', {
        x1: x, y1: staffTop - 8, x2: x, y2: staffTop + 4 * lineGap + 8,
        stroke: '#65738a', 'stroke-width': bar === 0 || bar === barsPerPage ? 2 : 1
      });
      if (bar < barsPerPage) {
        el('text', {
          x: x + 8, y: staffTop - 12, fill: '#a8b4c8', 'font-size': 11
        }, 'Compás ' + (page * barsPerPage + bar + 1));
      }
    }

    const shown = events.filter(e => e.t >= start && e.t < end);
    shown.forEach(event => {
      const x = left + ((event.t - start) / secondsPerPage) * width;
      const y = event.kind === 'hat' ? staffTop :
                event.kind === 'snare' ? staffTop + 2 * lineGap :
                staffTop + 4 * lineGap;
      const color = event.kind === 'hat' ? '#f6c85f' :
                    event.kind === 'snare' ? '#8ab4ff' : '#71e0b4';

      if (event.kind === 'hat') {
        el('line', {x1: x - 5, y1: y - 5, x2: x + 5, y2: y + 5,
          stroke: color, 'stroke-width': 2});
        el('line', {x1: x - 5, y1: y + 5, x2: x + 5, y2: y - 5,
          stroke: color, 'stroke-width': 2});
      } else {
        el('ellipse', {cx: x, cy: y, rx: 5, ry: 3.5,
          fill: color, transform: `rotate(-20 ${x} ${y})`});
      }

      el('line', {x1: x + 4, y1: y, x2: x + 4, y2: y - 22,
        stroke: color, 'stroke-width': 1.5});
    });

    if (!shown.length) {
      el('text', {x: 490, y: 145, fill: '#a8b4c8',
        'font-size': 13, 'text-anchor': 'middle'},
        'No hay golpes detectados en esta página');
    }

    const info = $('pageInfo');
    if (info) info.textContent =
      `Página ${page + 1} de ${Math.max(1, Math.ceil(duration / secondsPerPage))}`;

    if ($('prevPage')) $('prevPage').disabled = page === 0;
    if ($('nextPage')) {
      $('nextPage').disabled = page >= Math.max(0, Math.ceil(duration / secondsPerPage) - 1);
    }
  }

  function printScore() {
    const copy = svg.cloneNode(true);
    copy.setAttribute('width', '100%');
    copy.setAttribute('height', '240');
    const w = window.open('', '_blank');
    if (!w) {
      alert('El navegador ha bloqueado la ventana. Permite ventanas emergentes e inténtalo de nuevo.');
      return;
    }
    w.document.write(`<!doctype html><html lang="es"><head>
      <meta charset="utf-8"><title>Partitura de batería</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;color:#111}
      h2{font-size:18px}svg{width:100%;height:auto}
      @page{size:A4 landscape;margin:12mm}</style></head><body>
      <h2>Drum Transcriber — página ${page + 1}</h2>
      ${copy.outerHTML}
      <p>Transcripción aproximada. Verifica los golpes y el tempo.</p>
      <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
    w.document.close();
  }

  button.onclick = async () => {
    button.disabled = true;
    const status = $('status');
    let ctx;

    try {
      const audio = $('audio');
      if (!audio || !audio.src) throw new Error('Primero carga una canción.');

      status.textContent = 'Analizando audio…';
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const response = await fetch(audio.src);
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      const samples = buffer.getChannelData(0);
      const sr = buffer.sampleRate;
      const hop = Math.floor(sr * 0.01);
      const bands = {kick: [], snare: [], hat: []};
      let low = 0, mid = 0, sums = [0, 0, 0], count = 0;

      for (let i = 0; i < samples.length; i++) {
        const x = samples[i];
        low += 0.025 * (x - low);
        mid += 0.22 * (x - mid);
        [low, mid - low, x - mid].forEach((v, j) => sums[j] += v * v);
        count++;

        if (count >= hop || i === samples.length - 1) {
          [0, 1, 2].forEach(j => {
            bands[['kick', 'snare', 'hat'][j]].push(Math.sqrt(sums[j] / count));
          });
          sums = [0, 0, 0];
          count = 0;
        }
      }

      events = [];
      for (const [kind, values, floor, gap] of [
        ['kick', bands.kick, 0.012, 12],
        ['snare', bands.snare, 0.009, 11],
        ['hat', bands.hat, 0.006, 6]
      ]) {
        const sorted = [...values].sort((a, b) => a - b);
        const baseline = sorted[Math.floor(sorted.length * 0.55)] || 0;
        let last = -gap;

        for (let i = 2; i < values.length - 2; i++) {
          const v = values[i];
          const prev = (values[i - 1] + values[i - 2]) / 2;
          if (v > Math.max(floor, baseline * 1.5) &&
              v > prev * 1.15 && v >= values[i + 1] &&
              i - last >= gap) {
            events.push({t: i * hop / sr, kind});
            last = i;
          }
        }
      }

      events.sort((a, b) => a.t - b.t);
      duration = buffer.duration;
      page = 0;
      draw();

      const count = kind => events.filter(e => e.kind === kind).length;
      status.textContent =
        `Análisis aproximado: ${count('kick')} bombos, ` +
        `${count('snare')} cajas y ${count('hat')} charles. ` +
        'Tempo provisional de la partitura: 100 BPM.';
    } catch (e) {
      status.textContent = 'Error: ' + e.message;
    } finally {
      if (ctx) await ctx.close();
      button.disabled = false;
    }
  };
})();
