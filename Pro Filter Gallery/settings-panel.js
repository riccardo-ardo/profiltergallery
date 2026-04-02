document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "pro_filter_gallery_settings_v2";

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

  let state = structuredClone(DEFAULT_STATE);
  let selectedProjectId = null;
  let activeView = "hub";

  init();

async function init() {
  loadState();
  ensureSelectedProject();

  await bootstrapWixState();

  wireNavigation();
  wireActions();
  wireEditorFields();
  wireDesignControls();
  wireResponsivePreview();
  setView(getInitialView());
  renderAll();
}

  async function loadStateFromWixProps() {
  if (!window.Wix || typeof Wix.getProp !== "function") return;

  try {
    const projectsProp = await Wix.getProp("projects");
    const accent = await Wix.getProp("accent");
    const columns = await Wix.getProp("columns");
    const gap = await Wix.getProp("gap");
    const radius = await Wix.getProp("radius");
    const cardpanelbg = await Wix.getProp("cardpanelbg");
    const showcategory = await Wix.getProp("showcategory");
    const showfilters = await Wix.getProp("showfilters");
    const enablemodal = await Wix.getProp("enablemodal");
    const titlesize = await Wix.getProp("titlesize");
    const descsize = await Wix.getProp("descsize");
    const categorysize = await Wix.getProp("categorysize");
    const modalimagefit = await Wix.getProp("modalimagefit");

    if (projectsProp) {
      try {
        const parsedProjects = JSON.parse(projectsProp);
        if (Array.isArray(parsedProjects) && parsedProjects.length) {
          state.projects = parsedProjects.map(normalizeProject);
        }
      } catch (e) {
        console.warn("Could not parse Wix projects prop", e);
      }
    }

    if (accent) state.design.accentColor = accent;
    if (columns) state.design.columns = Number(columns);
    if (gap) state.design.cardGap = Number(gap);
    if (radius) state.design.cardRadius = Number(radius);
    if (cardpanelbg) state.design.cardBackground = cardpanelbg;
    if (typeof showcategory === "string") state.design.showCategory = showcategory === "true";
    if (typeof showfilters === "string") state.design.showFilters = showfilters === "true";
    if (typeof enablemodal === "string") state.design.enableModal = enablemodal === "true";
    if (titlesize) state.design.titleSize = mapPresetToSliderValue(titlesize);
    if (descsize) state.design.metaSize = mapPresetToSliderValue(descsize);
    if (modalimagefit) state.design.modalImageFit = modalimagefit;
  } catch (error) {
    console.warn("Could not load Wix props into settings panel", error);
  }
}

function wireResponsivePreview() {
  let resizeTimer;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderDesignPreview();
    }, 120);
  });
}

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = {
          design: { ...DEFAULT_DESIGN, ...(parsed.design || {}) },
          projects: Array.isArray(parsed.projects) && parsed.projects.length
            ? parsed.projects.map(normalizeProject)
            : structuredClone(DEFAULT_STATE.projects)
        };
      } else {
        state = structuredClone(DEFAULT_STATE);
      }
    } catch {
      state = structuredClone(DEFAULT_STATE);
    }
  }

  async function bootstrapWixState() {
  if (!window.Wix || typeof Wix.getProp !== "function" || typeof Wix.setProp !== "function") {
    return;
  }

  try {
    const existingProjects = await Wix.getProp("projects");

    // If Wix already has saved projects, do nothing.
    if (existingProjects && String(existingProjects).trim() !== "") {
      return;
    }

    // First-time setup: push current default state into Wix
    await syncStateToWix();
  } catch (error) {
    console.warn("Could not bootstrap Wix state", error);
  }
}
  
async function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  await syncStateToWix();

  // keep this while testing if you want
  window.parent.postMessage({
    type: "PRO_FILTER_GALLERY_SETTINGS_UPDATED",
    payload: JSON.parse(JSON.stringify(state))
  }, "*");
}
 async function syncStateToWix() {
  if (!window.Wix || typeof Wix.setProp !== "function") return;

  try {
    await Wix.setProp("projects", JSON.stringify(state.projects));

    await Wix.setProp("accent", String(state.design.accentColor || "#7c9cff"));
    await Wix.setProp("columns", String(state.design.columns ?? 3));
    await Wix.setProp("gap", String(state.design.cardGap ?? 16));
    await Wix.setProp("radius", String(state.design.cardRadius ?? 20));
    await Wix.setProp("cardpanelbg", String(state.design.cardBackground || "#111722"));
    await Wix.setProp("textpanelstyle", String(state.design.textPanelStyle || "fade"));
    await Wix.setProp("overlaystrength", String(state.design.overlayStrength ?? 72));
    await Wix.setProp("showcategory", String(!!state.design.showCategory));
    await Wix.setProp("showfilters", String(!!state.design.showFilters));
    await Wix.setProp("enablemodal", String(!!state.design.enableModal));
    await Wix.setProp("titlesize", mapSliderToSizePreset(state.design.titleSize));
    await Wix.setProp("descsize", mapSliderToSizePreset(state.design.metaSize));
    await Wix.setProp("categorysize", Number(state.design.metaSize) <= 10 ? "small" : "medium");
    await Wix.setProp("modalimagefit", String(state.design.modalImageFit || "cover"));
  } catch (error) {
    console.warn("Could not sync state to Wix", error);
  }
}

  function ensureSelectedProject() {
    if (!state.projects.length) {
      selectedProjectId = null;
      return;
    }

    const exists = state.projects.some(p => p.id === selectedProjectId);
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
    document.querySelectorAll("[data-view-target]").forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.viewTarget));
    });

    document.querySelectorAll("[data-go]").forEach(btn => {
      btn.addEventListener("click", () => setView(btn.dataset.go));
    });
  }

  function setView(view) {
    activeView = view;

    document.querySelectorAll(".view").forEach(v => {
      v.classList.remove("active");
    });

    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".rail-btn").forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.viewTarget === view) {
        btn.classList.add("active");
      }
      
    document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
  btn.classList.remove("active");
  if (btn.dataset.viewTarget === view) {
    btn.classList.add("active");
  }
});  
      
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

    byId("coverUploadBtn")?.addEventListener("click", () => byId("coverImageUpload")?.click());
    byId("galleryUploadBtn")?.addEventListener("click", () => byId("galleryImageUpload")?.click());

    byId("coverImageUpload")?.addEventListener("change", handleCoverUpload);
    byId("galleryImageUpload")?.addEventListener("change", handleGalleryUpload);

    byId("addGalleryUrlBtn")?.addEventListener("click", addGalleryUrl);

    byId("importCsvBtn")?.addEventListener("click", () => byId("csvFileInput")?.click());
    byId("csvFileInput")?.addEventListener("change", importCSV);

    byId("exportTemplateBtn")?.addEventListener("click", exportCSVTemplate);
byId("downloadCsvTemplateBtn")?.addEventListener("click", exportCSVTemplate);
  }

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

  function wireDesignControls() {
    bindDesignControl("layoutColumns", "columns", "value", Number);
    bindDesignControl("cardGap", "cardGap", "value", Number);
    bindDesignControl("cardRadius", "cardRadius", "value", Number);
    bindDesignControl("cardBackground", "cardBackground", "value", value => value);
    bindDesignControl("textPanelStyle", "textPanelStyle", "value", value => value);
    bindDesignControl("overlayStrength", "overlayStrength", "value", Number);
    bindDesignControl("showCategory", "showCategory", "checked", value => value);
    bindDesignControl("titleSize", "titleSize", "value", Number);
    bindDesignControl("metaSize", "metaSize", "value", Number);
    bindDesignControl("showFilters", "showFilters", "checked", value => value);
    bindDesignControl("accentColor", "accentColor", "value", value => value);
    bindDesignControl("enableModal", "enableModal", "checked", value => value);
    bindDesignControl("modalImageFit", "modalImageFit", "value", value => value);
    bindDesignControl("showGalleryCount", "showGalleryCount", "checked", value => value);
  }

  function bindDesignControl(id, key, prop, transform) {
    const el = byId(id);
    if (!el) return;

    const eventName = el.type === "range" || el.type === "color" || el.tagName === "INPUT"
      ? "input"
      : "change";

    const handler = () => {
      state.design[key] = transform(el[prop]);
      saveState();
      renderDesignControlsFromState();
      renderDesignPreview();
    };

    if (el.type === "checkbox" || el.tagName === "SELECT") {
      el.addEventListener("change", handler);
    } else {
      el.addEventListener(eventName, handler);
    }
  }

  function commit(render = true) {
    saveState();
    if (render) renderAll();
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

    const copy = normalizeProject({
      ...p,
      id: generateId(),
      title: `${p.title} Copy`,
      galleryImages: [...p.galleryImages]
    });

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
        commit();
      });

      item.appendChild(remove);
      container.appendChild(item);
    });
  }

  function renderStats() {
    const total = state.projects.length;
    const visible = state.projects.filter(p => p.visible).length;

    if (byId("statProjects")) byId("statProjects").innerText = total;
    if (byId("statVisible")) byId("statVisible").innerText = visible;
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

    const categories = [...new Set(state.projects.map(p => p.category).filter(Boolean))];
    const hiddenProjects = state.projects.filter(p => !p.visible);

    lastEdited.textContent = state.projects[0]?.title || "—";
    categoryCount.textContent = categories.length;
    hiddenCount.textContent = hiddenProjects.length;

    previews.innerHTML = "";

state.projects.slice(0, 2).forEach(project => {
  const card = document.createElement("div");
  card.className = "snapshot-card";

  const thumb = document.createElement("div");
  thumb.className = "thumb";

  if (project.coverImage) {
    thumb.style.backgroundImage = `url('${project.coverImage}')`;
  }

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

    const visibleProjects = state.projects.filter(p => p.visible);
    const categories = [...new Set(visibleProjects.map(p => p.category).filter(Boolean))];

    previewFilters.innerHTML = "";
    previewGrid.innerHTML = "";

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
      allChip.style.background = `linear-gradient(135deg, ${hexToRgba(state.design.accentColor, 0.28)}, rgba(255,255,255,.06))`;
      allChip.style.borderColor = hexToRgba(state.design.accentColor, 0.35);
      previewFilters.appendChild(allChip);

      categories.forEach(category => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = category;
        previewFilters.appendChild(chip);
      });
    }

    const previewProjects = isMobile
  ? visibleProjects.slice(0, 3)
  : isTablet
    ? visibleProjects.slice(0, 3)
    : visibleProjects;

previewProjects.forEach(project => {
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
      overlay.style.background = state.design.textPanelStyle === "fade"
  ? `linear-gradient(180deg, transparent 28%, rgba(5,7,11,${state.design.overlayStrength / 100}) 100%)`
  : "none";

      const copy = document.createElement("div");
copy.className = "gallery-copy";

if (state.design.textPanelStyle === "solid") {
  copy.style.background = `rgba(16,17,23, ${Math.max(0.25, Math.min(1, state.design.overlayStrength / 100))})`;
  copy.style.borderTop = "1px solid rgba(255,255,255,0.06)";
}

       

      const title = document.createElement("strong");
      title.textContent = project.title || "Untitled Project";
      title.style.fontSize = `${state.design.titleSize}px`;

      copy.appendChild(title);

      let metaText = "";
      if (state.design.showCategory) {
        metaText = project.category || "Uncategorised";
      }
      if (state.design.showGalleryCount && project.galleryImages?.length) {
        metaText += metaText ? ` • ${project.galleryImages.length} images` : `${project.galleryImages.length} images`;
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
    const file = e.target.files?.[0];
    const project = getSelectedProject();
    if (!file || !project) return;

    const reader = new FileReader();
    reader.onload = () => {
      project.coverImage = reader.result;
      setIfExists("coverImageUrl", project.coverImage);
      commit();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleGalleryUpload(e) {
    const files = [...(e.target.files || [])];
    const project = getSelectedProject();
    if (!files.length || !project) return;

    let completed = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        project.galleryImages.push(reader.result);
        completed += 1;
        if (completed === files.length) {
          commit();
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  }

  function addGalleryUrl() {
    const input = byId("galleryUrlInput");
    const project = getSelectedProject();
    if (!input || !project) return;

    const url = input.value.trim();
    if (!url) return;

    project.galleryImages.push(url);
    input.value = "";
    commit();
  }

  function getSelectedProject() {
    return state.projects.find(p => p.id === selectedProjectId);
  }

  function normalizeProject(project) {
  return {
    id: project.id || generateId(),
    title: project.title || "Untitled Project",
    category: project.category || "Uncategorised",
    description: project.description || "",
    coverImage: project.coverImage || "",
    galleryImages: Array.isArray(project.galleryImages) ? project.galleryImages.filter(Boolean) : [],
    modalImageFit: project.modalImageFit || "",
    visible: project.visible !== false
  };
}

  function generateId() {
    return "p_" + Math.random().toString(36).slice(2, 11);
  }

  function exportCSVTemplate() {
  const rows = [
    [
      "# Pro Filter Gallery CSV Template"
    ],
    [
      "# galleryImages should be separated with | and visible should be true or false"
    ],
    [
      "title",
      "category",
      "description",
      "coverImage",
      "galleryImages",
      "visible"
    ],
    [
      "Studio Direction",
      "Branding",
      "A premium identity system built around texture, restraint, and luxury positioning.",
      "https://example.com/cover-1.jpg",
      "https://example.com/gallery-1.jpg|https://example.com/gallery-2.jpg",
      "true"
    ],
    [
      "Luxury Commerce",
      "Web",
      "A high-end e-commerce interface focused on clarity, hierarchy, and conversion-led design.",
      "https://example.com/cover-2.jpg",
      "https://example.com/gallery-3.jpg|https://example.com/gallery-4.jpg",
      "true"
    ]
  ];

  const csv = rows.map(row => row.map(csvEscape).join(",")).join("\n");
  download("pro-filter-gallery-template.csv", csv);
}

  function importCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const lines = String(reader.result)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .filter(line => !line.startsWith("#"));

      if (lines.length < 2) return;

      const rows = lines.map(parseCSVLine);
      const headers = rows[0];

      const headerMap = {
        title: headers.indexOf("title"),
        category: headers.indexOf("category"),
        description: headers.indexOf("description"),
        coverImage: headers.indexOf("coverImage"),
        galleryImages: headers.indexOf("galleryImages"),
        visible: headers.indexOf("visible")
      };

      state.projects = rows.slice(1).map(cols => normalizeProject({
        id: generateId(),
        title: cols[headerMap.title] || "",
        category: cols[headerMap.category] || "",
        description: cols[headerMap.description] || "",
        coverImage: cols[headerMap.coverImage] || "",
        galleryImages: (cols[headerMap.galleryImages] || "")
          .split("|")
          .map(v => v.trim())
          .filter(Boolean),
        visible: String(cols[headerMap.visible] || "").toLowerCase() !== "false"
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

  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, name);
    return;
  }

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
    const reader = new FileReader();
    reader.onload = function () {
      window.open(reader.result);
    };
    reader.readAsDataURL(blob);
  }
}

  function byId(id) {
    return document.getElementById(id);
  }

  function setIfExists(id, value) {
    const el = byId(id);
    if (el) el.value = value;
  }

  function setCheckedIfExists(id, value) {
    const el = byId(id);
    if (el) el.checked = !!value;
  }

  function setTextIfExists(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
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
});
