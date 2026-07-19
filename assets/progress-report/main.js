// Flat records — one per CSV row: parent, intermediate, child, status.
  const ORIGINAL_DATA = window.ticketStatusData;

  // Parent key → release + description lookup, kept as its own JSON source.
  // "release" groups parents into their own table, in order of first appearance.
  const ORIGINAL_DESCRIPTIONS = window.ticketsData; 

  // Parent key → dev/QA effort lookup, kept as its own JSON source.
  const ORIGINAL_EFFORTS = window.ticketEffortsData;

  const KNOWN_STATUS_VARS = {
    "for-grooming": "for-grooming",
    "monitor-only": "monitor",
    "to-do": "to-do",
    "in-progress": "in-progress",
    "qa-in-progress": "qa-progress",
    "for-qa-review": "qa-review",
    "for-code-review": "code-review",
    "for-pm-review": "for-pm-review",
    "release-ready": "release-ready",
    "done": "done"
  };

  // Preferred pipeline order for known statuses; anything else is appended
  // in the order it first appears in the data.
  const PREFERRED_STATUS_ORDER = [
    "For Grooming",
    "Monitor only",
    "To Do",
    "In-Progress",
    "For Code Review",
    "For QA Review",
    "QA In-Progress",        
    "For PM Review",
    "Release Ready",
    "Done"
  ];

  function slug(s) {
    return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // Status sets for the computed parent-level totals, matched by slug so
  // casing/punctuation in the source data doesn't matter.
  const TOTAL_EXCLUDED_SLUGS = new Set(["monitor-only", "cancelled"].map(slug));
  const DEV_DONE_SLUGS = new Set(["qa-in-progress", "for-qa-review", "release-ready", "done", "closed"].map(slug));
  const QA_DONE_SLUGS = new Set(["release-ready", "done", "closed"].map(slug));

  function computeParentStats(parentRows) {
    const total = parentRows.filter(r => !TOTAL_EXCLUDED_SLUGS.has(slug(r.status))).length;
    const devDone = parentRows.filter(r => DEV_DONE_SLUGS.has(slug(r.status))).length;
    const qaDone = parentRows.filter(r => QA_DONE_SLUGS.has(slug(r.status))).length;
    return { total, devDone, qaDone };
  }

  function buildColumns(rows) {
    const presentSlugs = new Set(rows.map(r => slug(r.status)));
    const cols = PREFERRED_STATUS_ORDER.filter(s => presentSlugs.has(slug(s)));
    const seen = new Set(cols.map(slug));
    rows.forEach(r => {
      const key = slug(r.status);
      if (!seen.has(key)) { seen.add(key); cols.push(r.status); }
    });
    return cols;
  }

  function buildParents(rows) {
    const order = [];
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(r.parent)) { map.set(r.parent, []); order.push(r.parent); }
      map.get(r.parent).push(r);
    });
    return order.map(id => ({ id, rows: map.get(id) }));
  }

  function buildColorMap(columns) {
    const map = {};
    let fallbackIndex = 0;
    columns.forEach(status => {
      const key = slug(status);
      if (KNOWN_STATUS_VARS[key]) {
        map[status] = KNOWN_STATUS_VARS[key];
      } else {
        fallbackIndex += 1;
        map[status] = "fallback-" + (((fallbackIndex - 1) % 4) + 1);
      }
    });
    return map;
  }

  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.style) node.setAttribute("style", opts.style);
    if (opts.text != null) node.textContent = opts.text;
    children.forEach(c => c && node.appendChild(c));
    return node;
  }

  function renderLegend(container, columns, colorMap) {
    container.innerHTML = "";
    columns.forEach(status => {
      const dot = el("span", { class: "legend-dot", style: `background:var(--status-${colorMap[status]})` });
      container.appendChild(el("span", { class: "legend-item" }, [dot, document.createTextNode(status)]));
    });
  }

  function buildDescriptionMap(descriptions) {
    const map = {};
    (descriptions || []).forEach(d => { if (d && d.parent) map[d.parent] = d; });
    return map;
  }

  function buildEffortMap(efforts) {
    const map = {};
    (efforts || []).forEach(e => { if (e && e.parent) map[e.parent] = e; });
    return map;
  }

  const EFFORT_FIELDS = [
    { key: "points", label: "Points" },
    { key: "dev_est", label: "Dev Est." },
    /*{ key: "dev_time", label: "Dev Time" },
    { key: "qa_est", label: "QA Est." },
    { key: "qa_time", label: "QA Time" }*/
  ];

  function formatEffort(key, n) {
    const num = Number(n);
    if (Number.isFinite(num)) {
      if (key === "points") return n;
      if (key === "dev_est") {
        const MINUTES_PER_HOUR = 60;
        const HOURS_PER_DAY = 8;
        const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;
        const totalMinutes = Math.round(num);
        const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
        const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
        const minutes = totalMinutes % MINUTES_PER_HOUR;
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
        return parts.join(" ");
      }
      return num.toFixed(2);
     } else {
      return "—";
     }
  }

  // Groups parents into per-release buckets, following the order parents appear
  // in tickets.js (the descriptions source) — both the release section order and
  // the parent order within each section mirror that file. Parents with no
  // matching description entry (or no release on it) land in a shared
  // "No release" bucket, appended in their original row order.
  function buildReleaseGroups(parents, descMap, descriptions) {
    const parentById = new Map(parents.map(p => [p.id, p]));
    const order = [];
    const map = new Map();

    function addToRelease(release, parent) {
      if (!map.has(release)) { map.set(release, []); order.push(release); }
      map.get(release).push(parent);
    }

    const seen = new Set();
    (descriptions || []).forEach(d => {
      const parent = d && d.parent ? parentById.get(d.parent) : null;
      if (!parent || seen.has(d.parent)) return;
      seen.add(d.parent);
      addToRelease(d.release || "No release", parent);
    });

    parents.forEach(p => {
      if (seen.has(p.id)) return;
      addToRelease("No release", p);
    });

    return order.map(release => ({ release, parents: map.get(release) }));
  }

  let showMonitorOnly = false;

  function buildReleaseSection(group, descMap, effortMap) {
    const groupRows = group.parents.flatMap(p => p.rows);
    let columns = buildColumns(groupRows);
    if (!showMonitorOnly) columns = columns.filter(s => slug(s) !== "monitor-only");
    const colorMap = buildColorMap(columns);

    const legend = el("div", { class: "legend" });
    renderLegend(legend, columns, colorMap);

    const SUMMARY_COLUMNS = ["Total", "Dev-done", "QA-done", "Points", "Dev Est."];

    const thead = el("thead", {}, [
      el("tr", {}, [
        el("th", { class: "col-parent", text: "Work Item" }),
        ...SUMMARY_COLUMNS.map(label => el("th", { class: "summary-col", text: label })),
        ...columns.map(status => el("th", { text: status }))
      ])
    ]);
    const tbody = el("tbody");

    group.parents.forEach(parent => {
      const parentRows = parent.rows;

      const parentCellChildren = [el("h3", { class: "parent-id", text: parent.id })];
      const descRecord = descMap[parent.id];
      if (descRecord && descRecord.desc) {
        parentCellChildren.push(el("h4", { class: "parent-summary", text: descRecord.summary }));
        parentCellChildren.push(el("p", { class: "parent-desc", text: descRecord.desc }));
      }

      const stats = computeParentStats(parentRows);
      const isDevDone = stats.total > 0 && stats.devDone === stats.total;
      const isQaDone = stats.total > 0 && stats.qaDone === stats.total;
      const isDevZero = stats.total > 0 && stats.devDone === 0;
      const isQaZero = stats.total > 0 && stats.qaDone === 0;

      function statValue(value, badgeVariant) {
        if (badgeVariant) {
          return el("span", { class: "parent-stat-value" }, [el("span", { class: `summary-badge summary-badge-${badgeVariant}`, text: value })]);
        }
        return el("span", { class: "parent-stat-value", text: value });
      }

      const statsBlock = el("div", { class: "parent-stats" }, [
        el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label", text: "Total" }),
          statValue(String(stats.total), null)
        ]),
        el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label", text: "Dev-done" }),
          statValue(String(stats.devDone), isDevDone ? "green" : isDevZero ? "red" : null)
        ]),
        el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label", text: "QA-done" }),
          statValue(String(stats.qaDone), isQaDone ? "green" : isQaZero ? "red" : null)
        ])
      ]);
      parentCellChildren.push(statsBlock);

      const effortRecord = effortMap[parent.id];
      const effortBlock = el("div", { class: "parent-stats" },
        EFFORT_FIELDS.map(f => el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label", text: f.label }),
          el("span", { class: "parent-stat-value", text: formatEffort(f.key, effortRecord && effortRecord[f.key]) })
        ]))
      );
      parentCellChildren.push(effortBlock);

      const parentCell = el("th", { class: "col-parent" }, parentCellChildren);
      const row = el("tr", {}, [parentCell]);

      function summaryCell(value, badgeVariant) {
        if (badgeVariant) {
          return el("td", { class: "summary-cell" }, [el("span", { class: `summary-badge summary-badge-${badgeVariant}`, text: value })]);
        }
        return el("td", { class: "summary-cell", text: value });
      }

      row.appendChild(summaryCell(String(stats.total), null));
      row.appendChild(summaryCell(String(stats.devDone), isDevDone ? "green" : isDevZero ? "red" : null));
      row.appendChild(summaryCell(String(stats.qaDone), isQaDone ? "green" : isQaZero ? "red" : null));
      row.appendChild(summaryCell(formatEffort("points", effortRecord && effortRecord.points), null));
      row.appendChild(summaryCell(formatEffort("dev_est", effortRecord && effortRecord.dev_est), null));

      columns.forEach(status => {
        const matches = parentRows.filter(r => r.status === status);
        const cell = el("td", { class: "status-cell" });
        if (matches.length === 0) {
          cell.appendChild(el("span", { class: "empty-cell", text: "—" }));
        } else {
          const list = el("div", { class: "ticket-list" });
          matches.forEach(r => {
            const item = el("div", { class: "ticket-item" }, [
              el("span", { class: "ticket-id", text: r.child })
            ]);
            if (r.intermediate) item.appendChild(el("span", { class: "ticket-via", text: `via ${r.intermediate}` }));
            list.appendChild(item);
          });
          cell.appendChild(list);
        }
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    const tableWrap = el("div", { class: "table-wrap" }, [el("table", {}, [thead, tbody])]);

    const parentCount = group.parents.length;
    const ticketCount = groupRows.length;
    const totalPoints = group.parents.reduce((sum, parent) => {
      const points = Number(effortMap[parent.id] && effortMap[parent.id].points);
      return sum + (Number.isFinite(points) ? points : 0);
    }, 0);
    const summary = el("summary", { class: "release-title" }, [
      el("span", { class: "release-badge", text: group.release }),
      el("span", {
        class: "release-meta",
        text: `${parentCount} parent epic${parentCount === 1 ? "" : "s"} · ${ticketCount} child ticket${ticketCount === 1 ? "" : "s"} · ${totalPoints} total points`
      })
    ]);

    const details = el("details", { class: "release-section" }, [summary, legend, tableWrap]);
    details.open = true;
    return details;
  }

  function renderReport(rows, descriptions, efforts) {
    const descMap = buildDescriptionMap(descriptions);
    const effortMap = buildEffortMap(descriptions);
    const parents = buildParents(rows);
    const releaseGroups = buildReleaseGroups(parents, descMap, descriptions);

    const root = document.getElementById("report-root");
    root.innerHTML = "";
    releaseGroups.forEach(group => root.appendChild(buildReleaseSection(group, descMap, effortMap)));

    document.getElementById("report-footer").textContent =
      `${releaseGroups.length} release${releaseGroups.length === 1 ? "" : "s"} · ${parents.length} parent epics · ${rows.length} child tickets · rendered from the JSON below`;
  }

  let currentRows = ORIGINAL_DATA;
  let currentDescriptions = ORIGINAL_DESCRIPTIONS;
  let currentEfforts = ORIGINAL_EFFORTS;

  function rerender() {
    renderReport(currentRows, currentDescriptions, currentEfforts);
  }

  document.getElementById("toggle-monitor").addEventListener("change", e => {
    showMonitorOnly = e.target.checked;
    rerender();
  });

  const toggleColumnsInput = document.getElementById("toggle-columns");
  const toggleMonitorLabel = document.getElementById("toggle-monitor").closest(".toggle-control");

  function syncColumnsToggle(checked) {
    document.getElementById("report-root").classList.toggle("columns-collapsed", checked);
    toggleMonitorLabel.style.display = checked ? "none" : "";
  }

  syncColumnsToggle(toggleColumnsInput.checked);
  toggleColumnsInput.addEventListener("change", e => syncColumnsToggle(e.target.checked));

  const optionsModal = document.getElementById("options-modal");
  document.getElementById("open-options").addEventListener("click", () => optionsModal.showModal());
  document.getElementById("close-options").addEventListener("click", () => optionsModal.close());
  optionsModal.addEventListener("click", e => {
    if (e.target === optionsModal) optionsModal.close();
  });

  function wireEditor({ textareaId, statusId, applyId, resetId, downloadId, get, set, downloadName }) {
    const editor = document.getElementById(textareaId);
    const statusEl = document.getElementById(statusId);

    function setStatus(msg, state) {
      statusEl.textContent = msg;
      statusEl.dataset.state = state || "";
    }

    function load(data) {
      editor.value = JSON.stringify(data, null, 2);
      set(data);
      try {
        rerender();
        setStatus("Rendered.", "ok");
      } catch (err) {
        setStatus("Render error: " + err.message, "error");
      }
    }

    document.getElementById(applyId).addEventListener("click", () => {
      try {
        const parsed = JSON.parse(editor.value);
        set(parsed);
        rerender();
        setStatus("Applied.", "ok");
      } catch (err) {
        setStatus("Invalid JSON: " + err.message, "error");
      }
    });

    document.getElementById(resetId).addEventListener("click", () => {
      load(get.original());
    });

    document.getElementById(downloadId).addEventListener("click", () => {
      let parsed;
      try {
        parsed = JSON.parse(editor.value);
      } catch (err) {
        setStatus("Invalid JSON: " + err.message, "error");
        return;
      }
      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
    });

    load(get.original());
  }

  wireEditor({
    textareaId: "json-editor",
    statusId: "editor-status",
    applyId: "apply-btn",
    resetId: "reset-btn",
    downloadId: "download-btn",
    get: { original: () => ORIGINAL_DATA },
    set: data => { currentRows = data; },
    downloadName: "release-progress.json"
  });

  wireEditor({
    textareaId: "desc-json-editor",
    statusId: "desc-editor-status",
    applyId: "desc-apply-btn",
    resetId: "desc-reset-btn",
    downloadId: "desc-download-btn",
    get: { original: () => ORIGINAL_DESCRIPTIONS },
    set: data => { currentDescriptions = data; },
    downloadName: "release-progress-descriptions.json"
  });

  wireEditor({
    textareaId: "effort-json-editor",
    statusId: "effort-editor-status",
    applyId: "effort-apply-btn",
    resetId: "effort-reset-btn",
    downloadId: "effort-download-btn",
    get: { original: () => ORIGINAL_EFFORTS },
    set: data => { currentEfforts = data; },
    downloadName: "release-progress-effort.json"
  });