// Flat records — one per CSV row: parent, intermediate, child, status.
  const ORIGINAL_DATA = window.ticketStatusData;

  // Parent key → release + description lookup, kept as its own JSON source.
  // "release" groups parents into their own table, in order of first appearance.
  const ORIGINAL_DESCRIPTIONS = window.ticketsData; 

  // Parent key → dev/QA worklog lookup, kept as its own JSON source.
  const ORIGINAL_EFFORTS = window.workLogsData;

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
    { key: "dev_be_names", label: "Dev BE" },
    { key: "dev_be_hours", label: "Dev BE Hours" },
    { key: "dev_fe_names", label: "Dev FE" },
    { key: "dev_fe_hours", label: "Dev FE Hours" },
    { key: "qa_est", label: "QA Est." },
    { key: "qa_names", label: "QA" },
    { key: "qa_hours", label: "QA Hours" }
  ];

  // Placeholder stats — computation rules not defined yet, always shown as zero.
  const ZERO_EFFORT_FIELDS = new Set();

  // QA Est. is summed from the qa_est field on each of the parent's rows in
  // ORIGINAL_DATA (ticketStatusData), not from the effort/description source.
  function sumQaEst(parentRows) {
    return parentRows.reduce((sum, r) => {
      const n = Number(r.qa_est);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  // Name → role groups for attributing worklog hours (ORIGINAL_EFFORTS / workLogsData).
  const FE_DEV_NAMES = new Set(["Armin", "John"]);
  const BE_DEV_NAMES = new Set(["Ian", "Christopher", "Ryan", "Jay"]);
  const QA_NAMES = new Set(["Kristine", "Jazel", "Kate"]);

  function firstNameOf(fullName) {
    return String(fullName || "").trim().split(/\s+/)[0] || "";
  }

  // Collates unique first names from the "dev" and "qa" fields on each of the
  // parent's rows in ORIGINAL_DATA (ticketStatusData). "dev" values whose first
  // name is Armin/John are grouped under dev-fe, the rest under dev-be.
  function collateDevQaNames(parentRows) {
    const devBe = new Set();
    const devFe = new Set();
    const qa = new Set();
    parentRows.forEach(r => {
      const dev = firstNameOf(r.dev);
      if (dev) (FE_DEV_NAMES.has(dev) ? devFe : devBe).add(dev);
      const qaName = firstNameOf(r.qa);
      if (qaName) qa.add(qaName);
    });
    return { devBe: [...devBe], devFe: [...devFe], qa: [...qa] };
  }

  // Groups worklog hours by task (child ticket id), split into be/fe/qa buckets
  // by the logger's name. Built once per render and reused across all parents.
  function buildWorklogHoursByTask(worklogs) {
    const map = new Map();
    (worklogs || []).forEach(w => {
      if (!w || !w.task) return;
      const hours = Number(w.hours);
      if (!Number.isFinite(hours)) return;
      let bucket = map.get(w.task);
      if (!bucket) { bucket = { be: 0, fe: 0, qa: 0 }; map.set(w.task, bucket); }
      if (BE_DEV_NAMES.has(w.name)) bucket.be += hours;
      else if (FE_DEV_NAMES.has(w.name)) bucket.fe += hours;
      else if (QA_NAMES.has(w.name)) bucket.qa += hours;
    });
    return map;
  }

  // dev-be-hours / dev-fe-hours / qa-hours: total worklog hours logged against
  // this parent's child tickets (not the parent itself), split by role.
  function sumWorklogHours(parentRows, worklogHoursByTask) {
    let be = 0, fe = 0, qa = 0;
    parentRows.forEach(r => {
      const bucket = r.child ? worklogHoursByTask.get(r.child) : null;
      if (bucket) { be += bucket.be; fe += bucket.fe; qa += bucket.qa; }
    });
    return { devBeHours: be, devFeHours: fe, qaHours: qa };
  }

  // --- Work calendar (per-parent weekly worklog grid) ---

  const CALENDAR_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  function parseWorklogDate(dateStr) {
    const [m, d, y] = String(dateStr).split("/").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  function formatCalendarDate(date) {
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `${mm}/${dd}/${date.getUTCFullYear()}`;
  }

  function formatCalendarDateShort(date) {
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `${mm}/${dd}`;
  }

  // ISO 8601 week number (Monday-start) + the ISO year it belongs to, since
  // the last/first days of a year can fall in a week owned by the other year.
  function getISOWeekInfo(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const isoDayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
    d.setUTCDate(d.getUTCDate() - isoDayNum + 3); // Thursday of this ISO week
    const isoYear = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { isoYear, week };
  }

  function getMondayOfISOWeek(isoYear, week) {
    const jan4 = new Date(Date.UTC(isoYear, 0, 4));
    const jan4DayNum = (jan4.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - jan4DayNum);
    const monday = new Date(week1Monday);
    monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
    return monday;
  }

  // Worklogs whose task is one of this parent's child tickets, sorted by date.
  function getParentWorklogs(parentRows, worklogs) {
    const childIds = new Set(parentRows.map(r => r.child).filter(Boolean));
    return (worklogs || [])
      .filter(w => w && w.task && childIds.has(w.task))
      .map(w => ({ ...w, dateObj: parseWorklogDate(w.date) }))
      .sort((a, b) => a.dateObj - b.dateObj);
  }

  // Buckets sorted worklog entries into ISO week rows, each split across Mon-Fri.
  function buildWorkCalendarWeeks(entries) {
    const weekMap = new Map();
    const weekOrder = [];
    entries.forEach(e => {
      const { isoYear, week } = getISOWeekInfo(e.dateObj);
      const key = `${isoYear}-${week}`;
      if (!weekMap.has(key)) {
        weekMap.set(key, { isoYear, week, days: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] } });
        weekOrder.push(key);
      }
      const isoDayNum = (e.dateObj.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
      const dayName = CALENDAR_WEEKDAYS[isoDayNum];
      if (dayName) weekMap.get(key).days[dayName].push(e);
    });
    return weekOrder.map(key => weekMap.get(key));
  }

  function buildWorkCalendarTable(parentRows, worklogs) {
    const entries = getParentWorklogs(parentRows, worklogs);
    const weeks = buildWorkCalendarWeeks(entries);

    const thead = el("thead", {}, [
      el("tr", {}, ["Week", ...CALENDAR_WEEKDAYS].map(label => el("th", { text: label })))
    ]);

    const tbody = el("tbody", {}, weeks.map(w => {
      const monday = getMondayOfISOWeek(w.isoYear, w.week);
      const friday = new Date(monday);
      friday.setUTCDate(monday.getUTCDate() + 4);
      const weekLabel = `${formatCalendarDate(monday)} ${formatCalendarDate(friday)}`;

      const weekCell = el("td", { class: "calendar-week-cell", text: weekLabel });
      const dayCells = CALENDAR_WEEKDAYS.map(day => el("td", { class: "calendar-day-cell" },
        w.days[day].map(entry => el("div", {
          class: "calendar-entry",
          text: `${formatCalendarDateShort(entry.dateObj)} ${entry.task} ${entry.name} ${entry.hours}`
        }))
      ));

      return el("tr", {}, [weekCell, ...dayCells]);
    }));

    return el("table", { class: "work-calendar-table" }, [thead, tbody]);
  }

  function formatEffort(key, n) {console.log(key);
    if (ZERO_EFFORT_FIELDS.has(key)) return "0";
    const num = Number(n);
    if (Number.isFinite(num)) {
      if (key === "points") return n;
      if (key === "dev_est" || key === "qa_est" || key === "dev_be_hours" || key === "dev_fe_hours" || key === "qa_hours") {
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

  function buildReleaseSection(group, descMap, effortMap, worklogHoursByTask, worklogs) {
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

      const descRecord = descMap[parent.id];
      const parentIdHeading = el("h3", { class: "parent-id" }, [document.createTextNode(parent.id)]);
      if (descRecord && descRecord.idea) {
        parentIdHeading.appendChild(el("span", { class: "parent-idea", text: descRecord.idea }));
      }
      const parentCellChildren = [parentIdHeading];
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
          statValue(String(stats.total), "transparent")
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
      const qaEstTotal = sumQaEst(parentRows);
      const worklogHours = sumWorklogHours(parentRows, worklogHoursByTask);
      const WORKLOG_HOUR_VALUES = {
        dev_be_hours: worklogHours.devBeHours * 60,
        dev_fe_hours: worklogHours.devFeHours * 60,
        qa_hours: worklogHours.qaHours * 60
      };
      const collatedNames = collateDevQaNames(parentRows);
      const NAME_VALUES = {
        dev_be_names: collatedNames.devBe.join(", ") || "—",
        dev_fe_names: collatedNames.devFe.join(", ") || "—",
        qa_names: collatedNames.qa.join(", ") || "—"
      };
      const effortBlock = el("div", { class: "parent-stats" },
        EFFORT_FIELDS.map(f => el("div", { class: "parent-stat" }, [
          el("span", { class: "parent-stat-label " + f.key, text: f.label }),
          el("span", {
            class: "parent-stat-value",
            text: f.key === "qa_est" ? formatEffort("qa_est", qaEstTotal * 60)
              : f.key in NAME_VALUES ? NAME_VALUES[f.key]
              : f.key in WORKLOG_HOUR_VALUES ? formatEffort(f.key, WORKLOG_HOUR_VALUES[f.key])
              : formatEffort(f.key, effortRecord && effortRecord[f.key])
          })
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

      const calendarCell = el("td", { class: "work-calendar-cell" }, [
        el("h3", { class:"parent-id", text: `${parent.id} Calendar` }),
        buildWorkCalendarTable(parentRows, worklogs)
      ]);
      calendarCell.setAttribute("colspan", String(1 + SUMMARY_COLUMNS.length + columns.length));
      tbody.appendChild(el("tr", { class: "work-calendar" }, [calendarCell]));
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
    const worklogHoursByTask = buildWorklogHoursByTask(efforts);
    const parents = buildParents(rows);
    const releaseGroups = buildReleaseGroups(parents, descMap, descriptions);

    const root = document.getElementById("report-root");
    root.innerHTML = "";
    releaseGroups.forEach(group => root.appendChild(buildReleaseSection(group, descMap, effortMap, worklogHoursByTask, efforts)));

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
  const toggleCalendarLabel = document.getElementById("toggle-calendar").closest(".toggle-control");

  function syncColumnsToggle(showKanban) {
    document.getElementById("report-root").classList.toggle("columns-collapsed", !showKanban);
    toggleMonitorLabel.style.display = showKanban ? "" : "none";
    toggleCalendarLabel.style.display = showKanban ? "" : "none";
  }

  syncColumnsToggle(toggleColumnsInput.checked);
  toggleColumnsInput.addEventListener("change", e => syncColumnsToggle(e.target.checked));

  const toggleCalendarInput = document.getElementById("toggle-calendar");
  document.getElementById("report-root").classList.toggle("show-calendar", toggleCalendarInput.checked);
  toggleCalendarInput.addEventListener("change", e => {
    document.getElementById("report-root").classList.toggle("show-calendar", e.target.checked);
  });

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