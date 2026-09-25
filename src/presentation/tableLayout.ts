// Bridge has six rows of cards: dummy, trick, and thumb hand each reserve two.
export function fitBridgeCardSize(surface: HTMLElement, enabled: boolean) {
  let cleanup = () => {};

  function setup(active: boolean) {
    cleanup();
    if (!active) return;

    let frame = 0;
    const panel = surface.querySelector<HTMLElement>(".table-play-panel");
    const summary = surface.querySelector<HTMLElement>(".full-hand-summary");
    if (!panel || !summary) return;

    const measure = () => {
      frame = 0;
      const panelStyle = getComputedStyle(panel);
      const surfaceStyle = getComputedStyle(surface);
      const feedback = [...panel.children].filter((child) =>
        !child.matches(".full-hand-cards, .action-row") && child.getBoundingClientRect().height > 0
      );
      const feedbackHeight = feedback.reduce((total, child) => total + child.getBoundingClientRect().height, 0);
      const actionsHeight = panel.querySelector(".action-row")?.getBoundingClientRect().height ?? 44;
      const reservedSpace = parseFloat(surfaceStyle.getPropertyValue("--flow-panel-space"));
      const hasHand = Boolean(panel.querySelector(".full-hand-cards"));
      const handSpace = hasHand ? 0 : Math.max(0, parseFloat(panelStyle.minHeight) - reservedSpace);
      const contentSpace = feedbackHeight + actionsHeight + (feedback.length + 1) * parseFloat(panelStyle.rowGap);
      const panelSpace = Math.max(reservedSpace, contentSpace - handSpace);
      const surfaceGap = parseFloat(surfaceStyle.rowGap);
      const available = surface.clientHeight - summary.getBoundingClientRect().height - panelSpace - surfaceGap * 2 - 2;
      // Reserve board labels/gaps and 8px between hand rows before sizing six rows.
      const boardSpace = parseFloat(surfaceStyle.getPropertyValue("--flow-board-space"));
      const width = Math.max(18, Math.min(52, (surface.clientWidth - 36) / 7, (available - boardSpace - 8) / 8.4));
      const value = `${Math.floor(width * 10) / 10}px`;
      if (surface.style.getPropertyValue("--flow-card-width") !== value) {
        surface.style.setProperty("--flow-card-width", value);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(surface);
    observer.observe(summary);
    observer.observe(panel);
    schedule();

    cleanup = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      surface.style.removeProperty("--flow-card-width");
    };
  }

  setup(enabled);
  return { update: setup, destroy: () => cleanup() };
}
