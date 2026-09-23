/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { UrlTaPerdOptions } from "../../types";
import { carouselOwnsEvent, cycleDetailPeriod, shouldHandleDetailShortcut } from "./interaction";

describe("carouselOwnsEvent", () => {
  it("accepts viewport-owned chart interactions and ignores controls or prevented events", () => {
    const viewport = document.createElement("div");
    const chart = document.createElement("div");
    const input = document.createElement("input");
    const readOnlyEditor = document.createElement("div");
    readOnlyEditor.setAttribute("contenteditable", "false");
    viewport.append(chart, input, readOnlyEditor);

    expect(carouselOwnsEvent({ target: chart, currentTarget: viewport, defaultPrevented: false })).toBe(true);
    expect(carouselOwnsEvent({ target: input, currentTarget: viewport, defaultPrevented: false })).toBe(false);
    expect(carouselOwnsEvent({ target: readOnlyEditor, currentTarget: viewport, defaultPrevented: false })).toBe(true);
    expect(carouselOwnsEvent({ target: chart, currentTarget: viewport, defaultPrevented: true })).toBe(false);
  });
});

describe("shouldHandleDetailShortcut", () => {
  const elementWithAttribute = (tagName: string, name: string, value: string) => {
    const element = document.createElement(tagName);
    element.setAttribute(name, value);
    return element;
  };

  const keyboardEvent = (target: EventTarget, overrides: Partial<KeyboardEvent> = {}) => ({
    key: "ArrowRight",
    target,
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  }) as KeyboardEvent;

  it("accepts arrow keys from non-interactive page content", () => {
    expect(shouldHandleDetailShortcut(keyboardEvent(document.body))).toBe(true);
  });

  it.each([
    ["input", document.createElement("input")],
    ["textarea", document.createElement("textarea")],
    ["select", document.createElement("select")],
    ["button", document.createElement("button")],
    ["link", elementWithAttribute("a", "href", "#chart")],
    ["contenteditable", elementWithAttribute("div", "contenteditable", "true")],
    ["dialog", elementWithAttribute("div", "role", "dialog")],
    ["menu", elementWithAttribute("div", "role", "menu")],
    ["listbox", elementWithAttribute("div", "role", "listbox")],
    ["slider", elementWithAttribute("div", "role", "slider")],
  ])("does not claim shortcuts from a %s target", (_, target) => {
    expect(shouldHandleDetailShortcut(keyboardEvent(target))).toBe(false);
  });

  it("does not handle prevented events, modifiers, or other keys", () => {
    const target = document.body;

    expect(shouldHandleDetailShortcut(keyboardEvent(target, { defaultPrevented: true }))).toBe(false);
    expect(shouldHandleDetailShortcut(keyboardEvent(target, { altKey: true }))).toBe(false);
    expect(shouldHandleDetailShortcut(keyboardEvent(target, { ctrlKey: true }))).toBe(false);
    expect(shouldHandleDetailShortcut(keyboardEvent(target, { metaKey: true }))).toBe(false);
    expect(shouldHandleDetailShortcut(keyboardEvent(target, { shiftKey: true }))).toBe(false);
    expect(shouldHandleDetailShortcut(keyboardEvent(target, { key: "Enter" }))).toBe(false);
  });
});

describe("cycleDetailPeriod", () => {
  it("cycles forwards from week to hour", () => {
    expect(cycleDetailPeriod(UrlTaPerdOptions.Week, "ArrowRight")).toBe(UrlTaPerdOptions.Hour);
  });

  it("cycles backwards from hour to week", () => {
    expect(cycleDetailPeriod(UrlTaPerdOptions.Hour, "ArrowLeft")).toBe(UrlTaPerdOptions.Week);
  });
});
