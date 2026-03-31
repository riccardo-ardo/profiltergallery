import { editor, widget } from "https://esm.sh/@wix/editor";
import { createClient } from "https://esm.sh/@wix/sdk";

const client = createClient({
  host: editor.host(),
  modules: { widget },
});

const DEFAULTS = {
  accent: "#4d8dff",
  background: "#000000",
  backgroundOpacity: "1",
  showBackground: "true",

  fontFamily: "Inter",
  titleSize: "medium",
  descSize: "medium",
  categorySize: "medium",

  pillActiveBg: "#4d8dff",
  pillActiveText: "#ffffff",
  pillBg: "#000000",
  pillBorder: "#2f3440",
  pillText: "#d6d9e0",

  cardPanelBg: "#101117",
  titleColor: "#ffffff",
  descColor: "#c7cad1",
  categoryColor: "#4d8dff",
  radius: "22",
  imageRadius: "22",

  modalBg: "#090a0e",
  modalTitleColor: "#ffffff",
  modalDescColor: "#c7cad1",

  columns: "5",
  gap: "24",
  cardWidth: "250",
  textAlign: "left",
  imageFit: "cover",

  showDescription: "true",
  showCategory: "true",
  showShadow: "true",
  hoverEffect: "true"
};

async function setPropSafe(key, value) {
  try {
    await client.widget.setProp(key, value);
  } catch (error) {
    console.error(`Failed to set prop "${key}"`, error);
  }
}

async function getPropSafe(key) {
  try {
    const value = await client.widget.getProp(key);
    return value;
  } catch (error) {
    console.warn(`Could not get prop "${key}"`, error);
    return undefined;
  }
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  if (el.type === "checkbox") {
    el.checked = String(value).toLowerCase() === "true";
    return;
  }

  el.value = String(value);
}

function getInputValue(el) {
  if (el.type === "checkbox") {
    return String(el.checked);
  }
  return String(el.value);
}

function wireInput(id, propName) {
  const el = document.getElementById(id);
  if (!el) return;

  const handler = async () => {
    await setPropSafe(propName, getInputValue(el));
  };

  el.addEventListener("input", handler);
  el.addEventListener("change", handler);
}

async function hydrateField(id, propName) {
  const existing = await getPropSafe(propName);
  const fallback = DEFAULTS[propName];
  const finalValue =
    existing !== undefined && existing !== null && existing !== ""
      ? existing
      : fallback;

  setInputValue(id, finalValue);
}

async function hydrateAll() {
  const mappings = [
    ["accent", "accent"],
    ["background", "background"],
    ["backgroundOpacity", "backgroundOpacity"],
    ["showBackground", "showBackground"],

    ["fontFamily", "fontFamily"],
    ["titleSize", "titleSize"],
    ["descSize", "descSize"],
    ["categorySize", "categorySize"],

    ["pillActiveBg", "pillActiveBg"],
    ["pillActiveText", "pillActiveText"],
    ["pillBg", "pillBg"],
    ["pillBorder", "pillBorder"],
    ["pillText", "pillText"],

    ["cardPanelBg", "cardPanelBg"],
    ["titleColor", "titleColor"],
    ["descColor", "descColor"],
    ["categoryColor", "categoryColor"],
    ["radius", "radius"],
    ["imageRadius", "imageRadius"],

    ["modalBg", "modalBg"],
    ["modalTitleColor", "modalTitleColor"],
    ["modalDescColor", "modalDescColor"],

    ["columns", "columns"],
    ["gap", "gap"],
    ["cardWidth", "cardWidth"],
    ["textAlign", "textAlign"],
    ["imageFit", "imageFit"],

    ["showDescription", "showDescription"],
    ["showCategory", "showCategory"],
    ["showShadow", "showShadow"],
    ["hoverEffect", "hoverEffect"]
  ];

  for (const [id, propName] of mappings) {
    await hydrateField(id, propName);
  }
}

function wireAll() {
  const mappings = [
    ["accent", "accent"],
    ["background", "background"],
    ["backgroundOpacity", "backgroundOpacity"],
    ["showBackground", "showBackground"],

    ["fontFamily", "fontFamily"],
    ["titleSize", "titleSize"],
    ["descSize", "descSize"],
    ["categorySize", "categorySize"],

    ["pillActiveBg", "pillActiveBg"],
    ["pillActiveText", "pillActiveText"],
    ["pillBg", "pillBg"],
    ["pillBorder", "pillBorder"],
    ["pillText", "pillText"],

    ["cardPanelBg", "cardPanelBg"],
    ["titleColor", "titleColor"],
    ["descColor", "descColor"],
    ["categoryColor", "categoryColor"],
    ["radius", "radius"],
    ["imageRadius", "imageRadius"],

    ["modalBg", "modalBg"],
    ["modalTitleColor", "modalTitleColor"],
    ["modalDescColor", "modalDescColor"],

    ["columns", "columns"],
    ["gap", "gap"],
    ["cardWidth", "cardWidth"],
    ["textAlign", "textAlign"],
    ["imageFit", "imageFit"],

    ["showDescription", "showDescription"],
    ["showCategory", "showCategory"],
    ["showShadow", "showShadow"],
    ["hoverEffect", "hoverEffect"]
  ];

  mappings.forEach(([id, propName]) => wireInput(id, propName));
}

async function initializeMissingProps() {
  for (const [propName, defaultValue] of Object.entries(DEFAULTS)) {
    const existing = await getPropSafe(propName);
    if (existing === undefined || existing === null || existing === "") {
      await setPropSafe(propName, defaultValue);
    }
  }
}

async function init() {
  await initializeMissingProps();
  await hydrateAll();
  wireAll();
}

init();