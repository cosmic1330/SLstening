const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[contenteditable='true']",
  "[role='dialog']",
  "[role='menu']",
  "[role='listbox']",
  "[role='slider']",
].join(",");

export function carouselOwnsEvent(event: Pick<Event, "defaultPrevented" | "target" | "currentTarget">) {
  if (event.defaultPrevented || !(event.target instanceof Element)) return false;
  const viewport = event.currentTarget instanceof Element ? event.currentTarget : null;
  return Boolean(viewport && viewport.contains(event.target) && !event.target.closest(INTERACTIVE_SELECTOR));
}
