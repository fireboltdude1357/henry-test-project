let popAudio: HTMLAudioElement | null = null;

export function playCompletionPop(): void {
  try {
    if (typeof window === "undefined") return;
    if (!popAudio) {
      popAudio = new Audio("/pop.mp3");
      popAudio.preload = "auto";
    }
    popAudio.currentTime = 0;
    void popAudio.play();
  } catch {
    // Best-effort: ignore audio errors or autoplay restrictions
  }
}
