type InstallPromptEvent = Event & {
  readonly prompt: () => Promise<unknown>;
};

// The browser's single-use prompt must survive page navigation.
// eslint-disable-next-line functional/no-let
let installPrompt: InstallPromptEvent | null = null;
// eslint-disable-next-line functional/no-let
let initialized = false;
const updates = new EventTarget();

const setInstallPrompt = (prompt: InstallPromptEvent | null) => {
  installPrompt = prompt;
  updates.dispatchEvent(new Event("change"));
};

export const initializeInstallPrompt = () => {
  if (typeof window === "undefined" || initialized) {
    return;
  }
  initialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    if (!("prompt" in event) || typeof event.prompt !== "function") {
      return;
    }

    event.preventDefault();
    setInstallPrompt(event as InstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => setInstallPrompt(null));
};

export const subscribeToInstallPrompt = (listener: () => void) => {
  updates.addEventListener("change", listener);
  return () => updates.removeEventListener("change", listener);
};

export const getInstallPrompt = () => installPrompt;

export const promptForInstall = async () => {
  const prompt = installPrompt;
  if (!prompt) {
    return;
  }

  setInstallPrompt(null);
  await prompt.prompt();
};
