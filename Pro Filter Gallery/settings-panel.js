/**
 * Pro Filter Gallery — Settings Panel
 *
 * Official Wix flow:
 * settings panel -> widget.setProp() -> Wix -> custom element attributes -> attributeChangedCallback()
 *
 * No postMessage. No custom bridge. Wix is the source of truth.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const LOG_PREFIX = "[ProFilterGallery]";
  const MAX_PROJECTS_JSON_SIZE = 40000;

  let widget = null;
  let isWixEditor = false;
  let isHydrating = false;
  let persistQueue = Promise.resolve();

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

  const WIDGET_PROP_KEYS = [
    "projects",
    "accent",
    "columns",
    "gap",
    "radius",
    "cardpanelbg",
    "textpanelstyle",
    "overlaystrength",
    "showcategory",
    "showfilters",
    "enablemodal",
    "titlesize",
    "descsize",
    "categorysize",
    "modalimagefit"
  ];

  let state = cloneState(DEFAULT_STATE);
  let selectedProjectId = null;
  let activeView = "hub";

  await initWixEditorSDK();
  await hydrateStateFromWix();

  ensureSelectedProject();

  wireNavigation();
  wireActions();
  wireEditorFields();
  wireDesignControls();
  wireResponsivePreview();

  setView(getInitialView());
  renderAll();

  async function initWixEditorSDK() {
    try {
      console.log(`${LOG_PREFIX} Initialising Wix Editor SDK...`);

      const sdkModule = await import("https://www.wix.com/sdk-init/sdk-init.js");
      const createClient =
        sdkModule?.createClient ||
        sdkModule?.default?.createClient;

      const editorModule =
        sdkModule?.editor ||
        sdkModule?.default?.editor;

      if (!createClient || !editorModule?.widget) {
        throw new Error("Wix SDK loaded but widget module was not found.");
      }

      const client = createClient({
        modules: {
          widget: editorModule.widget
        }
      });

      if (!client?.widget) {
        throw new Error("Wix client initialised but widget API is unavailable.");
      }

      widget = client.widget;
      isWixEditor = true;

      console.log(`${LOG_PREFIX} Wix Editor SDK ready.`);
    } catch (error) {
      widget = null;
      isWixEditor = false;
      console.warn(`${LOG_PREFIX} Wix Editor SDK unavailable. Running in local/dev mode.`, error);
    }
  }

  async function getProp(key) {
    if (!widget) return null;
    try {
      const value = await widget.getProp(key);
      console.log(`${LOG_PREFIX} getProp("${key}") ->`, value);
      return value ?? null;
    } catch (error) {
      console.warn(`${LOG_PREFIX} getProp failed for "${key}"`, error);
      return null;
    }
  }

  async function setProp(key, value) {
    if (!widget) return false;
    try {
      await widget.setProp(key, String(value));
      console.log(`${LOG_PREFIX} setProp("${key}") <-`, value);
      return true;
    } catch (error) {
      console.warn(`${LOG_PREFIX} setProp failed for "${key}"`, error);
      return false;
    }
  }

async function hydrateStateFromWix() {
  isHydrating = true;

  try {
    const propEntries = await Promise.all(
      WIDGET_PROP_KEYS.map(async (key) => [key, await getProp(key)])
    );

    const props = Object.fromEntries(propEntries);

    state = buildStateFromProps(props);

    const hasStoredProjects =
      props.projects !== null &&
      props.projects !== undefined &&
      props.projects !== "" &&
      props.projects !== "[]" &&
      props.projects !== "null";

    if (!hasStoredProjects) {
      console.log(`${LOG_PREFIX} No stored projects found. Bootstrapping defaults into Wix.`);
      state = cloneState(DEFAULT_STATE);
      await persistFullState({ silent: true, reason: "bootstrap-default-projects" });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to hydrate state from Wix. Falling back to defaults.`, error);
    state = cloneState(DEFAULT_STATE);
  } finally {
    isHydrating = false;
  }
}

  function buildStateFromProps(props) {
    const nextState = cloneState(DEFAULT_STATE);
    const d = nextState.design;

    if (props.projects) {
      try {
        const parsed = JSON.parse(props.projects);
        if (Array.isArray(parsed) && parsed.length) {
          nextState.projects = parsed.map(normalizeProject);
        }
      } catch (error) {
        console.warn(`${LOG_PREFIX} Could not parse projects prop. Using defaults.`, error);
      }
    }

    if (props.accent) d.accentColor = props.accent;

    if (props.columns !== null && props.columns !== "") {
      d.columns = parseNumber(props.columns, DEFAULT_DESIGN.columns);
    }

    if (props.gap !== null && props.gap !== "") {
      d.cardGap = parseNumber(props.gap, DEFAULT_DESIGN.cardGap);
    }

    if (props.radius !== null && props.radius !== "") {
      d.cardRadius = parseNumber(props.radius, DEFAULT_DESIGN.cardRadius);
    }

    if (props.cardpanelbg) d.cardBackground = props.cardpanelbg;
    if (props.textpanelstyle) d.textPanelStyle = props.textpanelstyle;

    if (props.overlaystrength !== null && props.overlaystrength !== "") {
      d.overlayStrength = parseNumber(props.overlaystrength, DEFAULT_DESIGN.overlayStrength);
    }

    if (typeof props.showcategory === "string") {
      d.showCategory = props.showcategory === "true";
    }

    if (typeof props.showfilters === "string") {
      d.showFilters = props.showfilters === "true";
    }

    if (typeof props.enablemodal === "string") {
      d.enableModal = props.enablemodal === "true";
    }

    if (props.titlesize) {
      d.titleSize = mapPresetToSliderValue(props.titlesize);
    }

    if (props.descsize) {
      d.metaSize = mapPresetToSliderValue(props.descsize);
    } else if (props.categorysize === "small") {
      d.metaSize = 10;
    } else if (props.categorysize === "medium") {
      d.metaSize = 12;
    }

    if (props.modalimagefit) {
      d.modalImageFit = props.modalimagefit;
    }

    return nextState;
  }

  function buildPropPayload(sourceState = state) {
    return {
      projects: JSON.stringify(sourceState.projects),
      accent: String(sourceState.design.accentColor || "#7c9cff"),
      columns: String(sourceState.design.columns ?? 3),
      gap: String(sourceState.design.cardGap ?? 16),
      radius: String(sourceState.design.cardRadius ?? 20),
      cardpanelbg: String(sourceState.design.cardBackground || "#111722"),
      textpanelstyle: String(sourceState.design.textPanelStyle || "fade"),
      overlaystrength: String(sourceState.design.overlayStrength ?? 72),
      showcategory: String(!!sourceState.design.showCategory),
      showfilters: String(!!sourceState.design.showFilters),
      enablemodal: String(!!sourceState.design.enableModal),
      titlesize: mapSliderToSizePreset(sourceState.design.titleSize),
      descsize: mapSliderToSizePreset(sourceState.design.metaSize),
      categorysize: Number(sourceState.design.metaSize) <= 10 ? "small" : "medium",
      modalimagefit: String(sourceState.design.modalImageFit || "cover")
    };
  }

  function validateProjectsSize(projectsJson, { silent = false } = {}) {
    if (projectsJson.length <= MAX_PROJECTS_JSON_SIZE) return true;

    console.warn(
      `${LOG_PREFIX} Projects JSON exceeded size limit (${projectsJson.length}/${MAX_PROJECTS_JSON_SIZE}).`
    );

    if (!silent) {
      showToast("Projects are too large to save. Use image URLs only.");
    }

    return false;
  }

  function enqueuePersist(taskName, taskFn) {
    persistQueue = persistQueue
      .then(async () => {
        try {
          await taskFn();
        } catch (error) {
          console.error(`${LOG_PREFIX} Persist task failed: ${taskName}`, error);
        }
      })
      .catch((error) => {
        console.error(`${LOG_PREFIX} Persist queue error: ${taskName}`, error);
      });

    return persistQueue;
  }

  function persistFullState(options = {}) {
    const { silent = false, reason = "update" } = options;

    return enqueuePersist(`persistFullState:${reason}`, async () => {
      const payload = buildPropPayload(state);

      if (!validateProjectsSize(payload.projects, { silent })) {
        return false;
      }

      if (!widget) {
        console.log(`${LOG_PREFIX} Skipping Wix persist (dev mode). Reason: ${reason}`);
        return true;
      }

      await Promise.all(
        Object.entries(payload).map(([key, value]) => setProp(key, value))
      );

      return true;
    });
  }

  function commit(render = true, reason = "commit") {
    if (!isHydrating) {
      void persistFullState({ reason });
    }
    if (render) {
      renderAll();
    }
  }

  function renderPreview() {
    renderDesignPreview();
  }

  function ensureSelectedProject() {
    if (!state.projects.length) {
      selectedProjectId = null;
      return;
    }
    const exists = state.projects.some((p) => p.id === selectedProjectId);
    if (!selectedProjectId || !exists) {
      selectedProjectId = state.projects[0].id;
    }
  }

  function getInitialView() {
    const active = document.querySelector(".view.active");
    if (active?.id === "view-hub") return "hub";
    if (active?.id === "view-design") return "design";
    if (active?.id === "view-content") return "content";
    return "hub";
  }

  function wireNavigation() {
    document.querySelectorAll("[data-view-target]").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.viewTarget));
    });

    document.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.go));
    });
  }

  function setView(view) {
    activeView = view;

    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".rail-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.viewTarget === view) btn.classList.add("active");
    });

    document.querySelectorAll(".mobile-nav-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.viewTarget === view) btn.classList.add("active");
    });
  }

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

  function wireEditorFields() {
    byId("projectTitle")?.addEventListener("input", (e) => {
      const p = getSelectedProject();
      if (!p) return;
      p.title = e.target.value;
      commit(true, "project-title");
    });

    byId("projectCategory")?.addEventListener("input", (e) => {
      const p = getSelectedProject();
      if (!p) return;
      p.category = e.target.value;
      commit(true, "project-category");
    });

    byId("projectModalImageFit")?.addEventListener("change", (e) => {
      const p = getSelectedProject();
      if (!p) return;
      p.modalImageFit = e.target.value;
      commit(true, "project-modal-fit");
    });

    byId("projectDescription")?.addEventListener("input", (e) => {
      const p = getSelectedProject();
      if (!p) return;
      p.description = e.target.value;
      commit(true, "project-description");
    });

    byId("projectVisible")?.addEventListener("change", (e) => {
      const p = getSelectedProject();
      if (!p) return;
      p.visible = e.target.checked;
      commit(true, "project-visible");
    });

    byId("coverImageUrl")?.addEventListener("input", (e) => {
      const p = getSelectedProject();
      if (!p) return;
      p.coverImage = e.target.value.trim();
      void persistFullState({ reason: "project-cover-image" });
      renderCoverPreview();
      renderProjects();
      renderContentSnapshot();
      renderPreview();
    });
  }

  function wireDesignControls() {
    bindDesignControl("layoutColumns", "columns", "value", Number, "design-columns");
    bindDesignControl("cardGap", "cardGap", "value", Number, "design-gap");
    bindDesignControl("cardRadius", "cardRadius", "value", Number, "design-radius");
    bindDesignControl("cardBackground", "cardBackground", "value", (v) => v, "design-card-bg");
    bindDesignControl("textPanelStyle", "textPanelStyle", "value", (v) => v, "design-text-style");
    bindDesignControl("overlayStrength", "overlayStrength", "value", Number, "design-overlay-strength");
    bindDesignControl("showCategory", "showCategory", "checked", (v) => v, "design-show-category");
    bindDesignControl("titleSize", "titleSize", "value", Number, "design-title-size");
    bindDesignControl("metaSize", "metaSize", "value", Number, "design-meta-size");
    bindDesignControl("showFilters", "showFilters", "checked", (v) => v, "design-show-filters");
    bindDesignControl("accentColor", "accentColor", "value", (v) => v, "design-accent");
    bindDesignControl("enableModal", "enableModal", "checked", (v) => v, "design-enable-modal");
    bindDesignControl("modalImageFit", "modalImageFit", "value", (v) => v, "design-modal-fit");
    bindDesignControl("showGalleryCount", "showGalleryCount", "checked", (v) => v, "design-gallery-count");
  }

  function bindDesignControl(id, key, prop, transform, reason) {
    const el = byId(id);
    if (!el) return;

    const handler = () => {
      state.design[key] = transform(el[prop]);
      void persistFullState({ reason });
      renderDesignControlsFromState();
      renderPreview();
    };

    if (el.type === "checkbox" || el.tagName === "SELECT") {
      el.addEventListener("change", handler);
    } else {
      el.addEventListener("input", handler);
    }
  }

  function wireResponsivePreview() {
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderPreview(), 120);
    });
  }

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

    commit(true, "create-project");
    setView("content");
  }

  function deleteProject() {
    if (!selectedProjectId) return;

    state.projects = state.projects.filter((p) => p.id !== selectedProjectId);
    ensureSelectedProject();

    commit(true, "delete-project");
  }

  function duplicateProject() {
    const p = getSelectedProject();
    if (!p) return;

    const copy = normalizeProject({
      ...p,
      id: generateId(),
      title: `${p.title} Copy`,
      galleryImages: [...p.galleryImages]
    });

    state.projects.splice(state.projects.findIndex((x) => x.id === p.id) + 1, 0, copy);
    selectedProjectId = copy.id;

    commit(true, "duplicate-project");
  }

  function moveProject(dir) {
    const index = state.projects.findIndex((p) => p.id === selectedProjectId);
    if (index === -1) return;

    const target = index + dir;
    if (target < 0 || target >= state.projects.length) return;

    [state.projects[index], state.projects[target]] = [state.projects[target], state.projects[index]];

    commit(true, "move-project");
  }

  function renderAll() {
    ensureSelectedProject();
    renderProjects();
    renderEditor();
    renderStats();
    renderTopBadge();
    renderContentSnapshot();
    renderDesignControlsFromState();
    renderPreview();
  }

  function renderProjects() {
    const list = byId("projectList");
    if (!list) return;

    const query = (byId("projectSearch")?.value || "").trim().toLowerCase();
    list.innerHTML = "";

    state.projects
      .filter((p) => `${p.title} ${p.category} ${p.description}`.toLowerCase().includes(query))
      .forEach((project) => {
        const el = document.createElement("button");
        el.className = "project-row";
        if (project.id === selectedProjectId) el.classList.add("active");

        const thumb = project.coverImage
          ? `background-image:url('${escapeAttr(project.coverImage)}');`
          : "";

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
    const empty = byId("editorEmpty");
    const content = byId("editorContent");
    const project = getSelectedProject();

    if (!project) {
      if (empty) empty.style.display = "grid";
      if (content) content.style.display = "none";
      return;
    }

    if (empty) empty.style.display = "none";
    if (content) content.style.display = "block";

    setIfExists("projectTitle", project.title || "");
    setIfExists("projectCategory", project.category || "");
    setIfExists("projectModalImageFit", project.modalImageFit || "");
    setIfExists("projectDescription", project.description || "");
    setCheckedIfExists("projectVisible", !!project.visible);
    setIfExists("coverImageUrl", project.coverImage || "");

    renderCoverPreview();
    renderGalleryThumbs();
  }

  function renderCoverPreview() {
    const project = getSelectedProject();
    const preview = byId("coverPreview");
    if (!project || !preview) return;

    preview.style.backgroundImage = project.coverImage
      ? `url('${project.coverImage}')`
      : "none";
  }

  function renderGalleryThumbs() {
    const project = getSelectedProject();
    const container = byId("galleryThumbs");
    if (!project || !container) return;

    container.innerHTML = "";

    project.galleryImages.forEach((url, index) => {
      const item = document.createElement("div");
      item.className = "img-chip";
      item.style.backgroundImage = `url('${url}')`;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        project.galleryImages.splice(index, 1);
        commit(true, "remove-gallery-image");
      });

      item.appendChild(remove);
      container.appendChild(item);
    });
  }

  function renderStats() {
    if (byId("statProjects")) byId("statProjects").innerText = state.projects.length;
    if (byId("statVisible")) byId("statVisible").innerText = state.projects.filter((p) => p.visible).length;
  }

  function renderTopBadge() {
    const badge = byId("projectCountBadge");
    if (badge) {
      badge.textContent = `${state.projects.length} Project${state.projects.length === 1 ? "" : "s"}`;
    }
  }

  function renderContentSnapshot() {
    const lastEdited = byId("snapshotLastEdited");
    const categoryCount = byId("snapshotCategoryCount");
    const hiddenCount = byId("snapshotHiddenCount");
    const previews = byId("snapshotPreviews");
    if (!lastEdited || !categoryCount || !hiddenCount || !previews) return;

    const categories = [...new Set(state.projects.map((p) => p.category).filter(Boolean))];

    lastEdited.textContent = state.projects[0]?.title || "—";
    categoryCount.textContent = categories.length;
    hiddenCount.textContent = state.projects.filter((p) => !p.visible).length;
    previews.innerHTML = "";

    state.projects.slice(0, 2).forEach((project) => {
      const card = document.createElement("div");
      card.className = "snapshot-card";

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      if (project.coverImage) {
        thumb.style.backgroundImage = `url('${project.coverImage}')`;
      }

      const copy = document.createElement("div");
      copy.className = "copy";
      copy.innerHTML = `<strong>${escapeHtml(project.title || "Untitled")}</strong><small>${escapeHtml(project.category || "Uncategorised")}</small>`;

      card.appendChild(thumb);
      card.appendChild(copy);
      previews.appendChild(card);
    });
  }

  function renderDesignControlsFromState() {
    setIfExists("layoutColumns", state.design.columns);
    setTextIfExists("layoutColumnsValue", state.design.columns);

    setIfExists("cardGap", state.design.cardGap);
    setTextIfExists("cardGapValue", state.design.cardGap);

    setIfExists("cardRadius", state.design.cardRadius);
    setTextIfExists("cardRadiusValue", state.design.cardRadius);

    setIfExists("cardBackground", state.design.cardBackground);
    setIfExists("textPanelStyle", state.design.textPanelStyle || "fade");

    setIfExists("overlayStrength", state.design.overlayStrength);
    setTextIfExists("overlayStrengthValue", state.design.overlayStrength);

    setCheckedIfExists("showCategory", state.design.showCategory);

    setIfExists("titleSize", state.design.titleSize);
    setTextIfExists("titleSizeValue", state.design.titleSize);

    setIfExists("metaSize", state.design.metaSize);
    setTextIfExists("metaSizeValue", state.design.metaSize);

    setCheckedIfExists("showFilters", state.design.showFilters);
    setIfExists("accentColor", state.design.accentColor);
    setCheckedIfExists("enableModal", state.design.enableModal);
    setIfExists("modalImageFit", state.design.modalImageFit || "cover");
    setCheckedIfExists("showGalleryCount", state.design.showGalleryCount);
  }

  function renderDesignPreview() {
    const previewGrid = byId("previewGrid");
    const previewFilters = byId("previewFilters");
    const galleryPreview = byId("galleryPreview");

    if (!previewGrid || !previewFilters) return;

    const visibleProjects = state.projects.filter((p) => p.visible);
    const categories = [...new Set(visibleProjects.map((p) => p.category).filter(Boolean))];

    previewFilters.innerHTML = "";
    previewGrid.innerHTML = "";

    const isMobile = window.innerWidth <= 640;
    const isTablet = window.innerWidth <= 980;

    previewGrid.style.gridTemplateColumns = isMobile
      ? "1fr"
      : isTablet
      ? "repeat(2, minmax(0, 1fr))"
      : `repeat(${state.design.columns}, minmax(0, 1fr))`;

    previewGrid.style.gap = `${state.design.cardGap}px`;

    if (state.design.showFilters) {
      const allChip = document.createElement("span");
      allChip.className = "chip active";
      allChip.textContent = "All";
      allChip.style.background = `linear-gradient(135deg, ${hexToRgba(state.design.accentColor, 0.28)}, rgba(255,255,255,.06))`;
      allChip.style.borderColor = hexToRgba(state.design.accentColor, 0.35);
      previewFilters.appendChild(allChip);

      categories.forEach((cat) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = cat;
        previewFilters.appendChild(chip);
      });
    }

    ((isMobile || isTablet) ? visibleProjects.slice(0, 3) : visibleProjects).forEach((project) => {
      const item = document.createElement("article");
      item.className = "gallery-item";
      item.style.borderRadius = `${state.design.cardRadius}px`;
      item.style.background = state.design.cardBackground;

      const thumb = document.createElement("div");
      thumb.className = "gallery-thumb";
      if (project.coverImage) {
        thumb.style.backgroundImage = `url('${project.coverImage}')`;
      }

      const overlay = document.createElement("div");
      overlay.className = "gallery-overlay";
      overlay.style.background =
        state.design.textPanelStyle === "fade"
          ? `linear-gradient(180deg, transparent 28%, rgba(5,7,11,${state.design.overlayStrength / 100}) 100%)`
          : "none";

      const copy = document.createElement("div");
      copy.className = "gallery-copy";

      if (state.design.textPanelStyle === "solid") {
        copy.style.background = `rgba(16,17,23,${Math.max(0.25, Math.min(1, state.design.overlayStrength / 100))})`;
        copy.style.borderTop = "1px solid rgba(255,255,255,0.06)";
      }

      const titleEl = document.createElement("strong");
      titleEl.textContent = project.title || "Untitled Project";
      titleEl.style.fontSize = `${state.design.titleSize}px`;
      copy.appendChild(titleEl);

      let metaText = state.design.showCategory ? (project.category || "Uncategorised") : "";

      if (state.design.showGalleryCount && project.galleryImages?.length) {
        metaText += metaText
          ? ` • ${project.galleryImages.length} images`
          : `${project.galleryImages.length} images`;
      }

      if (metaText) {
        const meta = document.createElement("small");
        meta.textContent = metaText;
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

  function handleCoverUpload(e) {
    e.target.value = "";
    showToast("File uploads disabled. Please paste an image URL instead.");
  }

  function handleGalleryUpload(e) {
    e.target.value = "";
    showToast("File uploads disabled. Please paste image URLs instead.");
  }

  function addGalleryUrl() {
    const input = byId("galleryUrlInput");
    const p = getSelectedProject();
    if (!input || !p) return;

    const url = input.value.trim();
    if (!url) return;

    p.galleryImages.push(url);
    input.value = "";

    commit(true, "add-gallery-url");
  }

  function exportCSVTemplate() {
    const rows = [
      ["# Pro Filter Gallery CSV Template"],
      ["# galleryImages separated with |, visible is true or false"],
      ["title", "category", "description", "coverImage", "galleryImages", "visible"],
      ["Studio Direction", "Branding", "A premium identity system.", "https://example.com/cover-1.jpg", "https://example.com/g-1.jpg|https://example.com/g-2.jpg", "true"],
      ["Luxury Commerce", "Web", "A high-end e-commerce interface.", "https://example.com/cover-2.jpg", "https://example.com/g-3.jpg", "true"]
    ];

    download(
      "pro-filter-gallery-template.csv",
      rows.map((r) => r.map(csvEscape).join(",")).join("\n")
    );
  }

  function importCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const lines = String(reader.result)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => !l.startsWith("#"));

      if (lines.length < 2) return;

      const rows = lines.map(parseCSVLine);
      const h = rows[0];

      const hm = {
        title: h.indexOf("title"),
        category: h.indexOf("category"),
        description: h.indexOf("description"),
        coverImage: h.indexOf("coverImage"),
        galleryImages: h.indexOf("galleryImages"),
        visible: h.indexOf("visible")
      };

      state.projects = rows.slice(1).map((cols) =>
        normalizeProject({
          id: generateId(),
          title: cols[hm.title] || "",
          category: cols[hm.category] || "",
          description: cols[hm.description] || "",
          coverImage: cols[hm.coverImage] || "",
          galleryImages: (cols[hm.galleryImages] || "")
            .split("|")
            .map((v) => v.trim())
            .filter(Boolean),
          visible: String(cols[hm.visible] || "").toLowerCase() !== "false"
        })
      );

      ensureSelectedProject();
      commit(true, "import-csv");
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

      if (char === '"' && insideQuotes && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
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

  function getSelectedProject() {
    return state.projects.find((p) => p.id === selectedProjectId);
  }

  function normalizeProject(project) {
    return {
      id: project.id || generateId(),
      title: project.title || "Untitled Project",
      category: project.category || "Uncategorised",
      description: project.description || "",
      coverImage: project.coverImage || "",
      galleryImages: Array.isArray(project.galleryImages)
        ? project.galleryImages.filter(Boolean)
        : [],
      modalImageFit: project.modalImageFit || "",
      visible: project.visible !== false
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

  function parseNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function cloneState(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function showToast(message) {
    const toast = byId("toast");
    if (!toast) {
      console.warn(`${LOG_PREFIX} Toast missing:`, message);
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setIfExists(id, v) {
    const el = byId(id);
    if (el) el.value = v;
  }

  function setCheckedIfExists(id, v) {
    const el = byId(id);
    if (el) el.checked = !!v;
  }

  function setTextIfExists(id, v) {
    const el = byId(id);
    if (el) el.textContent = v;
  }

  function hexToRgba(hex, alpha) {
    const safeHex = String(hex || "#000000").replace("#", "");
    const normalized =
      safeHex.length === 3
        ? safeHex.split("").map((c) => c + c).join("")
        : safeHex.padEnd(6, "0").slice(0, 6);

    const b = parseInt(normalized, 16);
    return `rgba(${(b >> 16) & 255}, ${(b >> 8) & 255}, ${b & 255}, ${alpha})`;
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
