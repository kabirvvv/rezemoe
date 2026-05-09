// ============================================================
// SCHEDULE PAGE — Shirayuki Scrapper API V2
// ============================================================
const SchedulePage = (() => {
  const render = async () => {
    UI.setTitle("Schedule");
    const today  = new Date().toISOString().split("T")[0];
    const tzOff  = -new Date().getTimezoneOffset(); // minutes, matching Shirayuki

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 3 + i);
      return d.toISOString().split("T")[0];
    });

    const tabs = days.map((d) => {
      const lbl = new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
      return `<button class="sched-tab ${d === today ? "sched-tab--active" : ""}" data-date="${d}">${lbl}</button>`;
    }).join("");

    UI.render(`
      <div class="schedule-page container">
        <div class="page-header"><h1 class="page-title">Airing Schedule</h1></div>
        <div class="sched-tabs" id="sched-tabs">${tabs}</div>
        <div id="sched-list">${skeletonRows()}</div>
      </div>`);

    document.querySelectorAll(".sched-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".sched-tab").forEach((t) => t.classList.remove("sched-tab--active"));
        tab.classList.add("sched-tab--active");
        loadSchedule(tab.dataset.date, tzOff);
      });
    });

    loadSchedule(today, tzOff);
  };

  const skeletonRows = () =>
    Array(8).fill(`<div class="sched-item sched-item--skel skeleton-box"></div>`).join("");

  const loadSchedule = async (date, tzOffset) => {
    const list = document.getElementById("sched-list");
    list.innerHTML = skeletonRows();
    try {
      const raw   = await API.getSchedule(date, tzOffset);
      // shape: { scheduledAnimes: [{id, name, episode, time, ...}] }
    const items = raw.schedule || raw.scheduledAnimes || raw.animes || (Array.isArray(raw) ? raw : []);

      list.innerHTML = items.length
        ? items.map((item) => {
            const id    = item.id || item.animeId || "";
            const title = item.name || item.title || "";
            const ep    = item.episode || item.episodeNo || "?";
            const time  = item.time || "--:--";
            return `
              <a class="sched-item" href="#anime?id=${encodeURIComponent(id)}"
                 onclick="event.preventDefault();Router.navigate('anime?id=${encodeURIComponent(id)}')">
                <span class="sched-item__time">${time}</span>
                <span class="sched-item__title">${title}</span>
                <span class="sched-item__ep">EP ${ep}</span>
                <svg class="sched-item__arrow" viewBox="0 0 24 24">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </a>`;
          }).join("")
        : `<div class="empty-state"><p>No schedule data for this day.</p></div>`;
    } catch (e) {
      list.innerHTML = `<div class="error-text">Failed to load schedule: ${e.message}</div>`;
    }
  };

  return { render };
})();

window.SchedulePage = SchedulePage;
