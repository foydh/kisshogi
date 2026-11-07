// SVG evaluation graph without a chart library.

import { graphGeometry, MATE_VALUE } from "./eval-store.js";
import { t } from "./i18n.js";

function svgElement(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

export class GraphView {
  constructor(container, onSeek) {
    this.container = container;
    this.onSeek = onSeek;
    this.container.addEventListener("click", (event) => {
      const point = event.target.closest("[data-ply]");
      if (point) this.onSeek?.(Number(point.dataset.ply));
    });
  }

  render(series, length, currentPly) {
    this.container.replaceChildren();
    const width = Math.max(280, this.container.clientWidth || 340);
    const height = 150;
    const geo = graphGeometry(series, length, width, height);
    const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img" });
    svg.appendChild(svgElement("rect", { x: 0, y: 0, width, height, fill: "transparent" }));
    svg.appendChild(svgElement("rect", { x: 0, y: 0, width, height: geo.zeroY, class: "area-black" }));
    svg.appendChild(svgElement("rect", { x: 0, y: geo.zeroY, width, height: height - geo.zeroY, class: "area-white" }));
    svg.appendChild(svgElement("line", { x1: geo.padX, y1: geo.zeroY, x2: width - geo.padX, y2: geo.zeroY, class: "zero" }));
    if (length > 0) {
      const currentX = geo.x(currentPly);
      svg.appendChild(svgElement("line", { x1: currentX, y1: geo.padY, x2: currentX, y2: height - geo.padY, class: "current" }));
    }
    if (geo.path) {
      svg.appendChild(svgElement("path", { d: geo.path, class: "line" }));
      for (const point of geo.points) {
        const circle = svgElement("circle", {
          cx: point.x,
          cy: point.y,
          r: 3.2,
          class: "point",
          "data-ply": point.ply,
          tabindex: 0,
          role: "button",
        });
        const title = svgElement("title");
        const sign = point.value >= 0 ? "+" : "";
        title.textContent = `${point.ply}手 ${sign}${point.value.toFixed(2)}${point.depth ? ` d${point.depth}` : ""}`;
        circle.appendChild(title);
        svg.appendChild(circle);
      }
    } else {
      const hint = svgElement("text", { x: width / 2, y: height / 2, "text-anchor": "middle", class: "hint" });
      hint.textContent = t("analysis.noLines");
      svg.appendChild(hint);
    }
    const label = svgElement("text", { x: geo.padX, y: 10, class: "hint" });
    label.textContent = `+${MATE_VALUE}`;
    svg.appendChild(label);
    const label2 = svgElement("text", { x: geo.padX, y: height - 2, class: "hint" });
    label2.textContent = `-${MATE_VALUE}`;
    svg.appendChild(label2);
    this.container.appendChild(svg);
  }
}
