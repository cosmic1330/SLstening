/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import LanguageSwitcher from "./LanguageSwitcher";

async function makeI18n(language: string) {
  const instance = i18next.createInstance();
  await instance.use(initReactI18next).init({
    lng: language,
    resources: {
      en: { translation: { a11y: { switchLanguage: "Switch language to {{language}}" }, language: { en: "English", "zh-TW": "Traditional Chinese" } } },
      "zh-TW": { translation: { a11y: { switchLanguage: "切換語言為{{language}}" }, language: { en: "英文", "zh-TW": "繁體中文" } } },
    },
  });
  return instance;
}

describe("LanguageSwitcher", () => {
  it("normalizes region variants and toggles with a localized accessible name", async () => {
    const i18n = await makeI18n("en-US");
    render(<I18nextProvider i18n={i18n}><LanguageSwitcher /></I18nextProvider>);
    const button = screen.getByRole("button", { name: "Switch language to Traditional Chinese" });
    expect(button.getAttribute("title")).toBe("Switch language to Traditional Chinese");
    fireEvent.click(button);
    await waitFor(() => expect(i18n.language).toBe("zh-TW"));
    expect(screen.getByRole("button", { name: "切換語言為英文" })).toBeTruthy();
  });
});
