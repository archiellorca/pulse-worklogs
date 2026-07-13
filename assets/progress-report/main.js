// Flat records — one per CSV row: parent, intermediate, child, status.
  const ORIGINAL_DATA = [
    { parent: "PLS-1960", intermediate: "", child: "PLS-1529", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "", child: "PLS-1530", status: "Monitor only" },
    { parent: "PLS-1960", intermediate: "", child: "PLS-1863", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "", child: "PLS-1864", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "", child: "PLS-1871", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1554", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1555", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1556", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1557", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1584", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1714", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1732", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1750", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1751", status: "Release Ready" },
    { parent: "PLS-1960", intermediate: "PLS-1530", child: "PLS-1815", status: "Release Ready" },
    { parent: "PLS-1523", intermediate: "", child: "PLS-1568", status: "QA In-Progress" },
    { parent: "PLS-1523", intermediate: "", child: "PLS-1569", status: "Monitor only" },
    { parent: "PLS-1523", intermediate: "", child: "PLS-1604", status: "QA In-Progress" },
    { parent: "PLS-1523", intermediate: "", child: "PLS-1637", status: "Done" },
    { parent: "PLS-1780", intermediate: "", child: "PLS-1571", status: "Monitor only" },
    { parent: "PLS-1780", intermediate: "PLS-1571", child: "PLS-1793", status: "Release Ready" },
    { parent: "PLS-1780", intermediate: "PLS-1571", child: "PLS-1794", status: "Release Ready" },
    { parent: "PLS-1780", intermediate: "PLS-1571", child: "PLS-1795", status: "Release Ready" },
    { parent: "PLS-1780", intermediate: "PLS-1571", child: "PLS-1796", status: "For Code Review" },
    { parent: "PLS-1780", intermediate: "PLS-1571", child: "PLS-1868", status: "Release Ready" },
    { parent: "PLS-1780", intermediate: "", child: "PLS-1602", status: "QA In-Progress" },
    { parent: "PLS-1780", intermediate: "", child: "PLS-1640", status: "QA In-Progress" },
    { parent: "PLS-1780", intermediate: "", child: "PLS-1862", status: "Release Ready" },
    { parent: "PLS-1781", intermediate: "", child: "PLS-1572", status: "Monitor only" },
    { parent: "PLS-1781", intermediate: "", child: "PLS-1603", status: "For QA Review" },
    { parent: "PLS-1781", intermediate: "", child: "PLS-1639", status: "For QA Review" }
  ];

  // Parent key → release + description lookup, kept as its own JSON source.
  // "release" groups parents into their own table, in order of first appearance.
  const ORIGINAL_DESCRIPTIONS = [
    { release: "v3.1.1", parent: "PLS-1960", desc: "this is desc of parent" },
    { release: "rc.50", parent: "PLS-1523", desc: "this is desc of parent" },
    { release: "v3.1.1", parent: "PLS-1780", desc: "this is desc of parent" },
    { release: "rc.50", parent: "PLS-1781", desc: "this is desc of parent" }
  ];

  // Parent key → dev/QA effort lookup, kept as its own JSON source.
  const ORIGINAL_EFFORTS = [
    { parent: "PLS-1960", dev_est: 3, dev_time: 2, qa_est: 2, qa_time: 2 },
    { parent: "PLS-1523", dev_est: 0, dev_time: 0, qa_est: 0, qa_time: 0 },
    { parent: "PLS-1780", dev_est: 0, dev_time: 0, qa_est: 0, qa_time: 0 },
    { parent: "PLS-1781", dev_est: 0, dev_time: 0, qa_est: 0, qa_time: 0 }
  ];

  const KNOWN_STATUS_VARS = {
    "monitor-only": "monitor",
    "qa-in-progress": "qa-progress",
    "for-qa-review": "qa-review",
    "for-code-review": "code-review",
    "release-ready": "release-ready",
    "done": "done"
  };

  // Preferred pipeline order for known statuses; anything else is appended
  // in the order it first appears in the data.
  const PREFERRED_STATUS_ORDER = [
    "Monitor only",
    "QA In-Progress",
    "For QA Review",
    "For Code Review",
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
    { key: "dev_est", label: "Dev Est." },
    { key: "dev_time", label: "Dev Time" },
    { key: "qa_est", label: "QA Est." },
    { key: "qa_time", label: "QA Time" }
  ];

  function formatEffort(n) {
    const num = Number(n);
    return Number.isFinite(num) ? num.toFixed(2) : "—";
  }

  // Groups parents into per-release buckets, in order of first appearance.
  // Parents with no matching description entry (or no release on it) land
  // in a shared "No release" bucket.
  function buildReleaseGroups(parents, descMap) {
    const order = [];
    const map = new Map();
    parents.forEach(p => {
      const rec = descMap[p.id];
      const release = (rec && rec.release) ? rec.release : "No release";
      if (!map.has(release)) { map.set(release, []); order.push(release); }
      map.get(release).push(p);
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

    const thead = el("thead", {}, [
      el("tr", {}, [el("th", { class: "col-parent", text: "Work Item" }), ...columns.map(status => el("th", { text: status }))])
    ]);
    const tbody = el("tbody");

    group.parents.forEach(parent => {
      const parentRows = parent.rows;

      const parentCellChildren = [el("div", { class: "parent-id", text: parent.id })];
      const descRecord = descMap[parent.id];
      if (descRecord && descRecord.desc) parentCellChildren.push(el("div", { class: "parent-desc", text: descRecord.desc }));

      const stats = computeParentStats(parentRows);
      const statsBlock = el("div", { class: "parent-stats" }, [
        el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label", text: "Total" }),
          el("span", { class: "parent-stat-value", text: String(stats.total) })
        ]),
        el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label", text: "Dev-done" }),
          el("span", { class: "parent-stat-value", text: String(stats.devDone) })
        ]),
        el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label", text: "QA-done" }),
          el("span", { class: "parent-stat-value", text: String(stats.qaDone) })
        ])
      ]);
      parentCellChildren.push(statsBlock);

      const effortRecord = effortMap[parent.id];
      const effortBlock = el("div", { class: "parent-stats" },
        EFFORT_FIELDS.map(f => el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label", text: f.label }),
          el("span", { class: "parent-stat-value", text: formatEffort(effortRecord && effortRecord[f.key]) })
        ]))
      );
      parentCellChildren.push(effortBlock);

      const parentCell = el("th", { class: "col-parent" }, parentCellChildren);
      const row = el("tr", {}, [parentCell]);

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
    const title = el("div", { class: "release-title" }, [
      el("span", { class: "release-badge", text: group.release }),
      el("span", {
        class: "release-meta",
        text: `${parentCount} parent epic${parentCount === 1 ? "" : "s"} · ${ticketCount} child ticket${ticketCount === 1 ? "" : "s"}`
      })
    ]);

    return el("section", { class: "release-section" }, [title, legend, tableWrap]);
  }

  function renderReport(rows, descriptions, efforts) {
    const descMap = buildDescriptionMap(descriptions);
    const effortMap = buildEffortMap(efforts);
    const parents = buildParents(rows);
    const releaseGroups = buildReleaseGroups(parents, descMap);

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