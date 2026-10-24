
(() => {
  const $ = id => document.getElementById(id);
  const button = $('analyze');
  if (!button) return;

  button.onclick = async () => {
    button.disabled = true;
    const status = $('status');
    if (status) status.textContent = 'Analizando la batería…';

    let ctx;
    try {
      const audio = $('audio');
      if (!audio || !audio.src) {
        throw new Error('Primero carga una canción.');
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();

      const response = await fetch(audio.src);
      if (!response.ok) throw new Error('No se pudo leer el audio.');
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      const samples = buffer.getChannelData(0);
      const sr = buffer.sampleRate;
      const hop = Math.floor(sr * 0.01);
      const bands = { kick: [], snare: [], hat: [] };

      let low = 0, mid = 0, prevLow = 0, prevMid = 0;
      let sums = [0, 0, 0], count = 0;

      for (let i = 0; i < samples.length; i++) {
        const x = samples[i];
        low += 0.025 * (x - low);
        mid += 0.22 * (x - mid);

        const values = [low, mid - low, x - mid];
        values.forEach((v, j) => sums[j] += v * v);
        count++;

        if (count >= hop || i === samples.length - 1) {
          bands.kick.push(Math.sqrt(sums[0] / count));
          bands.snare.push(Math.sqrt(sums[1] / count));
          bands.hat.push(Math.sqrt(sums[2] / count));
          sums = [0, 0, 0];
          count = 0;
        }
      }

      const events = [];
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
          if (
            v > Math.max(floor, baseline * 1.5) &&
            v > prev * 1.15 &&
            v >= values[i + 1] &&
            i - last >= gap
          ) {
            events.push({
              t: i * hop / sr,
              kind
            });
            last = i;
          }
        }
      }

      events.sort((a, b) => a.t - b.t);

      const svg = $('score');
      if (svg) {
        const ns = 'http://www.w3.org/2000/svg';
        svg.innerHTML = '';
        const lanes = [
          { key: 'hat', label: 'CHARLES', y: 40, color: '#f6c85f' },
          { key: 'snare', label: 'CAJA', y: 80, color: '#8ab4ff' },
          { key: 'kick', label: 'BOMBO', y: 120, color: '#71e0b4' }
        ];

        const add = (tag, attrs, text) => {
          const el = document.createElementNS(ns, tag);
          Object.entries(attrs).forEach(([k, v]) =>
            el.setAttribute(k, v)
          );
          if (text) el.textContent = text;
          svg.appendChild(el);
        };

        lanes.forEach(lane => {
          add('text', {
            x: 5, y: lane.y + 4,
            fill: lane.color, 'font-size': 10
          }, lane.label);
          add('line', {
            x1: 90, y1: lane.y, x2: 690, y2: lane.y,
            stroke: '#65738a'
          });
        });

        for (let q = 0; q <= 4; q++) {
          const x = 90 + q * 150;
          add('line', {
            x1: x, y1: 20, x2: x, y2: 135,
            stroke: '#354156'
          });
        }

        events.forEach(event => {
          const lane = lanes.find(l => l.key === event.kind);
          const x = 90 + event.t / buffer.duration * 600;
          add('circle', {
            cx: x, cy: lane.y - 12, r: 4,
            fill: lane.color
          });
        });
      }

      const count = kind => events.filter(e => e.kind === kind).length;
      if (status) {
        status.textContent =
          `Análisis aproximado: ${count('kick')} bombos, ` +
          `${count('snare')} cajas y ${count('hat')} charles.`;
      }
    } catch (e) {
      if (status) status.textContent = 'Error: ' + e.message;
    } finally {
      if (ctx) await ctx.close();
      button.disabled = false;
    }
  };
})();
