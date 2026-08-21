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
    const standardDeckLosses = Math.max(0, metrics.deckLosses - metrics.nearMisses);

    const slices = [
      { label: 'Close Wins (≤2 in deck)', count: metrics.closeWins, color: '#fbbf24' },
      { label: 'Standard Wins (3+)', count: standardWins, color: '#38bdf8' },
      { label: 'Near Miss (≤2 on board)', count: metrics.nearMisses, color: '#c084fc' },
      { label: 'Hard Loss (Deck Out)', count: standardDeckLosses, color: '#64748b' },
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

  public static renderPersonaComparisonChart(
    container: HTMLElement,
    goldenResults: Record<string, SimulationMetrics>,
    randomResults: Record<string, SimulationMetrics>
  ): void {
    container.innerHTML = '';
    const w = 520;
    const h = 240;
    const padding = { top: 35, right: 30, bottom: 45, left: 45 };

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const personas = [
      { id: 'casual', label: 'Casual', color: '#ef4444', golden: goldenResults.casual, random: randomResults.casual },
      { id: 'medium', label: 'Medium / Core', color: '#fbbf24', golden: goldenResults.medium, random: randomResults.medium },
      { id: 'expert', label: 'Expert / Pro', color: '#22c55e', golden: goldenResults.expert, random: randomResults.expert },
    ];

    const groupWidth = chartW / personas.length;
    const barWidth = 26;
    const barSpacing = 8;

    let barsSvg = '';

    personas.forEach((p, i) => {
      const groupX = padding.left + i * groupWidth + (groupWidth - (barWidth * 2 + barSpacing)) / 2;

      const goldenPassRate = p.golden ? p.golden.passRate : 0;
      const randomPassRate = p.random ? p.random.passRate : 0;

      const goldenH = (goldenPassRate / 100) * chartH;
      const randomH = (randomPassRate / 100) * chartH;

      const goldenY = padding.top + chartH - goldenH;
      const randomY = padding.top + chartH - randomH;

      const goldenX = groupX;
      const randomX = groupX + barWidth + barSpacing;

      // Golden Seeds Bar (Striped / Highlighted)
      barsSvg += `
        <g class="persona-bar-group">
          <!-- Golden Seeds Bar -->
          <rect x="${goldenX}" y="${goldenY}" width="${barWidth}" height="${goldenH}" rx="4" fill="${p.color}" opacity="0.95" stroke="#ffffff" stroke-width="1" />
          <text x="${goldenX + barWidth / 2}" y="${goldenY - 6}" font-size="10" font-weight="bold" fill="#f8fafc" text-anchor="middle">${goldenPassRate.toFixed(0)}%</text>

          <!-- Random Deals Bar -->
          <rect x="${randomX}" y="${randomY}" width="${barWidth}" height="${randomH}" rx="4" fill="${p.color}" opacity="0.45" stroke="${p.color}" stroke-dasharray="2,2" stroke-width="1.5" />
          <text x="${randomX + barWidth / 2}" y="${randomY - 6}" font-size="10" font-weight="bold" fill="#94a3b8" text-anchor="middle">${randomPassRate.toFixed(0)}%</text>

          <!-- Persona Label -->
          <text x="${groupX + barWidth + barSpacing / 2}" y="${h - padding.bottom + 18}" font-size="11" font-weight="700" fill="${p.color}" text-anchor="middle">${p.label}</text>
          <text x="${groupX + barWidth + barSpacing / 2}" y="${h - padding.bottom + 30}" font-size="9" fill="#64748b" text-anchor="middle">Near Miss: ${p.golden ? p.golden.nearMissRate.toFixed(0) : 0}%</text>
        </g>
      `;
    });

    const svg = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <!-- Grid lines -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${w - padding.right}" y2="${padding.top}" stroke="#334155" stroke-width="0.8" stroke-dasharray="3,3" />
        <line x1="${padding.left}" y1="${padding.top + chartH / 2}" x2="${w - padding.right}" y2="${padding.top + chartH / 2}" stroke="#334155" stroke-width="0.8" stroke-dasharray="3,3" />
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${w - padding.right}" y2="${padding.top + chartH}" stroke="#475569" stroke-width="1" />

        <!-- Y-Axis labels -->
        <text x="${padding.left - 8}" y="${padding.top + 4}" font-size="9" fill="#94a3b8" text-anchor="end">100%</text>
        <text x="${padding.left - 8}" y="${padding.top + chartH / 2 + 3}" font-size="9" fill="#94a3b8" text-anchor="end">50%</text>
        <text x="${padding.left - 8}" y="${padding.top + chartH + 3}" font-size="9" fill="#94a3b8" text-anchor="end">0%</text>

        <!-- Bars -->
        ${barsSvg}

        <!-- Legend -->
        <g transform="translate(${w / 2 - 110}, 12)">
          <rect x="0" y="0" width="10" height="10" rx="2" fill="#38bdf8" opacity="0.95" />
          <text x="14" y="9" font-size="10" fill="#cbd5e1">Golden Seeds Pool</text>
          <rect x="130" y="0" width="10" height="10" rx="2" fill="#38bdf8" opacity="0.45" stroke="#38bdf8" stroke-dasharray="2,2" />
          <text x="144" y="9" font-size="10" fill="#cbd5e1">Random PRNG</text>
        </g>
      </svg>
    `;

    container.innerHTML = svg;
  }

  private static createDonutSvg(
    slices: { label: string; count: number; color: string }[],
    total: number,
    centerVal: string,
    centerValColor: string,
    centerLbl: string,
    size: number = 78,
    strokeWidth: number = 11
  ): string {
    const center = size / 2;
    const radius = center - strokeWidth / 2 - 2;
    let currentAngle = -Math.PI / 2;
    let pathsSvg = '';

    if (total <= 0) {
      pathsSvg = `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#334155" stroke-width="${strokeWidth}" />`;
    } else {
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

        pathsSvg += `<path d="${pathData}" fill="none" stroke="${slice.color}" stroke-width="${strokeWidth}" stroke-linecap="butt" />`;
        currentAngle = nextAngle;
      });
    }

    return `
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
        ${pathsSvg}
        <circle cx="${center}" cy="${center}" r="${radius - strokeWidth / 2}" fill="#1e293b" />
        <text x="${center}" y="${center - 1}" font-size="10.5" font-weight="800" fill="${centerValColor}" text-anchor="middle">${centerVal}</text>
        <text x="${center}" y="${center + 8}" font-size="6.5" font-weight="600" fill="#94a3b8" text-anchor="middle">${centerLbl}</text>
      </svg>
    `;
  }

  public static renderTargetDualDonuts(
    container: HTMLElement,
    metrics: SimulationMetrics
  ): void {
    container.innerHTML = '';
    const total = metrics.totalGames || 1;
    const wins = metrics.wins;
    const standardWins = Math.max(0, metrics.wins - metrics.closeWins);
    const standardDeckLosses = Math.max(0, metrics.deckLosses - metrics.nearMisses);

    // 1. All Games Slices (Total 2,000 Games)
    const allSlices = [
      { label: 'Close Win', count: metrics.closeWins, color: '#fbbf24' },
      { label: 'Std Win', count: standardWins, color: '#38bdf8' },
      { label: 'Near Miss', count: metrics.nearMisses, color: '#c084fc' },
      { label: 'Loss', count: standardDeckLosses, color: '#64748b' },
      { label: 'Bomb', count: metrics.bombLosses, color: '#ef4444' },
    ];

    const svgAll = this.createDonutSvg(
      allSlices,
      total,
      `${metrics.passRate.toFixed(1)}%`,
      '#22c55e',
      'Pass Rate'
    );

    // 2. Winning Games Quality Slices (Inside Winning Games Only)
    const winSlices = [
      { label: 'Close (0-2)', count: metrics.closeWins, color: '#fbbf24' },
      { label: 'Std (3+)', count: standardWins, color: '#38bdf8' },
    ];

    const cwr = metrics.closeWinRate.toFixed(1);
    const stdWinQuality = (wins > 0 ? (standardWins / wins) * 100 : 0).toFixed(1);

    const svgWins = this.createDonutSvg(
      winSlices,
      wins,
      `${cwr}%`,
      '#fbbf24',
      'CWR'
    );

    container.innerHTML = `
      <div class="target-dual-donuts-wrap">
        <!-- Donut 1: All Games Cohort Breakdown -->
        <div class="dual-donut-col">
          <div class="dual-donut-header">
            <span class="col-title">🌍 All Games</span>
            <span class="col-subtitle">All ${total.toLocaleString()} runs</span>
          </div>
          <div class="dual-donut-body">
            ${svgAll}
            <div class="dual-donut-legend">
              <div class="dual-legend-row"><span class="legend-dot" style="background:#fbbf24;"></span><span class="legend-lbl">Close:</span><strong class="legend-pct">${((metrics.closeWins / total) * 100).toFixed(1)}%</strong></div>
              <div class="dual-legend-row"><span class="legend-dot" style="background:#38bdf8;"></span><span class="legend-lbl">Std:</span><strong class="legend-pct">${((standardWins / total) * 100).toFixed(1)}%</strong></div>
              <div class="dual-legend-row"><span class="legend-dot" style="background:#c084fc;"></span><span class="legend-lbl">Miss:</span><strong class="legend-pct">${((metrics.nearMisses / total) * 100).toFixed(1)}%</strong></div>
              <div class="dual-legend-row"><span class="legend-dot" style="background:#64748b;"></span><span class="legend-lbl">Loss:</span><strong class="legend-pct">${((standardDeckLosses / total) * 100).toFixed(1)}%</strong></div>
            </div>
          </div>
        </div>

        <!-- Donut 2: Winning Games Quality (CWR) -->
        <div class="dual-donut-col highlight-col">
          <div class="dual-donut-header">
            <span class="col-title" style="color: #fbbf24;">🏆 Win Quality</span>
            <span class="col-subtitle">Inside ${wins} wins only</span>
          </div>
          <div class="dual-donut-body">
            ${svgWins}
            <div class="dual-donut-legend">
              <div class="dual-legend-row"><span class="legend-dot" style="background:#fbbf24;"></span><span class="legend-lbl">Close:</span><strong class="legend-pct" style="color:#fbbf24;">${cwr}%</strong></div>
              <div class="dual-legend-row"><span class="legend-dot" style="background:#38bdf8;"></span><span class="legend-lbl">Std:</span><strong class="legend-pct">${stdWinQuality}%</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Explainer Note -->
      <div class="dual-donuts-explainer">
        <span>💡 <strong>All Games:</strong> воронка всех попыток (Pass / Loss). <strong>Win Quality:</strong> структура только побед (CWR).</span>
      </div>
    `;
  }
}
