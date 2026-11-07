// Locale loading and tiny interpolation helper.

export const LANGUAGES = [
  { id: "auto", labelKey: "language.auto" },
  { id: "zh-CN", labelKey: "language.zhCN" },
  { id: "en", labelKey: "language.en" },
  { id: "ja", labelKey: "language.ja" },
];

let messages = {};
let fallback = {};
let current = "en";

export async function loadLocale(language) {
  const resolve = (lang) => {
    if (lang === "zh" || lang === "zh-CN" || lang?.startsWith("zh-")) return "zh-CN";
    if (lang === "ja" || lang?.startsWith("ja-")) return "ja";
    return "en";
  };
  let target = language;
  if (!target || target === "auto") {
    const nav = navigator.languages?.[0] || navigator.language || "en";
    target = resolve(nav);
  } else {
    target = resolve(target);
  }
  const [main, en] = await Promise.all([
    fetch(`locales/${target}.json`).then((r) => r.json()),
    target === "en" ? Promise.resolve({}) : fetch("locales/en.json").then((r) => r.json()),
  ]);
  messages = main;
  fallback = en;
  current = target;
  document.documentElement.lang = target;
  return target;
}

export function t(key, vars = {}) {
  const raw = messages[key] ?? fallback[key] ?? key;
  return String(raw).replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
}

export function applyStaticTranslations(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const el of root.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.getAttribute("data-i18n-title"));
  }
  for (const el of root.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  }
  for (const el of root.querySelectorAll("[data-i18n-aria-label]")) {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
  }
}

export function currentLanguage() { return current; }
