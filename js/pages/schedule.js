// ============================================================
// SCHEDULE PAGE
// ============================================================
const SchedulePage = (() => {
  const render = async () => {
    UI.setTitle("Schedule");
    const today = new Date().toISOString().split("T")[0];

    // Build last 7 days tabs
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 3 + i);
      return d.toISOString().split("T")[0];
    });

    const tabsHtml = days
      .map((d) => {
        const label = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return `<button class="sched-tab ${d === today ? "sched-tab--active" : ""}" data-date="${d}">${label}</button>`;
      })
      .join("");

    UI.render(`
      <div class="schedule-page container">
        <div class="page-header">
          <h1 class="page-title">Airing Schedule</h1>
        </div>
        <div class="sched-tabs" id="sched-tabs">${tabsHtml}</div>
        <div id="sched-list">${skeletonRows()}</div>
      </div>`);

    document.querySelectorAll(".sched-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".sched-tab").forEach((t) => t.classList.remove("sched-tab--active"));
        tab.classList.add("sched-tab--active");
        loadSchedule(tab.dataset.date);
      });
    });

    loadSchedule(today);
  };

  const skeletonRows = () =>
    Array(8).fill(`<div class="sched-item sched-item--skel skeleton-box"></div>`).join("");

  const loadSchedule = async (date) => {
    const list = document.getElementById("sched-list");
    list.innerHTML = skeletonRows();
    try {
      const data = await API.getSchedule(date);
      const items = Array.isArray(data) ? data : [];
      list.innerHTML = items.length
        ? items.map((item) => `
            <a class="sched-item" href="#anime?id=${encodeURIComponent(item.id)}" onclick="event.preventDefault();Router.navigate('anime?id=${encodeURIComponent(item.id)}')">
              <span class="sched-item__time">${item.time || "--:--"}</span>
              <span class="sched-item__title">${item.title}</span>
              <span class="sched-item__ep">EP ${item.episode_no || "?"}</span>
              <svg class="sched-item__arrow" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
            </a>`).join("")
        : `<div class="empty-state"><p>No schedule data for this day.</p></div>`;
    } catch {
      list.innerHTML = `<div class="error-text">Failed to load schedule.</div>`;
    }
  };

  return { render };
})();

window.SchedulePage = SchedulePage;
