import { SimulationMetrics } from '../core/types.ts';

export class ChartsView {
  public static renderHistogram(
    container: HTMLElement,
    distribution: number[],
    totalWins: number
  ): void {
    container.innerHTML = '';
    const w = 480;
    const h = 220;
    const padding = { top: 30, right: 20, bottom: 40, left: 40 };

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxCount = Math.max(...distribution, 1);
    const labels = ['0', '1', '2', '3', '4', '5+'];
    const barWidth = chartW / labels.length - 12;

    let barsSvg = '';

    distribution.forEach((count, i) => {
      const barH = (count / maxCount) * chartH;
      const x = padding.left + i * (chartW / labels.length) + 6;
      const y = padding.top + chartH - barH;
      const pct = totalWins > 0 ? ((count / totalWins) * 100).toFixed(1) : '0';

      const isCloseWin = i <= 2;
      const fill = isCloseWin ? '#fbbf24' : '#38bdf8';
      const stroke = isCloseWin ? '#f59e0b' : '#0284c7';

      barsSvg += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.5" opacity="0.9" />
        <text x="${x + barWidth / 2}" y="${y - 6}" font-size="11" font-weight="bold" fill="#f8fafc" text-anchor="middle">${pct}%</text>
        <text x="${x + barWidth / 2}" y="${y - 18}" font-size="10" fill="#94a3b8" text-anchor="middle">(${count})</text>
        <text x="${x + barWidth / 2}" y="${h - padding.bottom + 18}" font-size="12" font-weight="600" fill="${isCloseWin ? '#fbbf24' : '#cbd5e1'}" text-anchor="middle">${labels[i]}</text>
      `;
    });

    const svg = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <!-- Axes -->
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${w - padding.right}" y2="${padding.top + chartH}" stroke="#475569" stroke-width="1" />
        <!-- Bars -->
        ${barsSvg}
        <!-- Axis labels -->
        <text x="${w / 2}" y="${h - 6}" font-size="11" fill="#94a3b8" text-anchor="middle">Cards Remaining in Draw Pile</text>
      </svg>
    `;

    container.innerHTML = svg;
  }

  public static renderOutcomeDonut(
    container: HTMLElement,
    metrics: SimulationMetrics
  ): void {
    container.innerHTML = '';
    const size = 220;
    const center = size / 2;
    const radius = 70;
    const strokeWidth = 28;

    const total = metrics.totalGames || 1;
    const standardWins = Math.max(0, metrics.wins - metrics.closeWins);

    const slices = [
      { label: 'Close Wins (≤2)', count: metrics.closeWins, color: '#fbbf24' },
      { label: 'Standard Wins (3+)', count: standardWins, color: '#38bdf8' },
      { label: 'Deck Depleted', count: metrics.deckLosses, color: '#64748b' },
      { label: 'Bomb Exploded', count: metrics.bombLosses, color: '#ef4444' },
    ];

    let currentAngle = -Math.PI / 2;
    let pathsSvg = '';

    slices.forEach((slice) => {
      if (slice.count <= 0) return;
      const angle = (slice.count / total) * Math.PI * 2;
      const nextAngle = currentAngle + angle;

      const x1 = center + radius * Math.cos(currentAngle);
      const y1 = center + radius * Math.sin(currentAngle);
      const x2 = center + radius * Math.cos(nextAngle);
      const y2 = center + radius * Math.sin(nextAngle);

      const largeArcFlag = angle > Math.PI ? 1 : 0;

      const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

      pathsSvg += `
        <path d="${pathData}" fill="none" stroke="${slice.color}" stroke-width="${strokeWidth}" stroke-linecap="butt" />
      `;

      currentAngle = nextAngle;
    });

    const cwr = metrics.closeWinRate.toFixed(1);

    const svg = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px; width: 100%; height: 100%;">
        <svg viewBox="0 0 ${size} ${size}" width="170" height="170" xmlns="http://www.w3.org/2000/svg">
          ${pathsSvg}
          <circle cx="${center}" cy="${center}" r="${radius - strokeWidth / 2}" fill="#1e293b" />
          <text x="${center}" y="${center - 4}" font-size="18" font-weight="800" fill="#fbbf24" text-anchor="middle">${cwr}%</text>
          <text x="${center}" y="${center + 14}" font-size="10" fill="#94a3b8" text-anchor="middle">Close Win Rate</text>
        </svg>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
          ${slices
            .map(
              (s) => `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${s.color};"></span>
              <span style="color: #cbd5e1;">${s.label}: <strong>${((s.count / total) * 100).toFixed(1)}%</strong></span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    container.innerHTML = svg;
  }
}
