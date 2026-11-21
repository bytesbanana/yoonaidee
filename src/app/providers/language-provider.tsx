"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { pageTitles, siteDescription, translate, type Language } from "@/lib/i18n";

const LanguageContext = createContext<Language>("en");
const languageKey = "yoo_nai_dee_language";
const listeners = new Set<() => void>();
let unsavedLanguage: Language | undefined;

function getLanguage(): Language {
  if (unsavedLanguage) return unsavedLanguage;
  try {
    return window.localStorage.getItem(languageKey) === "th" ? "th" : "en";
  } catch {
    return "en";
  }
}

function setLanguage(language: Language) {
  try {
    window.localStorage.setItem(languageKey, language);
    unsavedLanguage = undefined;
  } catch {
    // The switch still works for this visit when storage is unavailable.
    unsavedLanguage = language;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key === languageKey || event.key === null) listener();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerLanguage = (): Language => "en";

export function useLanguage() {
  const language = useContext(LanguageContext);
  return {
    language,
    locale: language === "th" ? "th-TH" : "en-TH",
    t: (message: string, values?: Record<string, string | number>) => translate(language, message, values),
  };
}

const localizedTitles = Object.values(pageTitles).map((title) => ({
  en: `${title} | Yoo Nai Dee`,
  th: `${translate("th", title)} | ${translate("th", "Yoo Nai Dee")}`,
}));

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, getLanguage, getServerLanguage);
  useEffect(() => {
    document.documentElement.setAttribute("lang", language);

    function localizeMetadata() {
      const description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
      const localizedDescription = translate(language, siteDescription);
      if (description && description.content !== localizedDescription) description.content = localizedDescription;

      const title = document.head.querySelector("title");
      const current = title?.textContent;
      const localized = localizedTitles.find(({ en, th }) => current === en || current === th)?.[language];
      if (title && localized && current !== localized) title.textContent = localized;
    }

    // Next replaces the title as route metadata streams in.
    const observer = new MutationObserver(localizeMetadata);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["content"] });
    localizeMetadata();
    return () => observer.disconnect();
  }, [language]);

  return (
    <LanguageContext.Provider value={language}>
      <div className="border-b border-[#dce3d9] bg-[#f8f7f2] px-4 sm:px-8">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-end">
          <div role="group" aria-label={translate(language, "Language")} className="inline-flex gap-1">
            {(["en", "th"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-label={translate(language, option === "en" ? "English" : "Thai")}
                aria-pressed={language === option}
                onClick={() => setLanguage(option)}
                className={`min-h-9 min-w-11 rounded-full text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164334] ${language === option ? "bg-[#164334] text-white" : "text-[#164334] hover:bg-[#eaf1e6]"}`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      {children}
    </LanguageContext.Provider>
  );
}
