class ProFilterGallery extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.settings = {
      textColor: "#ffffff",
      mutedText: "rgba(255,255,255,0.72)",
      faintText: "rgba(255,255,255,0.48)",
      borderColor: "rgba(255,255,255,0.10)",
      fontFamily: "Inter, Arial, sans-serif"
    };

    this.config = {
      accent: "#4d8dff",
      background: "#000000",
      backgroundOpacity: 1,
      showBackground: true,

      columns: 5,
      gap: 24,
      cardWidth: 250,
      radius: 22,
      imageRadius: 22,

      showDescription: true,
      showCategory: true,
      textAlign: "left",
      showShadow: true,
      hoverEffect: true,
      imageFit: "cover",

      titleSize: "medium",
      descSize: "medium",
      categorySize: "medium",

      fontFamily: "Inter, Arial, sans-serif",

      pillActiveBg: "#4d8dff",
      pillActiveText: "#ffffff",
      pillBg: "transparent",
      pillBorder: "rgba(255,255,255,0.18)",
      pillText: "rgba(255,255,255,0.82)",

      cardPanelBg: "#101117",
      titleColor: "#ffffff",
      descColor: "rgba(255,255,255,0.78)",
      categoryColor: "#4d8dff",

      modalBg: "#090a0e",
      modalTitleColor: "#ffffff",
      modalDescColor: "rgba(255,255,255,0.72)"
    };

    this.projects = [];

    this.filters = [
      "All",
      "Website Design",
      "3D Rendering",
      "Brand Activation",
      "Expo Stand",
      "Set Design"
    ];

    this.activeFilter = "All";
    this.activeProject = null;
    this.activeImageIndex = 0;
    this._resizeObserver = null;
    this._sendHeight = null;
    this._eventsBound = false;
    this._messageHandlerBound = false;
    this._wixDataBound = false;
  }

  static get observedAttributes() {
    return [
      "projects",
      "accent",
      "background",
      "backgroundopacity",
      "showbackground",
      "columns",
      "gap",
      "cardwidth",
      "radius",
      "imageradius",
      "showdescription",
      "showcategory",
      "textalign",
      "showshadow",
      "hovereffect",
      "imagefit",
      "titlesize",
      "descsize",
      "categorysize",
      "fontfamily",
      "pillactivebg",
      "pillactivetext",
      "pillbg",
      "pillborder",
      "pilltext",
      "cardpanelbg",
      "titlecolor",
      "desccolor",
      "categorycolor",
      "modalbg",
      "modaltitlecolor",
      "modaldesccolor"
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name.toLowerCase()) {
      case "projects":
        try {
          const parsed = JSON.parse(newValue || "[]");
          this.setProjects(parsed);
        } catch (e) {
          console.error("Invalid projects JSON", e);
        }
        return;

      case "accent":
        this.config.accent = newValue || "#4d8dff";
        break;

      case "background":
        this.config.background = newValue || "#000000";
        break;

      case "backgroundopacity":
        this.config.backgroundOpacity = this.parseNumber(newValue, 1);
        break;

      case "showbackground":
        this.config.showBackground = this.parseBoolean(newValue, true);
        break;

      case "columns":
        this.config.columns = Math.max(1, this.parseIntValue(newValue, 5));
        break;

      case "gap":
        this.config.gap = this.parsePxValue(newValue, 24);
        break;

      case "cardwidth":
        this.config.cardWidth = this.parsePxValue(newValue, 250);
        break;

      case "radius":
        this.config.radius = this.parsePxValue(newValue, 22);
        break;

      case "imageradius":
        this.config.imageRadius = this.parsePxValue(newValue, 22);
        break;

      case "showdescription":
        this.config.showDescription = this.parseBoolean(newValue, true);
        break;

      case "showcategory":
        this.config.showCategory = this.parseBoolean(newValue, true);
        break;

      case "textalign":
        this.config.textAlign = newValue === "center" ? "center" : "left";
        break;

      case "showshadow":
        this.config.showShadow = this.parseBoolean(newValue, true);
        break;

      case "hovereffect":
        this.config.hoverEffect = this.parseBoolean(newValue, true);
        break;

      case "imagefit":
        this.config.imageFit = newValue === "contain" ? "contain" : "cover";
        break;

      case "titlesize":
        this.config.titleSize = ["small", "medium", "large"].includes(newValue)
          ? newValue
          : "medium";
        break;

      case "descsize":
        this.config.descSize = ["small", "medium", "large"].includes(newValue)
          ? newValue
          : "medium";
        break;

      case "categorysize":
        this.config.categorySize = ["small", "medium"].includes(newValue)
          ? newValue
          : "medium";
        break;

      case "fontfamily":
        this.config.fontFamily = this.normalizeFontFamily(newValue);
        break;

      case "pillactivebg":
        this.config.pillActiveBg = newValue || "#4d8dff";
        break;

      case "pillactivetext":
        this.config.pillActiveText = newValue || "#ffffff";
        break;

      case "pillbg":
        this.config.pillBg = newValue || "transparent";
        break;

      case "pillborder":
        this.config.pillBorder = newValue || "rgba(255,255,255,0.18)";
        break;

      case "pilltext":
        this.config.pillText = newValue || "rgba(255,255,255,0.82)";
        break;

      case "cardpanelbg":
        this.config.cardPanelBg = newValue || "#101117";
        break;

      case "titlecolor":
        this.config.titleColor = newValue || "#ffffff";
        break;

      case "desccolor":
        this.config.descColor = newValue || "rgba(255,255,255,0.78)";
        break;

      case "categorycolor":
        this.config.categoryColor = newValue || "#4d8dff";
        break;

      case "modalbg":
        this.config.modalBg = newValue || "#090a0e";
        break;

      case "modaltitlecolor":
        this.config.modalTitleColor = newValue || "#ffffff";
        break;

      case "modaldesccolor":
        this.config.modalDescColor = newValue || "rgba(255,255,255,0.72)";
        break;
    }

    if (this.isConnected) {
      this.render();
      this.renderCards();
      if (this._sendHeight) this._sendHeight();
    }
  }

  connectedCallback() {
    this.applyInitialAttributes();
    this.render();
    this.bindEvents();
    this.bindMessageBridge();
    this.bindWixData();
    this.renderCards();
    this.setupAutoHeight();
  }

  disconnectedCallback() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }

  bindWixData() {
    if (this._wixDataBound) return;
    this._wixDataBound = true;

    window.addEventListener("message", (event) => {
      if (event?.data?.type === "WIX_DATA" && Array.isArray(event.data.items)) {
        console.log("🔥 Wix CMS Data Received:", event.data.items);

        const projects = event.data.items.map((item, index) => ({
          id: item._id || `project-${index + 1}`,
          title: item.title || "Untitled Project",
          category: item.category || "Uncategorized",
          description: item.description || "",
          coverImage: this.normalizeImage(item.coverImage),
         images: Array.isArray(item.images)
  ? item.images.map((img) => this.normalizeImage(img)).filter(Boolean)
  : item.images
    ? [this.normalizeImage(item.images)].filter(Boolean)
    : [],
          order: item.order || index + 1,
          visible: item.visible !== false
        }));

        this.setProjects(projects);
      }
    });
  }

  bindMessageBridge() {
    if (this._messageHandlerBound) return;
    this._messageHandlerBound = true;

    window.addEventListener("message", (event) => {
      if (event?.data?.type === "WIX_PORTFOLIO_DATA" && Array.isArray(event.data.projects)) {
        this.setProjects(event.data.projects);
      }
    });
  }

  applyInitialAttributes() {
    for (const name of ProFilterGallery.observedAttributes) {
      const value = this.getAttribute(name);
      if (value !== null) {
        this.attributeChangedCallback(name, null, value);
      }
    }
  }

  parseBoolean(value, fallback = true) {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "boolean") return value;
    return String(value).toLowerCase() !== "false";
  }

  parseNumber(value, fallback = 0) {
    const n = parseFloat(String(value));
    return Number.isFinite(n) ? n : fallback;
  }

  parseIntValue(value, fallback = 0) {
    const n = parseInt(String(value), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  parsePxValue(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    const cleaned = String(value).replace("px", "").trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }

  normalizeFontFamily(value) {
    const v = (value || "").trim();
    switch (v.toLowerCase()) {
      case "inter":
        return "Inter, Arial, sans-serif";
      case "arial":
        return "Arial, sans-serif";
      case "helvetica":
        return "Helvetica, Arial, sans-serif";
      case "georgia":
        return "Georgia, serif";
      case "poppins":
        return "Poppins, Arial, sans-serif";
      case "montserrat":
        return "Montserrat, Arial, sans-serif";
      default:
        return "Inter, Arial, sans-serif";
    }
  }

  normalizeImage(value) {
    if (!value) return "";
    if (typeof value === "string") return value;

    if (typeof value === "object") {
      if (value.src && typeof value.src === "string") return value.src;
      if (value.url && typeof value.url === "string") return value.url;
      if (value.image && value.image.src && typeof value.image.src === "string") return value.image.src;
    }

    return "";
  }

  setProjects(projects) {
    if (!Array.isArray(projects)) {
      this.projects = [];
    } else {
      this.projects = projects.map((project, index) => {
        const coverImage = this.normalizeImage(project.coverImage);

        let images = [];
        if (Array.isArray(project.images) && project.images.length) {
          images = project.images.map((img) => this.normalizeImage(img)).filter(Boolean);
        }

        if (!images.length && coverImage) {
          images = [coverImage];
        }

        return {
          id: project.id ?? `project-${index + 1}`,
          title: project.title || "Untitled Project",
          category: project.category || "Uncategorized",
          description: project.description || "",
          coverImage,
          images,
          order: typeof project.order === "number" ? project.order : index + 1,
          visible: project.visible !== false
        };
      });
    }

    if (this.isConnected) {
      this.renderCards();
      if (this._sendHeight) this._sendHeight();
    }
  }

  getPreviewText(text, maxLength = 88) {
    if (!text || text.length <= maxLength) return text;
    const trimmed = text.slice(0, maxLength);
    const lastSpace = trimmed.lastIndexOf(" ");
    return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed).trim();
  }

  hexToRgb(hex) {
    if (!hex) return "0,0,0";
    let normalized = String(hex).replace("#", "").trim();

    if (normalized.length === 3) {
      normalized = normalized.split("").map((c) => c + c).join("");
    }

    if (normalized.length !== 6) return "0,0,0";

    const bigint = parseInt(normalized, 16);
    if (Number.isNaN(bigint)) return "0,0,0";

    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  }

  getBackgroundCss() {
    if (!this.config.showBackground) {
      return "transparent";
    }

    const bgRgb = this.hexToRgb(this.config.background);
    const alpha = Math.max(0, Math.min(1, this.config.backgroundOpacity));
    return `rgba(${bgRgb}, ${alpha})`;
  }

  getTitleSizePx() {
    switch (this.config.titleSize) {
      case "small":
        return 14;
      case "large":
        return 18;
      default:
        return 16;
    }
  }

  getMobileTitleSizePx() {
    switch (this.config.titleSize) {
      case "small":
        return 14;
      case "large":
        return 17;
      default:
        return 16;
    }
  }

  getDescSizePx() {
    switch (this.config.descSize) {
      case "small":
        return 12;
      case "large":
        return 14;
      default:
        return 12.5;
    }
  }

  getMobileDescSizePx() {
    switch (this.config.descSize) {
      case "small":
        return 12;
      case "large":
        return 14;
      default:
        return 13;
    }
  }

  getCategorySizePx() {
    switch (this.config.categorySize) {
      case "small":
        return 9;
      default:
        return 10;
    }
  }

  getMobileCategorySizePx() {
    switch (this.config.categorySize) {
      case "small":
        return 8;
      default:
        return 9;
    }
  }

  getCardShadow() {
    return this.config.showShadow
      ? "0 10px 30px rgba(0,0,0,0.16)"
      : "none";
  }

  getCardHoverShadow() {
    return this.config.showShadow
      ? "0 20px 44px rgba(0,0,0,0.30)"
      : "none";
  }

  getGhostShadow() {
    return this.config.showShadow
      ? "0 10px 30px rgba(0,0,0,0.16)"
      : "none";
  }

  getContentAlignmentCss() {
    return this.config.textAlign === "center"
      ? `
        text-align: center;
        align-items: center;
      `
      : `
        text-align: left;
        align-items: flex-start;
      `;
  }

  setupAutoHeight() {
    const target = this.shadowRoot.querySelector(".pfg-shell");
    if (!target) return;

    if (this._resizeObserver) this._resizeObserver.disconnect();

    const sendHeight = () => {
      const shell = this.shadowRoot.querySelector(".pfg-shell");
      if (!shell) return;
      const height = Math.ceil(shell.scrollHeight);

      try {
        window.parent.postMessage({ type: "resize", height }, "*");
      } catch (e) {}

      try {
        this.style.height = `${height}px`;
      } catch (e) {}
    };

    this._resizeObserver = new ResizeObserver(() => sendHeight());
    this._resizeObserver.observe(target);
    this._sendHeight = sendHeight;

    requestAnimationFrame(sendHeight);
    setTimeout(sendHeight, 200);
    setTimeout(sendHeight, 600);
    setTimeout(sendHeight, 1200);
  }

  getStyles() {
    return `
      <style>
        * { box-sizing: border-box; }

        :host {
          display: block;
          width: 100%;
          font-family: ${this.config.fontFamily};
          color: ${this.settings.textColor};
        }

        .pfg-shell {
          width: 100%;
          padding: 28px 16px;
          background: ${this.getBackgroundCss()};
        }

        .pfg-inner {
          max-width: 1600px;
          margin: 0 auto;
        }

        .pfg-toolbar-wrap {
          position: relative;
        }

        .pfg-toolbar {
          display: flex;
          justify-content: center;
          margin-bottom: 28px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .pfg-toolbar::-webkit-scrollbar {
          display: none;
        }

        .pfg-filters {
          display: inline-flex;
          gap: 12px;
          min-width: max-content;
          padding: 4px 2px;
        }

        .pfg-filter {
          appearance: none;
          border: 1px solid ${this.config.pillBorder};
          background: ${this.config.pillBg};
          color: ${this.config.pillText};
          padding: 12px 22px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
          cursor: pointer;
          transition: all 0.22s ease;
          white-space: nowrap;
          font-family: inherit;
          flex: 0 0 auto;
        }

        .pfg-filter:hover {
          transform: translateY(-1px);
        }

        .pfg-filter.active {
          background: ${this.config.pillActiveBg};
          color: ${this.config.pillActiveText};
          border-color: ${this.config.pillActiveBg};
          box-shadow: none;
        }

        .pfg-grid {
          display: grid;
          grid-template-columns: repeat(${this.config.columns}, minmax(0, 1fr));
          gap: ${this.config.gap}px;
        }

        .pfg-card {
          position: relative;
          aspect-ratio: 1 / 1;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #111217 0%, #0c0d12 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: ${this.config.radius}px;
          overflow: hidden;
          transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
          box-shadow: ${this.getCardShadow()};
          cursor: pointer;
        }

        .pfg-card:hover {
          transform: ${this.config.hoverEffect ? "translateY(-6px)" : "none"};
          border-color: ${this.config.hoverEffect ? "rgba(77,141,255,0.35)" : "rgba(255,255,255,0.08)"};
          box-shadow: ${this.getCardHoverShadow()};
        }

        .pfg-image-wrap {
          position: relative;
          flex: 0 0 58%;
          min-height: 0;
          overflow: hidden;
          background: #0f1014;
        }

        .pfg-image-wrap::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 42%;
          background: linear-gradient(
            to bottom,
            rgba(16,17,23,0) 0%,
            rgba(16,17,23,0.18) 42%,
            rgba(16,17,23,0.88) 100%
          );
          pointer-events: none;
          z-index: 1;
        }

        .pfg-image {
          width: 100%;
          height: 100%;
          object-fit: ${this.config.imageFit};
          display: block;
          transition: transform 0.5s ease;
          background: #0f1014;
        }

        .pfg-card:hover .pfg-image {
          transform: ${this.config.hoverEffect ? "scale(1.06)" : "none"};
        }

        .pfg-card-body {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          background: ${this.config.cardPanelBg};
          padding: 16px 16px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .pfg-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100%;
          ${this.getContentAlignmentCss()}
        }

        .pfg-category {
          display: inline-block;
          margin: 0;
          color: ${this.config.categoryColor};
          font-size: ${this.getCategorySizePx()}px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .pfg-title {
          margin: 0;
          font-size: ${this.getTitleSizePx()}px;
          line-height: 1.12;
          font-weight: 800;
          letter-spacing: 0em;
          color: ${this.config.titleColor};
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 0;
          max-height: calc(1.12em * 2);
          width: 100%;
        }

        .pfg-description {
          position: relative;
          margin: 2px 0 0;
          color: ${this.config.descColor};
          font-size: ${this.getDescSizePx()}px;
          line-height: 1.48;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 0;
          max-height: calc(1.48em * 2);
          width: 100%;
          max-width: 100%;
          padding-right: ${this.config.textAlign === "center" ? "0" : "2px"};
          text-align: ${this.config.textAlign};
        }

        .pfg-description::after {
          content: ${this.config.textAlign === "center" ? "none" : '""'};
          position: absolute;
          inset: 0 0 0 auto;
          width: 24%;
          background: linear-gradient(
            to right,
            rgba(16,17,23,0) 0%,
            rgba(16,17,23,0.14) 46%,
            rgba(16,17,23,0.95) 100%
          );
          pointer-events: none;
        }

        .pfg-mobile-cta {
          display: none;
        }

        .pfg-empty {
          grid-column: 1 / -1;
          position: relative;
          min-height: 340px;
          padding: 32px 24px;
          border: 1px dashed rgba(255,255,255,0.16);
          border-radius: ${this.config.radius}px;
          background: ${this.config.showBackground ? "rgba(255,255,255,0.02)" : "transparent"};
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pfgEmptyFadeUp 0.8s ease both;
        }

        .pfg-empty::before {
          content: "";
          position: absolute;
          inset: 0;
          background: none;
          pointer-events: none;
        }

        .pfg-empty-copy {
          position: relative;
          z-index: 3;
          max-width: 560px;
          text-align: center;
          padding: 26px 24px;
          border-radius: 20px;
          background: ${this.config.showBackground ? "rgba(8,10,14,0.66)" : "rgba(8,10,14,0.18)"};
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(10px);
        }

        .pfg-empty-copy strong {
          display: block;
          font-size: 22px;
          line-height: 1.08;
          color: #ffffff;
          margin-bottom: 10px;
          letter-spacing: -0.03em;
        }

        .pfg-empty-copy span {
          display: block;
          font-size: 14px;
          line-height: 1.6;
          color: ${this.settings.mutedText};
        }

        .pfg-empty-ghosts {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 22px;
          padding: 28px;
          pointer-events: none;
          z-index: 1;
        }

        .pfg-empty-ghost-card {
          width: min(23vw, 220px);
          height: min(23vw, 220px);
          min-width: 170px;
          min-height: 170px;
          border-radius: ${this.config.radius}px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.07);
          background: ${
            this.config.showBackground
              ? "linear-gradient(180deg, #111217 0%, #0c0d12 100%)"
              : "linear-gradient(180deg, rgba(17,18,23,0.12) 0%, rgba(12,13,18,0.06) 100%)"
          };
          box-shadow: ${this.getGhostShadow()};
          opacity: 0.55;
          transform: translateY(0);
          animation: pfgGhostFloat 5.2s ease-in-out infinite;
        }

        .pfg-empty-ghost-card:nth-child(2) {
          opacity: 0.82;
          transform: scale(1.02);
          animation-delay: 0.5s;
        }

        .pfg-empty-ghost-card:nth-child(3) {
          animation-delay: 1s;
        }

        .pfg-empty-ghost-image {
          position: relative;
          height: 58%;
          background: linear-gradient(
            110deg,
            rgba(255,255,255,0.04) 8%,
            rgba(255,255,255,0.10) 18%,
            rgba(255,255,255,0.04) 33%
          );
          background-size: 200% 100%;
          animation: pfgShimmer 2.4s linear infinite;
        }

        .pfg-empty-ghost-image::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 42%;
          background: linear-gradient(
            to bottom,
            rgba(16,17,23,0) 0%,
            rgba(16,17,23,0.18) 42%,
            rgba(16,17,23,0.88) 100%
          );
        }

        .pfg-empty-ghost-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pfg-empty-ghost-line {
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(
            110deg,
            rgba(255,255,255,0.04) 8%,
            rgba(255,255,255,0.10) 18%,
            rgba(255,255,255,0.04) 33%
          );
          background-size: 200% 100%;
          animation: pfgShimmer 2.4s linear infinite;
        }

        .pfg-empty-ghost-line.short {
          width: 38%;
        }

        .pfg-empty-ghost-line.title {
          width: 72%;
          height: 14px;
        }

        .pfg-empty-ghost-line.text {
          width: 88%;
        }

        .pfg-empty-ghost-line.text2 {
          width: 64%;
        }

        @keyframes pfgEmptyFadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pfgGhostFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes pfgShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .pfg-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.78);
          backdrop-filter: blur(10px);
          display: none;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 9999;
        }

        .pfg-modal-overlay.active {
          display: flex;
        }

        .pfg-modal {
          width: min(1120px, 100%);
          max-height: 92vh;
          overflow: auto;
          border-radius: 28px;
          background: ${this.config.modalBg};
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 30px 90px rgba(0,0,0,0.42);
          padding: 20px;
          position: relative;
        }

        .pfg-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(20,20,24,0.78);
          color: #ffffff;
          cursor: pointer;
          font-size: 20px;
          z-index: 10;
          backdrop-filter: blur(8px);
        }

        .pfg-modal-image {
          width: 100%;
          height: min(42vh, 460px);
          object-fit: ${this.config.imageFit};
          display: block;
          border-radius: ${this.config.imageRadius}px;
          margin-top: 12px;
          background: #111217;
        }

        .pfg-modal-content {
          padding: 18px 4px 6px;
        }

        .pfg-modal-category {
          color: ${this.config.categoryColor};
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          margin-bottom: 10px;
          text-align: ${this.config.textAlign};
        }

        .pfg-modal-title {
          margin: 0 0 12px;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 0.98;
          font-weight: 800;
          letter-spacing: -0.05em;
          text-align: ${this.config.textAlign};
          color: ${this.config.modalTitleColor};
        }

        .pfg-modal-description {
          margin: 0;
          color: ${this.config.modalDescColor};
          font-size: 15px;
          line-height: 1.65;
          max-width: 100%;
          text-align: ${this.config.textAlign};
        }

        .pfg-thumbs {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          margin-top: 18px;
          padding-bottom: 4px;
          scrollbar-width: none;
        }

        .pfg-thumbs::-webkit-scrollbar {
          display: none;
        }

        .pfg-thumb {
          width: 88px;
          height: 88px;
          border-radius: 14px;
          object-fit: cover;
          flex: 0 0 auto;
          border: 2px solid transparent;
          cursor: pointer;
          opacity: 0.72;
          transition: opacity 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }

        .pfg-thumb:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        .pfg-thumb.active {
          opacity: 1;
          border-color: ${this.config.accent};
        }

        @media (max-width: 1400px) {
          .pfg-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 22px;
          }
        }

        @media (max-width: 1024px) {
          .pfg-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 767px) {
          .pfg-shell {
            padding: 12px 0 22px;
          }

          .pfg-inner {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
          }

          .pfg-toolbar-wrap {
            position: relative;
            margin-bottom: 16px;
            padding: 0 10px;
            overflow: hidden;
          }

          .pfg-toolbar-wrap::after {
            content: "";
            position: absolute;
            top: 0;
            right: 10px;
            width: 28px;
            height: 100%;
            pointer-events: none;
            z-index: 5;
            background: ${this.config.showBackground
              ? "linear-gradient(90deg, rgba(5,5,5,0) 0%, rgba(5,5,5,1) 100%)"
              : "none"};
          }

          .pfg-toolbar {
            justify-content: flex-start;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .pfg-toolbar::-webkit-scrollbar {
            display: none;
          }

          .pfg-filters {
            gap: 8px;
            padding: 2px 40px 2px 0;
            min-width: max-content;
          }

          .pfg-filter {
            padding: 9px 14px;
            font-size: 12px;
            min-height: 38px;
            border-radius: 999px;
            background: ${this.config.pillBg};
            border: 1px solid ${this.config.pillBorder};
            color: ${this.config.pillText};
          }

          .pfg-filter.active {
            background: ${this.config.pillActiveBg};
            color: ${this.config.pillActiveText};
            border-color: ${this.config.pillActiveBg};
          }

          .pfg-grid {
            grid-template-columns: 1fr;
            gap: ${this.config.gap}px;
            width: 100%;
            margin: 0 auto;
            padding: 0;
          }

          .pfg-card {
            aspect-ratio: auto;
            width: calc(100% - 34px);
            max-width: ${this.config.cardWidth}px;
            margin: 0 auto;
            border-radius: ${this.config.radius}px;
            overflow: hidden;
            background: linear-gradient(180deg, #111217 0%, #0c0d12 100%);
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: ${this.config.showShadow ? "0 12px 30px rgba(0,0,0,0.18)" : "none"};
          }

          .pfg-image-wrap {
            width: 100%;
            height: 150px;
            flex: none;
          }

          .pfg-image-wrap::after {
            height: 38%;
          }

          .pfg-image {
            object-fit: ${this.config.imageFit};
          }

          .pfg-card-body {
            padding: 14px 14px 16px;
            background: ${this.config.cardPanelBg};
          }

          .pfg-content {
            gap: 8px;
            ${this.getContentAlignmentCss()}
          }

          .pfg-category {
            font-size: ${this.getMobileCategorySizePx()}px;
            letter-spacing: 0.13em;
            color: ${this.config.categoryColor};
            text-align: ${this.config.textAlign};
            width: 100%;
          }

          .pfg-title {
            font-size: ${this.getMobileTitleSizePx()}px;
            line-height: 1.15;
            max-height: unset;
            color: ${this.config.titleColor};
            text-align: ${this.config.textAlign};
            width: 100%;
          }

          .pfg-description {
            position: relative;
            font-size: ${this.getMobileDescSizePx()}px;
            line-height: 1.45;
            -webkit-line-clamp: 2;
            max-height: unset;
            padding-right: ${this.config.textAlign === "center" ? "0" : "4px"};
            width: 100%;
            color: ${this.config.descColor};
            text-align: ${this.config.textAlign};
          }

          .pfg-description::after {
            content: ${this.config.textAlign === "center" ? "none" : '""'};
            position: absolute;
            top: 0;
            right: 0;
            width: 28%;
            height: 100%;
            background: linear-gradient(
              90deg,
              rgba(16,17,23,0) 0%,
              rgba(16,17,23,0.18) 42%,
              rgba(16,17,23,0.96) 100%
            );
            pointer-events: none;
          }

          .pfg-empty {
            min-height: 300px;
            padding: 22px 16px;
            background: ${this.config.showBackground ? "rgba(255,255,255,0.02)" : "transparent"};
            border-radius: ${this.config.radius}px;
          }

          .pfg-empty-ghosts {
            gap: 10px;
            padding: 18px;
          }

          .pfg-empty-ghost-card {
            width: 120px;
            height: 160px;
            min-width: 120px;
            min-height: 160px;
            border-radius: ${this.config.radius}px;
            background: ${
              this.config.showBackground
                ? "linear-gradient(180deg, #111217 0%, #0c0d12 100%)"
                : "linear-gradient(180deg, rgba(17,18,23,0.12) 0%, rgba(12,13,18,0.06) 100%)"
            };
          }

          .pfg-empty-copy {
            padding: 20px 16px;
            background: ${this.config.showBackground ? "rgba(8,10,14,0.66)" : "rgba(8,10,14,0.18)"};
          }

          .pfg-empty-copy strong {
            font-size: 18px;
          }

          .pfg-empty-copy span {
            font-size: 13px;
            line-height: 1.55;
          }

          .pfg-mobile-cta {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            color: ${this.config.accent};
          }

          .pfg-modal-overlay {
            align-items: center;
            justify-content: center;
            padding: 14px;
          }

          .pfg-modal {
            width: 100%;
            max-width: 92vw;
            max-height: 88vh;
            padding: 14px;
            border-radius: 22px;
            background: ${this.config.modalBg};
          }

          .pfg-close {
            width: 36px;
            height: 36px;
            font-size: 18px;
          }

          .pfg-modal-image {
            height: min(34vh, 320px);
            border-radius: ${this.config.imageRadius}px;
            margin-top: 8px;
            object-fit: ${this.config.imageFit};
          }

          .pfg-modal-content {
            padding: 16px 2px 8px;
          }

          .pfg-modal-category {
            font-size: 10px;
            margin-bottom: 8px;
            color: ${this.config.categoryColor};
            text-align: ${this.config.textAlign};
          }

          .pfg-modal-title {
            font-size: 24px;
            margin-bottom: 10px;
            color: ${this.config.modalTitleColor};
            text-align: ${this.config.textAlign};
          }

          .pfg-modal-description {
            font-size: 13px;
            line-height: 1.5;
            color: ${this.config.modalDescColor};
            text-align: ${this.config.textAlign};
          }

          .pfg-thumb {
            width: 64px;
            height: 64px;
            border-radius: 10px;
          }
        }
      </style>
    `;
  }

  getTemplate() {
    return `
      ${this.getStyles()}
      <section class="pfg-shell">
        <div class="pfg-inner">
          <div class="pfg-toolbar-wrap">
            <div class="pfg-toolbar">
              <div class="pfg-filters" id="filters"></div>
            </div>
          </div>
          <div class="pfg-grid" id="grid"></div>
        </div>
      </section>

      <div class="pfg-modal-overlay" id="modalOverlay">
        <div class="pfg-modal">
          <button class="pfg-close" id="modalClose" aria-label="Close modal">×</button>
          <img class="pfg-modal-image" id="modalMainImage" src="" alt="" />
          <div class="pfg-modal-content">
            <div class="pfg-modal-category" id="modalCategory"></div>
            <h2 class="pfg-modal-title" id="modalTitle"></h2>
            <p class="pfg-modal-description" id="modalDescription"></p>
            <div class="pfg-thumbs" id="modalThumbs"></div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    this.shadowRoot.innerHTML = this.getTemplate();

    const filtersEl = this.shadowRoot.getElementById("filters");
    filtersEl.innerHTML = this.filters.map((filter) => `
      <button class="pfg-filter ${filter === this.activeFilter ? "active" : ""}" data-filter="${filter}">
        ${filter}
      </button>
    `).join("");
  }

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    this.shadowRoot.addEventListener("click", (event) => {
      const filterBtn = event.target.closest(".pfg-filter");
      const card = event.target.closest(".pfg-card");
      const thumb = event.target.closest(".pfg-thumb");
      const closeBtn = event.target.closest("#modalClose");

      if (filterBtn) {
        this.activeFilter = filterBtn.dataset.filter;
        this.shadowRoot.querySelectorAll(".pfg-filter").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.filter === this.activeFilter);
        });
        this.renderCards();
        return;
      }

      if (card) {
        const id = card.dataset.id;
        const project = this.projects.find((p) => String(p.id) === String(id));
        if (project) this.openModal(project);
        return;
      }

      if (thumb) {
        this.activeImageIndex = Number(thumb.dataset.index);
        this.renderModalGallery();
        return;
      }

      if (closeBtn) {
        this.closeModal();
        return;
      }

      if (event.target.id === "modalOverlay") {
        this.closeModal();
      }
    });

    this.shadowRoot.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeModal();
    });
  }

  renderCards() {
    const grid = this.shadowRoot.getElementById("grid");

    const visibleProjects = this.projects
      .filter((project) => project.visible !== false)
      .filter((project) =>
        this.activeFilter === "All" ? true : project.category === this.activeFilter
      )
      .sort((a, b) => {
        const ao = typeof a.order === "number" ? a.order : 0;
        const bo = typeof b.order === "number" ? b.order : 0;
        return ao - bo;
      });

    if (!visibleProjects.length) {
      grid.innerHTML = `
        <div class="pfg-empty">
          <div class="pfg-empty-ghosts">
            <div class="pfg-empty-ghost-card">
              <div class="pfg-empty-ghost-image"></div>
              <div class="pfg-empty-ghost-body">
                <div class="pfg-empty-ghost-line short"></div>
                <div class="pfg-empty-ghost-line title"></div>
                <div class="pfg-empty-ghost-line text"></div>
                <div class="pfg-empty-ghost-line text2"></div>
              </div>
            </div>

            <div class="pfg-empty-ghost-card">
              <div class="pfg-empty-ghost-image"></div>
              <div class="pfg-empty-ghost-body">
                <div class="pfg-empty-ghost-line short"></div>
                <div class="pfg-empty-ghost-line title"></div>
                <div class="pfg-empty-ghost-line text"></div>
                <div class="pfg-empty-ghost-line text2"></div>
              </div>
            </div>

            <div class="pfg-empty-ghost-card">
              <div class="pfg-empty-ghost-image"></div>
              <div class="pfg-empty-ghost-body">
                <div class="pfg-empty-ghost-line short"></div>
                <div class="pfg-empty-ghost-line title"></div>
                <div class="pfg-empty-ghost-line text"></div>
                <div class="pfg-empty-ghost-line text2"></div>
              </div>
            </div>
          </div>

          <div class="pfg-empty-copy">
            <strong>Your portfolio gallery is ready.</strong>
            <span>Add your projects to your collection and see your work take shape here.</span>
          </div>
        </div>
      `;
      if (this._sendHeight) this._sendHeight();
      return;
    }

    grid.innerHTML = visibleProjects.map((project) => `
      <article class="pfg-card" data-id="${this.escapeHtml(String(project.id))}">
        <div class="pfg-image-wrap">
          <img class="pfg-image" src="${this.escapeHtml(project.coverImage)}" alt="${this.escapeHtml(project.title)}">
        </div>
        <div class="pfg-card-body">
          <div class="pfg-content">
            ${this.config.showCategory
              ? `<div class="pfg-category">${this.escapeHtml(project.category)}</div>`
              : ``}
            <h3 class="pfg-title">${this.escapeHtml(project.title)}</h3>
            ${this.config.showDescription
              ? `<p class="pfg-description">${this.escapeHtml(this.getPreviewText(project.description, 88))}</p>`
              : ``}
            <div class="pfg-mobile-cta">View project →</div>
          </div>
        </div>
      </article>
    `).join("");

    if (this._sendHeight) this._sendHeight();
  }

  openModal(project) {
    this.activeProject = project;
    this.activeImageIndex = 0;
    this.shadowRoot.getElementById("modalOverlay").classList.add("active");
    this.renderModalGallery();
    if (this._sendHeight) this._sendHeight();
  }

  closeModal() {
    this.shadowRoot.getElementById("modalOverlay").classList.remove("active");
    if (this._sendHeight) this._sendHeight();
  }

  renderModalGallery() {
    if (!this.activeProject) return;

    const project = this.activeProject;
    const mainImage = this.shadowRoot.getElementById("modalMainImage");
    const modalCategory = this.shadowRoot.getElementById("modalCategory");
    const modalTitle = this.shadowRoot.getElementById("modalTitle");
    const modalDescription = this.shadowRoot.getElementById("modalDescription");
    const modalThumbs = this.shadowRoot.getElementById("modalThumbs");

    const currentImage =
      (Array.isArray(project.images) && project.images[this.activeImageIndex]) ||
      project.coverImage ||
      "";

    mainImage.src = currentImage;
    mainImage.alt = project.title;

    modalCategory.textContent = project.category;
    modalTitle.textContent = project.title;
    modalDescription.textContent = project.description;

    modalThumbs.innerHTML = (project.images || []).map((img, index) => `
      <img
        class="pfg-thumb ${index === this.activeImageIndex ? "active" : ""}"
        src="${this.escapeHtml(img)}"
        data-index="${index}"
        alt="${this.escapeHtml(project.title)} image ${index + 1}"
      />
    `).join("");

    if (this._sendHeight) this._sendHeight();
  }

  escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

customElements.define("pro-filter-gallery", ProFilterGallery);