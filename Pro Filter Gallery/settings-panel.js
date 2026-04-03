document.addEventListener("DOMContentLoaded", () => {

  // ─────────────────────────────────────────────────────────────────────────
  // Defaults
  // ─────────────────────────────────────────────────────────────────────────

  const DEFAULT_DESIGN = {
    columns: 3,
    cardGap: 16,
    cardRadius: 20,
    cardBackground: "#111722",
    textPanelStyle: "fade",
    overlayStrength: 72,
    showCategory: true,
    titleSize: 16,
    metaSize: 12,
    showFilters: true,
    accentColor: "#7c9cff",
    enableModal: true,
    modalImageFit: "cover",
    showGalleryCount: true
  };

  const DEFAULT_STATE = {
    design: { ...DEFAULT_DESIGN },
    projects: [
      {
        id: generateId(),
        title: "Studio Direction",
        category: "Branding",
        description: "A premium identity system built around texture, restraint, and luxury positioning.",
        coverImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
        galleryImages: [
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"
        ],
        visible: true
      },
      {
        id: generateId(),
        title: "Luxury Commerce",
        category: "Web",
        description: "A high-end e-commerce interface focused on clarity, hierarchy, and conversion-led design.",
        coverImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
        galleryImages: [
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
        ],
        visible: true
      },
      {
        id: generateId(),
        title: "Motion Frames",
        category: "Motion",
        description: "Campaign visuals exploring rhythm, contrast, and layered digital atmosphere.",
        coverImage: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80",
        galleryImages: [
          "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80"
        ],
        visible: false
      }
    ]
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Runtime state
  // ─────────────────────────────────────────────────────────────────────────

  let state = structuredClone(DEFAULT_STATE);
  let selectedProjectId = null;
  let activeView = "hub";
  let saveTimeout = null;
  let _widgetStateReceived = false; // tracks whether widget replied to GET_STATE

  // ─────────────────────────────────────────────────────────────────────────
  // postMessage bridge — replaces Wix.getProp / Wix.setProp
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send a single prop update to the widget.
   * The widget's _bindSettingsMessages() listener picks this up and calls
   * this.setAttribute(key, value), which triggers attributeChangedCallback.
   */
  function setProp(key, value) {
    window.parent.postMessage(
      { type: "SET_PROP", key, value: String(value) },
      "*"
    );
  }

  /**
   * Send the full state to the widget in one batch.
   * More efficient than 15 individual setProp calls.
   */
  function setAllProps(props) {
    window.parent.postMessage(
      { type: "SET_ALL_PROPS", props },
      "*"
    );
  }

  /**
   * Ask the widget to send its current state back.
   * The widget replies with { type: "WIDGET_STATE", state: {...} }.
   * We wait up to 600ms; if no reply, fall back to DEFAULT_STATE.
   */
  function requestWidgetState() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Widget didn't reply in time — use defaults
        resolve(null);
      }, 600);

      const handler = (event) => {
        if (event.data?.type === "WIDGET_STATE") {
          clearTimeout(timeout);
          window.removeEventListener("message", handler);
          resolve(event.data.state);
        }
      };

      window.addEventListener("message", handler);
      window.parent.postMessage({ type: "GET_STATE" }, "*");
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────────────────

  init();

  async function init() {
    await loadStateFromWidget();

    wireNavigation();
    wireActions();
    wireEditorFields();
    wireDesignControls();
    wireResponsivePreview();
    setView(getInitialView());
    renderAll();
  }

  /**
   * Replaces bootstrapWixState() + loadStateFromWixProps().
   * Asks the widget for its current state via postMessage.
   * If the widget has no saved state yet, pushes the defaults to it.
   */
  async function loadStateFromWidget() {
    const widgetState = await requestWidgetState();

    if (!widgetState) {
      // Widget had nothing — use defaults and push them to it
      state = structuredClone(DEFAULT_STATE);
      _pushStateToWidget(state, { bootstrap: true });
      return;
    }

    // Hydrate local state from what the widget reported back
    state = structuredClone(DEFAULT_STATE);

    // Projects — widget stores them as normalised objects
    if (Array.isArray(widgetState.projects) && widgetState.projects.length) {
      state.projects = widgetState.projects.map(normalizeProject);
    }

    // Design config — map widget config keys → panel design keys
    const d = state.design;
    const c = widgetState; // shorthand for config fields

    if (c.accent)           d.accentColor     = c.accent;
    if (c.columns)          d.columns         = Number(c.columns)         || DEFAULT_DESIGN.columns;
    if (c.gap)              d.cardGap         = Number(c.gap)             || DEFAULT_DESIGN.cardGap;
    if (c.radius)           d.cardRadius      = Number(c.radius)          || DEFAULT_DESIGN.cardRadius;
    if (c.cardPanelBg)      d.cardBackground  = c.cardPanelBg;
    if (c.textPanelStyle)   d.textPanelStyle  = c.textPanelStyle;
    if (c.overlayStrength != null) d.overlayStrength = Number(c.overlayStrength);
    if (c.showCategory != null)    d.showCategory    = Boolean(c.showCategory);
    if (c.showFilters  != null)    d.showFilters     = Boolean(c.showFilters);
    if (c.enableModal  != null)    d.enableModal     = Boolean(c.enableModal);
    if (c.modalImageFit)    d.modalImageFit   = c.modalImageFit;
    if (c.titleSize)        d.titleSize       = mapPresetToSliderValue(c.titleSize);
    if (c.descSize)         d.metaSize        = mapPresetToSliderValue(c.descSize);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Saving — replaces syncStateToWix
  // ─────────────────────────────────────────────────────────────────────────

  function saveState() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      _pushStateToWidget(state);
    }, 300); // 300ms debounce — same as original
  }

  /**
   * Converts the panel's internal state format into the widget's attribute
   * format and sends the whole lot in a single SET_ALL_PROPS message.
   *
   * @param {object}  sourceState  - panel state object to push
   * @param {object}  options
   * @param {boolean} options.bootstrap - if true, silently ignore size errors
   */
  function _pushStateToWidget(sourceState = state, options = {}) {
    const { bootstrap = false } = options;

    const projectsJson = JSON.stringify(sourceState.projects);

    if (projectsJson.length > 40000) {
      console.warn("[ProFilterGallery] Projects data too large for widget props.");
      if (!bootstrap) showToast("Projects are too large to save. Use image URLs only.");
      return;
    }

    const props = {
      projects:       projectsJson,
      accent:         String(sourceState.design.accentColor   || "#7c9cff"),
      columns:        String(sourceState.design.columns        ?? 3),
      gap:            String(sourceState.design.cardGap        ?? 16),
      radius:         String(sourceState.design.cardRadius     ?? 20),
      cardpanelbg:    String(sourceState.design.cardBackground || "#111722"),
      textpanelstyle: String(sourceState.design.textPanelStyle || "fade"),
      overlaystrength:String(sourceState.design.overlayStrength ?? 72),
      showcategory:   String(!!sourceState.design.showCategory),
      showfilters:    String(!!sourceState.design.showFilters),
      enablemodal:    String(!!sourceState.design.enableModal),
      titlesize:      mapSliderToSizePreset(sourceState.design.titleSize),
      descsize:       mapSliderToSizePreset(sourceState.design.metaSize),
      categorysize:   Number(sourceState.design.metaSize) <= 10 ? "small" : "medium",
      modalimagefit:  String(sourceState.design.modalImageFit  || "cover")
    };

    setAllProps(props);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Project helpers
  // ─────────────────────────────────────────────────────────────────────────

  function ensureSelectedProject() {
    if (!state.projects.length) { selectedProjectId = null; return; }
    const exists = state.projects.some(p => p.id === selectedProjectId);
    if (!selectedProjectId || !exists) selectedProjectId = state.projects[0].id;
  }

  function getInitialView() {
    const active = document.querySelector(".view.active");
    if (active?.id === "view-hub")     return "hub";
    if (active?.id === "view-design")  return "design";
    if (active?.id === "view-content") return "content";
    return "hub";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────

  function wireNavigation() {
    document.querySelectorAll("[data-view-target]").forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.viewTarget));
    });
    document.querySelectorAll("[data-go]").forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.go));
    });
  }

  function setView(view) {
    activeView = view;

    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".rail-btn").forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.viewTarget === view) btn.classList.add("active");
    });

    document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.viewTarget === view) btn.classList.add("active");
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  function wireActions() {
    byId("newProjectBtn")?.addEventListener("click", createProject);
    byId("sidebarNewProjectBtn")?.addEventListener("click", createProject);
    byId("deleteProjectBtn")?.addEventListener("click", deleteProject);
    byId("duplicateProjectBtn")?.addEventListener("click", duplicateProject);
    byId("moveUpBtn")?.addEventListener("click", () => moveProject(-1));
    byId("moveDownBtn")?.addEventListener("click", () => moveProject(1));
    byId("projectSearch")?.addEventListener("input", renderProjects);

    byId("coverUploadBtn")?.addEventListener("click", () => {
      showToast("For marketplace-safe use, please paste an image URL instead of uploading a file.");
    });
    byId("galleryUploadBtn")?.addEventListener("click", () => {
      showToast("For marketplace-safe use, please paste image URLs instead of uploading files.");
    });

    byId("coverImageUpload")?.addEventListener("change", handleCoverUpload);
    byId("galleryImageUpload")?.addEventListener("change", handleGalleryUpload);

    byId("addGalleryUrlBtn")?.addEventListener("click", addGalleryUrl);
    byId("importCsvBtn")?.addEventListener("click", () => byId("csvFileInput")?.click());
    byId("csvFileInput")?.addEventListener("change", importCSV);
    byId("exportTemplateBtn")?.addEventListener("click", exportCSVTemplate);
    byId("downloadCsvTemplateBtn")?.addEventListener("click", exportCSVTemplate);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Editor fields
  // ─────────────────────────────────────────────────────────────────────────

  function wireEditorFields() {
    byId("projectTitle")?.addEventListener("input", e => {
      const project = getSelectedProject();
      if (!project) return;
      project.title = e.target.value;
      commit();
    });

    byId("projectCategory")?.addEventListener("input", e => {
      const project = getSelectedProject();
      if (!project) return;
      project.category = e.target.value;
      commit();
    });

    byId("projectModalImageFit")?.addEventListener("change", e => {
      const project = getSelectedProject();
      if (!project) return;
      project.modalImageFit = e.target.value;
      commit();
    });

    byId("projectDescription")?.addEventListener("input", e => {
      const project = getSelectedProject();
      if (!project) return;
      project.description = e.target.value;
      commit();
    });

    byId("projectVisible")?.addEventListener("change", e => {
      const project = getSelectedProject();
      if (!project) return;
      project.visible = e.target.checked;
      commit();
    });

    byId("coverImageUrl")?.addEventListener("input", e => {
      const project = getSelectedProject();
      if (!project) return;
      project.coverImage = e.target.value.trim();
      saveState();
      renderCoverPreview();
      renderProjects();
      renderContentSnapshot();
      renderDesignPreview();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Design controls
  // ─────────────────────────────────────────────────────────────────────────

  function wireDesignControls() {
    bindDesignControl("layoutColumns",  "columns",       "value",   Number);
    bindDesignControl("cardGap",        "cardGap",       "value",   Number);
    bindDesignControl("cardRadius",     "cardRadius",    "value",   Number);
    bindDesignControl("cardBackground", "cardBackground","value",   v => v);
    bindDesignControl("textPanelStyle", "textPanelStyle","value",   v => v);
    bindDesignControl("overlayStrength","overlayStrength","value",  Number);
    bindDesignControl("showCategory",   "showCategory",  "checked", v => v);
    bindDesignControl("titleSize",      "titleSize",     "value",   Number);
    bindDesignControl("metaSize",       "metaSize",      "value",   Number);
    bindDesignControl("showFilters",    "showFilters",   "checked", v => v);
    bindDesignControl("accentColor",    "accentColor",   "value",   v => v);
    bindDesignControl("enableModal",    "enableModal",   "checked", v => v);
    bindDesignControl("modalImageFit",  "modalImageFit", "value",   v => v);
    bindDesignControl("showGalleryCount","showGalleryCount","checked",v => v);
  }

  function bindDesignControl(id, key, prop, transform) {
    const el = byId(id);
    if (!el) return;

    const handler = () => {
      state.design[key] = transform(el[prop]);
      saveState();
      renderDesignControlsFromState();
      renderDesignPreview();
    };

    if (el.type === "checkbox" || el.tagName === "SELECT") {
      el.addEventListener("change", handler);
    } else {
      el.addEventListener("input", handler);
    }
  }

  function commit(render = true) {
    saveState();
    if (render) renderAll();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Responsive preview
  // ─────────────────────────────────────────────────────────────────────────

  function wireResponsivePreview() {
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderDesignPreview(), 120);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Project CRUD
  // ─────────────────────────────────────────────────────────────────────────

  function createProject() {
    const project = normalizeProject({
      id: generateId(),
      title: `New Project ${state.projects.length + 1}`,
      category: "Uncategorised",
      description: "",
      coverImage: "",
      galleryImages: [],
      modalImageFit: "",
      visible: true
    });
    state.projects.unshift(project);
    selectedProjectId = project.id;
    saveState();
    renderAll();
    setView("content");
  }

  function deleteProject() {
    if (!selectedProjectId) return;
    state.projects = state.projects.filter(p => p.id !== selectedProjectId);
    ensureSelectedProject();
    saveState();
    renderAll();
  }

  function duplicateProject() {
    const p = getSelectedProject();
    if (!p) return;
    const copy = normalizeProject({ ...p, id: generateId(), title: `${p.title} Copy`, galleryImages: [...p.galleryImages] });
    const index = state.projects.findIndex(x => x.id === p.id);
    state.projects.splice(index + 1, 0, copy);
    selectedProjectId = copy.id;
    saveState();
    renderAll();
  }

  function moveProject(dir) {
    const index = state.projects.findIndex(p => p.id === selectedProjectId);
    if (index === -1) return;
    const target = index + dir;
    if (target < 0 || target >= state.projects.length) return;
    [state.projects[index], state.projects[target]] = [state.projects[target], state.projects[index]];
    saveState();
    renderAll();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  function renderAll() {
    ensureSelectedProject();
    renderProjects();
    renderEditor();
    renderStats();
    renderTopBadge();
    renderContentSnapshot();
    renderDesignControlsFromState();
    renderDesignPreview();
  }

  function renderProjects() {
    const list = byId("projectList");
    if (!list) return;

    const query = (byId("projectSearch")?.value || "").trim().toLowerCase();
    list.innerHTML = "";

    const filtered = state.projects.filter(project => {
      const haystack = `${project.title} ${project.category} ${project.description}`.toLowerCase();
      return haystack.includes(query);
    });

    filtered.forEach(project => {
      const el = document.createElement("button");
      el.className = "project-row";
      if (project.id === selectedProjectId) el.classList.add("active");

      const thumb = project.coverImage ? `background-image:url('${escapeAttr(project.coverImage)}');` : "";
      el.innerHTML = `
        <div class="row-thumb" style="${thumb}"></div>
        <div class="row-copy">
          <strong>${escapeHtml(project.title)}</strong>
          <small>${escapeHtml(project.category || "Uncategorised")}</small>
        </div>
        <div class="status-dot ${project.visible ? "" : "hidden"}"></div>
      `;

      el.addEventListener("click", () => {
        selectedProjectId = project.id;
        renderAll();
      });

      list.appendChild(el);
    });
  }

  function renderEditor() {
    const empty   = byId("editorEmpty");
    const content = byId("editorContent");
    const project = getSelectedProject();

    if (!project) {
      if (empty)   empty.style.display   = "grid";
      if (content) content.style.display = "none";
      return;
    }

    if (empty)   empty.style.display   = "none";
    if (content) content.style.display = "block";

    setIfExists("projectTitle",          project.title        || "");
    setIfExists("projectCategory",       project.category     || "");
    setIfExists("projectModalImageFit",  project.modalImageFit || "");
    setIfExists("projectDescription",    project.description  || "");
    setCheckedIfExists("projectVisible", !!project.visible);
    setIfExists("coverImageUrl",         project.coverImage   || "");

    renderCoverPreview();
    renderGalleryThumbs();
  }

  function renderCoverPreview() {
    const project = getSelectedProject();
    const preview = byId("coverPreview");
    if (!project || !preview) return;
    preview.style.backgroundImage = project.coverImage ? `url('${project.coverImage}')` : "none";
  }

  function renderGalleryThumbs() {
    const project   = getSelectedProject();
    const container = byId("galleryThumbs");
    if (!project || !container) return;

    container.innerHTML = "";
    project.galleryImages.forEach((url, index) => {
      const item   = document.createElement("div");
      item.className = "img-chip";
      item.style.backgroundImage = `url('${url}')`;

      const remove = document.createElement("button");
      remove.type        = "button";
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        project.galleryImages.splice(index, 1);
        commit();
      });

      item.appendChild(remove);
      container.appendChild(item);
    });
  }

  function renderStats() {
    const total   = state.projects.length;
    const visible = state.projects.filter(p => p.visible).length;
    if (byId("statProjects")) byId("statProjects").innerText = total;
    if (byId("statVisible"))  byId("statVisible").innerText  = visible;
  }

  function renderTopBadge() {
    const badge = byId("projectCountBadge");
    if (badge) badge.textContent = `${state.projects.length} Project${state.projects.length === 1 ? "" : "s"}`;
  }

  function renderContentSnapshot() {
    const lastEdited    = byId("snapshotLastEdited");
    const categoryCount = byId("snapshotCategoryCount");
    const hiddenCount   = byId("snapshotHiddenCount");
    const previews      = byId("snapshotPreviews");

    if (!lastEdited || !categoryCount || !hiddenCount || !previews) return;

    const categories      = [...new Set(state.projects.map(p => p.category).filter(Boolean))];
    const hiddenProjects  = state.projects.filter(p => !p.visible);

    lastEdited.textContent    = state.projects[0]?.title || "—";
    categoryCount.textContent = categories.length;
    hiddenCount.textContent   = hiddenProjects.length;

    previews.innerHTML = "";
    state.projects.slice(0, 2).forEach(project => {
      const card  = document.createElement("div");
      card.className = "snapshot-card";

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      if (project.coverImage) thumb.style.backgroundImage = `url('${project.coverImage}')`;

      const copy = document.createElement("div");
      copy.className = "copy";
      copy.innerHTML = `
        <strong>${escapeHtml(project.title || "Untitled Project")}</strong>
        <small>${escapeHtml(project.category || "Uncategorised")}</small>
      `;

      card.appendChild(thumb);
      card.appendChild(copy);
      previews.appendChild(card);
    });
  }

  function renderDesignControlsFromState() {
    setIfExists("layoutColumns",  state.design.columns);
    setTextIfExists("layoutColumnsValue", state.design.columns);

    setIfExists("cardGap",        state.design.cardGap);
    setTextIfExists("cardGapValue", state.design.cardGap);

    setIfExists("cardRadius",     state.design.cardRadius);
    setTextIfExists("cardRadiusValue", state.design.cardRadius);

    setIfExists("cardBackground", state.design.cardBackground);
    setIfExists("textPanelStyle", state.design.textPanelStyle || "fade");

    setIfExists("overlayStrength", state.design.overlayStrength);
    setTextIfExists("overlayStrengthValue", state.design.overlayStrength);

    setCheckedIfExists("showCategory", state.design.showCategory);

    setIfExists("titleSize",  state.design.titleSize);
    setTextIfExists("titleSizeValue", state.design.titleSize);

    setIfExists("metaSize",   state.design.metaSize);
    setTextIfExists("metaSizeValue", state.design.metaSize);

    setCheckedIfExists("showFilters",      state.design.showFilters);
    setIfExists("accentColor",             state.design.accentColor);
    setCheckedIfExists("enableModal",      state.design.enableModal);
    setIfExists("modalImageFit",           state.design.modalImageFit || "cover");
    setCheckedIfExists("showGalleryCount", state.design.showGalleryCount);
  }

  function renderDesignPreview() {
    const previewGrid    = byId("previewGrid");
    const previewFilters = byId("previewFilters");
    const galleryPreview = byId("galleryPreview");

    if (!previewGrid || !previewFilters) return;

    const visibleProjects = state.projects.filter(p => p.visible);
    const categories      = [...new Set(visibleProjects.map(p => p.category).filter(Boolean))];

    previewFilters.innerHTML = "";
    previewGrid.innerHTML    = "";

    const isMobile = window.innerWidth <= 640;
    const isTablet = window.innerWidth <= 980;

    if (isMobile) {
      previewGrid.style.gridTemplateColumns = "1fr";
    } else if (isTablet) {
      previewGrid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    } else {
      previewGrid.style.gridTemplateColumns = `repeat(${state.design.columns}, minmax(0, 1fr))`;
    }
    previewGrid.style.gap = `${state.design.cardGap}px`;

    if (state.design.showFilters) {
      const allChip = document.createElement("span");
      allChip.className = "chip active";
      allChip.textContent = "All";
      allChip.style.background    = `linear-gradient(135deg, ${hexToRgba(state.design.accentColor, 0.28)}, rgba(255,255,255,.06))`;
      allChip.style.borderColor   = hexToRgba(state.design.accentColor, 0.35);
      previewFilters.appendChild(allChip);

      categories.forEach(category => {
        const chip = document.createElement("span");
        chip.className   = "chip";
        chip.textContent = category;
        previewFilters.appendChild(chip);
      });
    }

    const previewProjects = (isMobile || isTablet)
      ? visibleProjects.slice(0, 3)
      : visibleProjects;

    previewProjects.forEach(project => {
      const item = document.createElement("article");
      item.className = "gallery-item";
      item.style.borderRadius = `${state.design.cardRadius}px`;
      item.style.background   = state.design.cardBackground;

      const thumb = document.createElement("div");
      thumb.className = "gallery-thumb";
      if (project.coverImage) thumb.style.backgroundImage = `url('${project.coverImage}')`;

      const overlay = document.createElement("div");
      overlay.className = "gallery-overlay";
      overlay.style.background = state.design.textPanelStyle === "fade"
        ? `linear-gradient(180deg, transparent 28%, rgba(5,7,11,${state.design.overlayStrength / 100}) 100%)`
        : "none";

      const copy = document.createElement("div");
      copy.className = "gallery-copy";

      if (state.design.textPanelStyle === "solid") {
        copy.style.background = `rgba(16,17,23, ${Math.max(0.25, Math.min(1, state.design.overlayStrength / 100))})`;
        copy.style.borderTop  = "1px solid rgba(255,255,255,0.06)";
      }

      const title = document.createElement("strong");
      title.textContent  = project.title || "Untitled Project";
      title.style.fontSize = `${state.design.titleSize}px`;
      copy.appendChild(title);

      let metaText = "";
      if (state.design.showCategory)    metaText = project.category || "Uncategorised";
      if (state.design.showGalleryCount && project.galleryImages?.length) {
        metaText += metaText ? ` • ${project.galleryImages.length} images` : `${project.galleryImages.length} images`;
      }

      if (metaText) {
        const meta = document.createElement("small");
        meta.textContent    = metaText;
        meta.style.fontSize = `${state.design.metaSize}px`;
        copy.appendChild(meta);
      }

      item.appendChild(thumb);
      item.appendChild(overlay);
      item.appendChild(copy);
      previewGrid.appendChild(item);
    });

    if (galleryPreview) {
      galleryPreview.style.borderColor = hexToRgba(state.design.accentColor, 0.18);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // File / URL handlers
  // ─────────────────────────────────────────────────────────────────────────

  function handleCoverUpload(e) {
    e.target.value = "";
    showToast("File uploads are disabled for this Wix-compliant version. Please paste an image URL instead.");
  }

  function handleGalleryUpload(e) {
    e.target.value = "";
    showToast("File uploads are disabled for this Wix-compliant version. Please add image URLs instead.");
  }

  function addGalleryUrl() {
    const input   = byId("galleryUrlInput");
    const project = getSelectedProject();
    if (!input || !project) return;
    const url = input.value.trim();
    if (!url) return;
    project.galleryImages.push(url);
    input.value = "";
    commit();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CSV import / export
  // ─────────────────────────────────────────────────────────────────────────

  function exportCSVTemplate() {
    const rows = [
      ["# Pro Filter Gallery CSV Template"],
      ["# galleryImages should be separated with | and visible should be true or false"],
      ["title", "category", "description", "coverImage", "galleryImages", "visible"],
      ["Studio Direction", "Branding", "A premium identity system.", "https://example.com/cover-1.jpg", "https://example.com/g-1.jpg|https://example.com/g-2.jpg", "true"],
      ["Luxury Commerce",  "Web",      "A high-end e-commerce interface.", "https://example.com/cover-2.jpg", "https://example.com/g-3.jpg", "true"]
    ];
    download("pro-filter-gallery-template.csv", rows.map(r => r.map(csvEscape).join(",")).join("\n"));
  }

  function importCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result)
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean)
        .filter(l => !l.startsWith("#"));

      if (lines.length < 2) return;

      const rows       = lines.map(parseCSVLine);
      const headers    = rows[0];
      const headerMap  = {
        title:         headers.indexOf("title"),
        category:      headers.indexOf("category"),
        description:   headers.indexOf("description"),
        coverImage:    headers.indexOf("coverImage"),
        galleryImages: headers.indexOf("galleryImages"),
        visible:       headers.indexOf("visible")
      };

      state.projects = rows.slice(1).map(cols => normalizeProject({
        id:            generateId(),
        title:         cols[headerMap.title]        || "",
        category:      cols[headerMap.category]     || "",
        description:   cols[headerMap.description]  || "",
        coverImage:    cols[headerMap.coverImage]   || "",
        galleryImages: (cols[headerMap.galleryImages] || "").split("|").map(v => v.trim()).filter(Boolean),
        visible:       String(cols[headerMap.visible] || "").toLowerCase() !== "false"
      }));

      ensureSelectedProject();
      saveState();
      renderAll();
    };

    reader.readAsText(file);
    e.target.value = "";
  }

  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && insideQuotes && next === '"') { current += '"'; i++; }
      else if (char === '"') { insideQuotes = !insideQuotes; }
      else if (char === "," && !insideQuotes) { result.push(current); current = ""; }
      else { current += char; }
    }

    result.push(current);
    return result;
  }

  function csvEscape(value) {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function download(name, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", name);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const r = new FileReader();
      r.onload = () => window.open(r.result);
      r.readAsDataURL(blob);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────────────────

  function getSelectedProject() {
    return state.projects.find(p => p.id === selectedProjectId);
  }

  function normalizeProject(project) {
    return {
      id:            project.id           || generateId(),
      title:         project.title        || "Untitled Project",
      category:      project.category     || "Uncategorised",
      description:   project.description  || "",
      coverImage:    project.coverImage   || "",
      galleryImages: Array.isArray(project.galleryImages) ? project.galleryImages.filter(Boolean) : [],
      modalImageFit: project.modalImageFit || "",
      visible:       project.visible !== false
    };
  }

  function generateId() {
    return "p_" + Math.random().toString(36).slice(2, 11);
  }

  function mapSliderToSizePreset(value) {
    const n = Number(value);
    if (n <= 15) return "small";
    if (n >= 18) return "large";
    return "medium";
  }

  function mapPresetToSliderValue(value) {
    if (value === "small") return 14;
    if (value === "large") return 20;
    return 16;
  }

  function showToast(message) {
    const toast = byId("toast");
    if (!toast) { console.warn(message); return; }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function byId(id)                { return document.getElementById(id); }
  function setIfExists(id, value)  { const el = byId(id); if (el) el.value = value; }
  function setCheckedIfExists(id, value) { const el = byId(id); if (el) el.checked = !!value; }
  function setTextIfExists(id, value)    { const el = byId(id); if (el) el.textContent = value; }

  function hexToRgba(hex, alpha) {
    const clean  = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8)  & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(str) {
    return String(str).replaceAll('"', "&quot;");
  }
});
