    const taskDetails = window.taskDetails;    
    const taskDetailMap = Object.fromEntries(taskDetails.map(t => [t.task, t]));
    const raw = window.workLogsData;
  

    const PERSON_COLORS = [
      { bg: "#e8f0fe", text: "#1a56db" },
      { bg: "#fce8f3", text: "#bf125d" },
      { bg: "#e3fcec", text: "#057a55" },
      { bg: "#fdf6e3", text: "#8a5e00" },
      { bg: "#f0f4ff", text: "#5145cd" },
      { bg: "#fff0f0", text: "#c81e1e" },
      { bg: "#e8faf4", text: "#046c4e" },
      { bg: "#fef3c7", text: "#92400e" },
    ];

    function toISO(dateStr) {
      const [m, d, y] = dateStr.split("/");
      return `${y}-${m}-${d}`;
    }

    function fmtDisplay(iso) {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    function sortTickets(a, b) {
      const [pa, na] = a.split("-");
      const [pb, nb] = b.split("-");
      if (pa !== pb) return pa.localeCompare(pb);
      return parseInt(na, 10) - parseInt(nb, 10);
    }

    function fmtHours(h) {
      const rounded = Math.round(Number(h) * 100) / 100;
      return rounded + "h";
    }

    const allDates = [...new Set(raw.map(r => toISO(r.date)))].sort();
    const allNames = [...new Set(raw.map(r => r.name))].sort();
    const nameColorMap = Object.fromEntries(
      allNames.map((n, i) => [n, PERSON_COLORS[i % PERSON_COLORS.length]])
    );

    // Populate dev dropdown
    const devFilter = document.getElementById("devFilter");
    allNames.forEach(n => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      devFilter.appendChild(opt);
    });

    // Populate legend
    const legend = document.getElementById("legend");
    allNames.forEach(n => {
      const c = nameColorMap[n];
      const span = document.createElement("span");
      span.className = "legend-badge";
      span.style.background = c.bg;
      span.style.color = c.text;
      span.textContent = n;
      legend.appendChild(span);
    });

    // Set default date range: rolling 7 days (today - 7 days, to today)
    const fromInput = document.getElementById("from");
    const toInput = document.getElementById("to");
    const ticketFilter = document.getElementById("ticketFilter");

    function toLocalISO(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    fromInput.value = toLocalISO(twoWeeksAgo);
    toInput.value = toLocalISO(today);
    
    function render() {
      const from = fromInput.value;
      const to = toInput.value;
      const selectedName = devFilter.value;
      const ticketSearch = ticketFilter.value.trim().toLowerCase();
      const container = document.getElementById("tableContainer");

      const dates = allDates.filter(d => d >= from && d <= to);

      const filtered = raw.filter(r => {
        const iso = toISO(r.date);
        return iso >= from && iso <= to && (selectedName === "all" || r.name === selectedName);
      });

      const tickets = [...new Set(filtered.map(r => r.task))]
        .filter(t => t.toLowerCase().includes(ticketSearch))
        .sort(sortTickets);

      // Build matrix: task -> iso -> name -> total hours
      const matrix = {};
      filtered.forEach(r => {
        const iso = toISO(r.date);
        if (!matrix[r.task]) matrix[r.task] = {};
        if (!matrix[r.task][iso]) matrix[r.task][iso] = {};
        if (!matrix[r.task][iso][r.name]) matrix[r.task][iso][r.name] = 0;
        matrix[r.task][iso][r.name] += r.hours;
      });

      document.getElementById("stats").textContent =
        `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""} · ${dates.length} date${dates.length !== 1 ? "s" : ""}`;

      if (tickets.length === 0) {
        container.innerHTML = '<p class="no-data">No data for selected range.</p>';
        return;
      }

      const table = document.createElement("table");

      // thead
      const thead = table.createTHead();
      const headRow = thead.insertRow();
      const thTicket = document.createElement("th");
      thTicket.className = "sticky";
      thTicket.textContent = "Ticket";
      headRow.appendChild(thTicket);
      dates.forEach(iso => {
        const th = document.createElement("th");
        th.textContent = fmtDisplay(iso);
        headRow.appendChild(th);
      });

      // tbody
      const tbody = table.createTBody();
      const no_desc_tickets = [];
      tickets.forEach((ticket, i) => {
        const row = tbody.insertRow();
        row.style.background = i % 2 === 0 ? "#ffffff" : "#fafafa";

        const tdKey = row.insertCell();
        tdKey.className = "sticky";
        const detail = taskDetailMap[ticket];

        const keySpan = document.createElement("span");
        keySpan.className = "ticket-key";
        keySpan.textContent = ticket;
        tdKey.appendChild(keySpan);

        if (detail && detail.release) {
          const releaseSpan = document.createElement("span");
          releaseSpan.className = "ticket-release";
          releaseSpan.textContent = detail.release;
          tdKey.appendChild(releaseSpan);
        }

        if (detail) {
          const desc = document.createElement("div");
          desc.className = "ticket-desc";
          desc.textContent = detail.desc;
          tdKey.appendChild(desc);

          const meta = document.createElement("div");
          meta.className = "ticket-meta";
          meta.textContent = `dev: ${detail.dev} · qa: ${detail.qa}`;
          tdKey.appendChild(meta);
        } else {
          no_desc_tickets.push(ticket);           
        }

        dates.forEach(iso => {
          const td = row.insertCell();
          const nameHours = matrix[ticket] && matrix[ticket][iso]
            ? Object.entries(matrix[ticket][iso])
            : [];

          if (nameHours.length > 0) {
            const wrap = document.createElement("div");
            wrap.className = "cell-names";
            nameHours.forEach(([name, hours]) => {
              const c = nameColorMap[name];
              const badge = document.createElement("span");
              badge.className = "name-badge";
              badge.style.background = c.bg;
              badge.style.color = c.text;

              const nameNode = document.createTextNode(name);
              badge.appendChild(nameNode);

              const pill = document.createElement("span");
              pill.className = "hours-pill";
              pill.textContent = fmtHours(hours);
              badge.appendChild(pill);

              wrap.appendChild(badge);
            });
            td.appendChild(wrap);
          } else {
            const dash = document.createElement("span");
            dash.className = "empty-cell";
            dash.textContent = "—";
            td.appendChild(dash);
          }
        });
      });

      // TOTALS row: per-date, per-person hour totals across all displayed tickets
      const totalsRow = tbody.insertRow();
      totalsRow.className = "totals-row";

      const tdTotalsLabel = totalsRow.insertCell();
      tdTotalsLabel.className = "sticky";
      const totalsLabel = document.createElement("span");
      totalsLabel.className = "totals-label";
      totalsLabel.textContent = "TOTALS";
      tdTotalsLabel.appendChild(totalsLabel);

      dates.forEach(iso => {
        const td = totalsRow.insertCell();

        // Sum hours per person for this date across every displayed ticket
        const perPerson = {};
        tickets.forEach(ticket => {
          const cell = matrix[ticket] && matrix[ticket][iso];
          if (!cell) return;
          Object.entries(cell).forEach(([name, hours]) => {
            perPerson[name] = (perPerson[name] || 0) + hours;
          });
        });

        const entries = Object.entries(perPerson).sort((a, b) => a[0].localeCompare(b[0]));
        const dailyTotal = entries.reduce((sum, [, h]) => sum + h, 0);

        // Daily grand total line
        const daily = document.createElement("div");
        daily.className = "totals-daily" + (dailyTotal === 0 ? " zero" : "");
        daily.textContent = "Σ " + fmtHours(dailyTotal);
        td.appendChild(daily);

        // Per-person breakdown
        if (entries.length > 0) {
          const wrap = document.createElement("div");
          wrap.className = "cell-names";
          entries.forEach(([name, hours]) => {
            const c = nameColorMap[name];
            const badge = document.createElement("span");
            badge.className = "name-badge";
            badge.style.background = c.bg;
            badge.style.color = c.text;
            badge.appendChild(document.createTextNode(name));

            const pill = document.createElement("span");
            pill.className = "hours-pill";
            pill.textContent = fmtHours(hours);
            badge.appendChild(pill);

            wrap.appendChild(badge);
          });
          td.appendChild(wrap);
        }
      });

      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      wrap.appendChild(table);
      container.innerHTML = "";
      container.appendChild(wrap);

      console.log("No Desc Tickets:",no_desc_tickets);
    }

    fromInput.addEventListener("change", render);
    toInput.addEventListener("change", render);
    devFilter.addEventListener("change", render);
    ticketFilter.addEventListener("input", render);

    render();