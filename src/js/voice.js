import { state } from "./state.js";
import { updateDynamicText } from "./particles.js";

export function setupVoice() {
    const voiceBtn = document.getElementById("btn-voice");
    const voiceIndicator = document.getElementById("voice-indicator");
    const voiceBtnText = document.getElementById("voice-btn-text");

    let recognition = null;

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        console.log("Voice recognition started");
        if (voiceIndicator) voiceIndicator.classList.add("listening");
        if (voiceBtnText) voiceBtnText.innerText = "Voice Mode: ON";
        if (voiceBtn) voiceBtn.classList.add("active");
      };

      recognition.onerror = (event) => {
        console.error("Voice recognition error", event.error);
        if (event.error === "not-allowed") {
          alert("Microphone access denied. Please allow microphone access.");
          state.voiceEnabledByUser = false;
        }
        if (voiceIndicator) voiceIndicator.classList.remove("listening");
      };

      recognition.onend = () => {
        console.log("Voice recognition ended");
        if (voiceIndicator) voiceIndicator.classList.remove("listening");
        if (state.voiceEnabledByUser) {
          // Thêm độ trễ nhỏ trước khi khởi động lại để tránh vòng lặp nhanh
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.warn("Restart failed", e);
            }
          }, 300);
        } else {
          if (voiceBtnText) voiceBtnText.innerText = "Enable Voice Mode";
          if (voiceBtn) voiceBtn.classList.remove("active");
        }
      };

      recognition.onresult = (event) => {
        if (!state.voiceEnabledByUser) return;

        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.trim().toUpperCase();

        const words = transcript.split(" ");
        const displayPhrase = words.slice(-3).join(" ");

        if (displayPhrase.length > 0) {
          updateDynamicText(displayPhrase);
          state.targetGestureLabel = "Voice: " + displayPhrase;
          state.targetWeights = [0, 0, 0, 0, 1];
          state.spreadTarget = 0.0;
        }
      };
    } else {
      if (voiceBtnText) voiceBtnText.innerText = "Voice Not Supported";
      if (voiceBtn) voiceBtn.disabled = true;
    }

    if (voiceBtn) {
        voiceBtn.addEventListener("click", () => {
          if (!recognition) return;

          state.voiceEnabledByUser = !state.voiceEnabledByUser;

          if (state.voiceEnabledByUser) {
            try {
              recognition.start();
              state.voiceModeActive = true;
              state.targetGestureLabel = "Listening...";
              state.spreadTarget = 0.0;
              state.targetWeights = [0, 0, 0, 0, 1];

              updateDynamicText("HELLO");
            } catch (e) {
              console.warn(e);
            }
          } else {
            recognition.stop();
            state.voiceModeActive = false;
            state.targetGestureLabel = "Voice Mode OFF";
            state.spreadTarget = 1.0;
          }
        });
    }
}