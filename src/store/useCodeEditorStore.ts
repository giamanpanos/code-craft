import { CodeEditorState } from "./../types/index";
import { create } from "zustand";
import { Monaco } from "@monaco-editor/react";

const getInitialState = () => {
  // if we are on the server, return default values
  if (typeof window === "undefined") {
    return {
      language: "javascript",
      fontSize: 16,
      theme: "vs-dark",
    };
  }

  // if we are on the client, return values from local storage, because local storage is only available on the client (browser API)
  const savedLanguage = localStorage.getItem("editor-language") || "javascript";
  const savedTheme = localStorage.getItem("editor-theme") || "vs-dark";
  const savedFontSize = localStorage.getItem("editor-font-size") || 16;

  return {
    language: savedLanguage,
    theme: savedTheme,
    fontSize: Number(savedFontSize), // local storage gives all values as strings
  };
};

export const useCodeEditorStore = create<CodeEditorState>((set, get) => {
  const initialState = getInitialState();
  return {
    ...initialState,
    output: "",
    isRunning: false,
    error: null,
    editor: null,
    executionResult: null,

    getCode: () => get().editor?.getValue() || "",

    setEditor: (editor: Monaco) => {
      const savedCode = localStorage.getItem(`editor-code-${get().language}`);
      if (savedCode) editor.setValue(savedCode);

      set({ editor });
    },

    setTheme: (theme: string) => {
      localStorage.setItem("editor-theme", theme);
      set({ theme });
    },

    setFontSize: (fontSize: number) => {
      localStorage.setItem("editor-font-size", fontSize.toString());
      set({ fontSize });
    },

    setLanguage: (language: string) => {
      // save current language code before switching
      const currentCode = get().editor?.getValue();
      if (currentCode)
        localStorage.setItem(`editor-code-${get().language}`, currentCode);

      localStorage.setItem("editor-language", language);

      set({ language, output: "", error: null });
    },

    runCode: async () => {
      const { language, getCode } = get();
      const code = getCode();

      if (!code) {
        set({ error: "Please enter some code" });
        return;
      }

      set({ isRunning: true, error: null, output: "" });

      try {

        const response = await fetch("/api/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language,
            code,
          }),
        });

        const data = await response.json();

        console.log("data back from JDoodle", data);

        if (!response.ok || data.error) {
        const error = data.error || "Code execution failed";

        set({
          error,
          executionResult: {
            code,
            output: "",
            error,
          },
        });

        return;
      }

      const output = data.output || "";

      set({
        output: output.trim(),
        error: null,
        executionResult: {
          code,
          output: output.trim(),
          error: null,
        },
      });
      } catch (error) {
        console.error("Error running code:", error);
        set({
          error: "Error running code",
          executionResult: { code, output: "", error: "Error running code" },
        });
      } finally {
        set({ isRunning: false });
      }
    },
  };
});

// When we run code and we have a successful result, this is saved to the db but when we have an error, this is not saved in db because handleRun at RunButton that has the saveExecution runs before the error result is back from the piston api. So we will use the following function to fix that.
export const getExecutionResult = () =>
  useCodeEditorStore.getState().executionResult;
