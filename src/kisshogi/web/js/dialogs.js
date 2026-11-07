// Small modal/toast helpers.  No framework, no external CSS.

import { t } from "./i18n.js";

let toastTimer = 0;

export function toast(message, kind = "info") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = "toast"; }, 4000);
}

function overlay(content) {
  const root = document.createElement("div");
  root.className = "modal-backdrop";
  const box = document.createElement("div");
  box.className = "modal";
  box.appendChild(content);
  root.appendChild(box);
  document.body.appendChild(root);
  return { root, box, close: () => root.remove() };
}

export function confirmDialog(title, message, { danger = false } = {}) {
  return new Promise((resolve) => {
    const content = document.createElement("div");
    content.innerHTML = `<h2></h2><p class="modal-message"></p><div class="modal-actions"></div>`;
    content.querySelector("h2").textContent = title;
    content.querySelector(".modal-message").textContent = message;
    const actions = content.querySelector(".modal-actions");
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("common.cancel");
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = danger ? "danger" : "primary";
    ok.textContent = t("common.ok");
    actions.append(cancel, ok);
    const { root, close } = overlay(content);
    const finish = (value) => { close(); resolve(value); };
    cancel.addEventListener("click", () => finish(false));
    ok.addEventListener("click", () => finish(true));
    root.addEventListener("click", (event) => { if (event.target === root) finish(false); });
    ok.focus();
  });
}

export function promotionDialog(choices) {
  return new Promise((resolve) => {
    const content = document.createElement("div");
    content.innerHTML = `<h2>${t("game.promotion")}</h2><p class="modal-message">${t("game.promotionPrompt")}</p><div class="modal-actions"></div>`;
    const actions = content.querySelector(".modal-actions");
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("common.cancel");
    actions.appendChild(cancel);
    const { root, close } = overlay(content);
    const finish = (value) => { close(); resolve(value); };
    cancel.addEventListener("click", () => finish(null));
    root.addEventListener("click", (event) => { if (event.target === root) finish(null); });
    for (const choice of choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = choice.promote ? "primary" : "";
      button.textContent = choice.promote ? t("game.promote") : t("game.noPromote");
      button.addEventListener("click", () => finish(choice));
      actions.appendChild(button);
    }
    actions.lastElementChild?.focus();
  });
}

export function textDialog(title, initial = "", { multiline = false } = {}) {
  return new Promise((resolve) => {
    const content = document.createElement("div");
    content.innerHTML = `<h2></h2><p class="modal-message"></p><div class="modal-actions"></div>`;
    content.querySelector("h2").textContent = title;
    const field = multiline ? document.createElement("textarea") : document.createElement("input");
    field.className = "modal-input";
    if (multiline) field.rows = 8;
    field.value = initial;
    content.insertBefore(field, content.querySelector(".modal-actions"));
    const actions = content.querySelector(".modal-actions");
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("common.cancel");
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "primary";
    ok.textContent = t("common.ok");
    actions.append(cancel, ok);
    const { root, close } = overlay(content);
    const finish = (value) => { close(); resolve(value); };
    cancel.addEventListener("click", () => finish(null));
    ok.addEventListener("click", () => finish(field.value));
    root.addEventListener("click", (event) => { if (event.target === root) finish(null); });
    field.focus();
  });
}

export function infoDialog(title, lines) {
  const content = document.createElement("div");
  content.innerHTML = `<h2></h2><div class="modal-lines"></div><div class="modal-actions"></div>`;
  content.querySelector("h2").textContent = title;
  const box = content.querySelector(".modal-lines");
  for (const line of lines) {
    const p = document.createElement("p");
    p.textContent = line;
    box.appendChild(p);
  }
  const actions = content.querySelector(".modal-actions");
  const ok = document.createElement("button");
  ok.type = "button";
  ok.className = "primary";
  ok.textContent = t("common.close");
  actions.appendChild(ok);
  const { close } = overlay(content);
  ok.addEventListener("click", close);
  ok.focus();
}
