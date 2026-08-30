/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import en from "../locales/en.json";
import zh from "../locales/zh-tw.json";
import i18n, { normalizeLanguage, syncDocumentLanguage } from "../i18n";

function leaves(value: unknown, path = ""): Record<string, string> {
  if (typeof value === "string") return { [path]: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, string>>((result, [key, child]) => ({
    ...result,
    ...leaves(child, path ? `${path}.${key}` : key),
  }), {});
}

describe("locale resources", () => {
  it("keeps English and Traditional Chinese keys in parity with non-empty leaves", () => {
    const english = leaves(en);
    const traditionalChinese = leaves(zh);
    expect(Object.keys(english).sort()).toEqual(Object.keys(traditionalChinese).sort());
    Object.values(english).forEach((value) => expect(value.trim()).not.toBe(""));
    Object.values(traditionalChinese).forEach((value) => expect(value.trim()).not.toBe(""));
  });

  it("normalizes language regions and synchronizes the document language", () => {
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage("zh-Hant-HK")).toBe("zh-TW");
    syncDocumentLanguage("zh-Hant-HK");
    expect(document.documentElement.lang).toBe("zh-Hant");
    expect(document.documentElement.dir).toBe("ltr");
    syncDocumentLanguage("en-GB");
    expect(document.documentElement.lang).toBe("en");
  });

  it("uses the production instance to switch to zh-TW resources and persist the normalized choice", async () => {
    await i18n.changeLanguage("en-US");
    expect(i18n.t("Pages.Login.signIn")).toBe("Sign In");

    await i18n.changeLanguage("zh-Hant");
    expect(i18n.resolvedLanguage).toBe("zh-TW");
    expect(i18n.t("Pages.Login.signIn")).toBe("登入");
    expect(document.documentElement.lang).toBe("zh-Hant");
    expect(localStorage.getItem("i18nextLng")).toBe("zh-TW");
  });
});
