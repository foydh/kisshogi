// Dynamic form for every USI option declared by an engine.

import { api } from "./api.js";
import { toast } from "./dialogs.js";
import { t } from "./i18n.js";

const ROLES = [
  { id: "black", titleKey: "engine.black" },
  { id: "white", titleKey: "engine.white" },
  { id: "analysis", titleKey: "engine.analysis" },
];

export class EngineOptionsPanel {
  constructor({ container, getConfig, persist, onStatusChanged }) {
    this.container = container;
    this.getConfig = getConfig;
    this.persist = persist;
    this.onStatusChanged = onStatusChanged || (() => {});
    this.definitions = { black: null, white: null, analysis: null };
    this.statuses = {};
    this.cards = {};
    this._build();
  }

  _build() {
    this.container.replaceChildren();
    for (const role of ROLES) {
      const card = document.createElement("div");
      card.className = "engine-card";
      card.dataset.role = role.id;
      card.innerHTML = `
        <h3><span>${t(role.titleKey)}</span><span class="muted engine-state"></span></h3>
        <div class="path-row">
          <input class="text-input engine-path" type="text" spellcheck="false" placeholder="./engines/engine">
          <button type="button" class="engine-probe">${t("engine.probe")}</button>
        </div>
        <div class="row" style="margin:6px 0 0">
          <button type="button" class="engine-restart">${t("engine.restart")}</button>
        </div>
        <div class="engine-status muted"></div>
        <div class="options"></div>`;
      const path = card.querySelector(".engine-path");
      path.value = this.getConfig().engines?.[role.id]?.path || "";
      path.addEventListener("change", () => {
        this.getConfig().engines[role.id].path = path.value.trim();
        this.persist();
      });
      card.querySelector(".engine-probe").addEventListener("click", () => this.probe(role.id));
      card.querySelector(".engine-restart").addEventListener("click", () => this.restart(role.id));
      this.container.appendChild(card);
      this.cards[role.id] = card;
    }
  }

  async refreshStatuses(statuses) {
    this.statuses = statuses || {};
    for (const role of ROLES) {
      const status = this.statuses[role.id];
      const card = this.cards[role.id];
      if (!card) continue;
      const state = card.querySelector(".engine-state");
      const statusLine = card.querySelector(".engine-status");
      state.textContent = status ? t(`engine.state.${status.state}`) || status.state : t("engine.state.stopped");
      statusLine.textContent = status?.name ? `${status.name}${status.error ? ` — ${status.error}` : ""}` : (status?.error || "");
      if (status?.options?.length && !this.definitions[role.id]) {
        this.definitions[role.id] = status.options;
        this.renderOptions(role.id);
      }
      if (status?.state === "ready" && status.options?.length) {
        this.definitions[role.id] = status.options;
      }
    }
  }

  async probe(role) {
    const path = this.cards[role].querySelector(".engine-path").value.trim();
    if (!path) { toast(t("engine.clearPath"), "error"); return; }
    const card = this.cards[role];
    const status = card.querySelector(".engine-status");
    status.textContent = t("engine.probing");
    try {
      const result = await api.probe(path);
      this.definitions[role] = result.options || [];
      status.textContent = `${result.name} — ${this.definitions[role].length} ${t("engine.options")}`;
      this.renderOptions(role);
    } catch (err) {
      status.textContent = t("engine.probeError", { message: err.message });
      toast(t("engine.probeError", { message: err.message }), "error");
    }
  }

  async restart(role) {
    try {
      await api.stopEngine(role);
      this.definitions[role] = null;
      const status = await api.engineStatus();
      await this.refreshStatuses(status);
      toast(t("engine.optionsSaved"), "ok");
    } catch (err) {
      toast(t("engine.startError", { message: err.message }), "error");
    }
  }

  renderOptions(role) {
    const card = this.cards[role];
    const container = card.querySelector(".options");
    container.replaceChildren();
    const defs = this.definitions[role];
    if (!defs?.length) {
      container.textContent = t("engine.noOptions");
      return;
    }
    const saved = this.getConfig().engines?.[role]?.options || {};
    for (const def of defs) {
      const row = document.createElement("div");
      row.className = "option-row";
      const label = document.createElement("label");
      label.textContent = def.name;
      label.title = `${def.name} (${def.type})`;
      row.appendChild(label);
      let input;
      const current = saved[def.name] ?? def.default ?? "";
      if (def.type === "check") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = String(current).toLowerCase() === "true";
        input.addEventListener("change", () => this._save(role, def.name, input.checked ? "true" : "false"));
      } else if (def.type === "spin") {
        input = document.createElement("input");
        input.type = "number";
        input.min = def.min ?? "";
        input.max = def.max ?? "";
        input.value = current;
        input.addEventListener("change", () => this._save(role, def.name, input.value));
      } else if (def.type === "combo") {
        input = document.createElement("select");
        for (const variant of def.vars || []) {
          const option = document.createElement("option");
          option.value = variant;
          option.textContent = variant;
          input.appendChild(option);
        }
        input.value = current;
        input.addEventListener("change", () => this._save(role, def.name, input.value));
      } else if (def.type === "button") {
        input = document.createElement("button");
        input.type = "button";
        input.className = "option-button";
        input.textContent = t("common.ok");
        input.addEventListener("click", async () => {
          try {
            await api.setOption(role, def.name, null);
            toast(t("engine.buttonApplied"), "ok");
          } catch (err) {
            toast(t("engine.notReady") + ` (${err.message})`, "error");
          }
        });
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.value = current === "<empty>" ? "" : current;
        input.addEventListener("change", () => this._save(role, def.name, input.value));
      }
      row.appendChild(input);
      container.appendChild(row);
    }
  }

  _save(role, name, value) {
    const config = this.getConfig();
    config.engines[role].options[name] = String(value);
    this.persist();
    toast(t("engine.optionsSaved"));
  }
}
