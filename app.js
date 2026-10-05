const statusText = document.getElementById("status");
const subtitle = document.getElementById("subtitle");
const orb = document.getElementById("novaOrb");
const messages = document.getElementById("messages");
const talkButton = document.getElementById("talkButton");

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;
let isProcessing = false;
let isSpeaking = false;
let conversationMode = false;
let shouldRestartListening = false;

let sessionId = localStorage.getItem("novaSessionId");

if (!sessionId) {
    sessionId =
        "nova-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substring(2);

    localStorage.setItem("novaSessionId", sessionId);
}


// ==========================================
// SPEECH RECOGNITION
// ==========================================

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    // We restart recognition ourselves after each turn.
    // This is more reliable than leaving one recognition
    // session running forever.
    recognition.continuous = false;

    recognition.interimResults = false;


    recognition.onstart = function () {

        shouldRestartListening = false;

        statusText.innerText = "I'm listening...";
        subtitle.innerText = "Go ahead. I'm here.";

        orb.classList.add("listening");

        talkButton.innerHTML =
            '<span class="mic">●</span> Listening...';
    };


    recognition.onresult = async function (event) {

        if (isSpeaking || isProcessing) {
            return;
        }

        const text =
            event.results[event.results.length - 1][0].transcript.trim();

        if (!text) {
            return;
        }

        shouldRestartListening = false;

        addUserMessage(text);

        statusText.innerText = "Thinking...";
        subtitle.innerText = text;

        orb.classList.remove("listening");

        talkButton.disabled = true;

        talkButton.innerHTML =
            '<span class="mic">●</span> NOVA is thinking...';

        await askNova(text);
    };


    recognition.onerror = function (event) {

        console.log(
            "Speech recognition event:",
            event.error
        );

        orb.classList.remove("listening");

        // "no-speech" simply means the user stayed quiet.
        // In conversation mode NOVA will listen again.
        if (event.error === "no-speech") {

            statusText.innerText = "I'm here.";
            subtitle.innerText = "Listening when you're ready.";

            if (conversationMode && !isSpeaking && !isProcessing) {
                scheduleListeningRestart(700);
            }

            return;
        }


        // This sometimes happens when recognition is intentionally
        // stopped while NOVA starts speaking.
        if (event.error === "aborted") {
            return;
        }


        if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
        ) {

            conversationMode = false;

            statusText.innerText = "Microphone permission needed";
            subtitle.innerText =
                "Please allow microphone access in your browser.";

            resetTalkButton();

            return;
        }


        statusText.innerText = "I couldn't hear that.";
        subtitle.innerText = "Please try again.";

        if (conversationMode && !isSpeaking && !isProcessing) {
            scheduleListeningRestart(1000);
        }
    };


    recognition.onend = function () {

        orb.classList.remove("listening");

        if (
            conversationMode &&
            !isSpeaking &&
            !isProcessing &&
            !shouldRestartListening
        ) {
            scheduleListeningRestart(500);
        }
    };
}


// ==========================================
// START / STOP CONVERSATION
// ==========================================

function startListening() {

    if (!recognition) {

        alert(
            "Speech recognition is not supported in this browser. Please use Google Chrome."
        );

        return;
    }


    // First press starts Conversation Mode.
    if (!conversationMode) {

        conversationMode = true;

        statusText.innerText = "Conversation mode on";
        subtitle.innerText =
            "You can speak naturally. I'll keep listening.";

        talkButton.innerHTML =
            '<span class="mic">●</span> Conversation On';
    }


    // If NOVA is currently speaking, pressing the button
    // interrupts her and immediately gives the microphone
    // back to the user.
    if (isSpeaking) {

        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

        isSpeaking = false;
        isProcessing = false;

        startRecognitionSafely(250);

        return;
    }


    if (isProcessing) {
        return;
    }


    startRecognitionSafely(100);
}


// ==========================================
// SAFE MICROPHONE START
// ==========================================

function startRecognitionSafely(delay = 300) {

    if (
        !conversationMode ||
        !recognition ||
        isSpeaking ||
        isProcessing
    ) {
        return;
    }


    shouldRestartListening = true;


    setTimeout(() => {

        if (
            !conversationMode ||
            isSpeaking ||
            isProcessing
        ) {
            shouldRestartListening = false;
            return;
        }


        try {

            recognition.start();

        } catch (error) {

            // Chrome throws an error if recognition
            // is already starting/running.
            console.log(
                "Recognition already active or starting."
            );

            shouldRestartListening = false;
        }

    }, delay);
}


function scheduleListeningRestart(delay = 500) {

    if (
        !conversationMode ||
        isSpeaking ||
        isProcessing
    ) {
        return;
    }

    startRecognitionSafely(delay);
}


// ==========================================
// ASK NOVA AI
// ==========================================

async function askNova(text) {

    isProcessing = true;

    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: text,
                sessionId: sessionId
            })
        });


        const data = await response.json();


        if (!response.ok) {

            console.error(
                "NOVA server error:",
                data
            );

            throw new Error(
                data.error ||
                "NOVA server error"
            );
        }


        if (!data.reply) {
            throw new Error(
                "NOVA returned an empty response."
            );
        }


        isProcessing = false;

        novaReply(data.reply);

    } catch (error) {

        console.error(
            "NOVA connection error:",
            error
        );


        const errorMessage =
            "I'm having trouble connecting right now. Please try again.";


        addNovaMessage(errorMessage);

        statusText.innerText =
            "Connection problem";

        subtitle.innerText =
            "Please try again.";


        isProcessing = false;


        if (conversationMode) {

            scheduleListeningRestart(1200);

        } else {

            resetTalkButton();
        }
    }
}


// ==========================================
// CHAT MESSAGES
// ==========================================

function addUserMessage(text) {

    const message =
        document.createElement("div");

    message.className =
        "message user-message";


    const bubble =
        document.createElement("div");

    bubble.className = "bubble";

    bubble.textContent = text;


    message.appendChild(bubble);

    messages.appendChild(message);

    scrollMessages();
}


function addNovaMessage(text) {

    const message =
        document.createElement("div");

    message.className =
        "message nova-message";


    const avatar =
        document.createElement("div");

    avatar.className = "avatar";

    avatar.textContent = "N";


    const bubble =
        document.createElement("div");

    bubble.className = "bubble";

    bubble.textContent = text;


    message.appendChild(avatar);

    message.appendChild(bubble);

    messages.appendChild(message);

    scrollMessages();
}


// ==========================================
// NOVA RESPONSE
// ==========================================

function novaReply(text) {

    addNovaMessage(text);

    statusText.innerText =
        "Speaking...";

    subtitle.innerText =
        "NOVA is responding.";

    speak(text);
}


// ==========================================
// SPEAK
// ==========================================

function speak(text) {

    // Stop microphone before NOVA speaks.
    // This prevents NOVA from hearing herself.
    if (recognition) {

        try {
            recognition.stop();
        } catch (error) {
            // Recognition may already be stopped.
        }
    }


    if (!("speechSynthesis" in window)) {

        isSpeaking = false;

        statusText.innerText =
            "I'm listening.";

        subtitle.innerText =
            "Go ahead.";

        if (conversationMode) {

            scheduleListeningRestart(400);

        } else {

            resetTalkButton();
        }

        return;
    }


    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(text);


    // Slightly slower than the default makes
    // conversation sound calmer and clearer.
    speech.rate = 0.96;

    speech.pitch = 1;

    speech.volume = 1;


    const voices =
        window.speechSynthesis.getVoices();


    const preferredVoice =

        voices.find(voice =>
            voice.lang.startsWith("en") &&
            /zira|samantha|google.*female|female/i.test(
                voice.name
            )
        )

        ||

        voices.find(voice =>
            voice.lang.startsWith("en")
        );


    if (preferredVoice) {
        speech.voice = preferredVoice;
    }


    speech.onstart = function () {

        isSpeaking = true;

        statusText.innerText =
            "Speaking...";

        subtitle.innerText =
            "You can interrupt me by pressing the button.";

        orb.classList.add("listening");

        talkButton.disabled = false;

        talkButton.innerHTML =
            '<span class="mic">■</span> Interrupt NOVA';
    };


    speech.onend = function () {

        isSpeaking = false;

        orb.classList.remove("listening");


        if (conversationMode) {

            statusText.innerText =
                "I'm listening...";

            subtitle.innerText =
                "Your turn.";

            talkButton.innerHTML =
                '<span class="mic">●</span> Conversation On';

            scheduleListeningRestart(500);

        } else {

            statusText.innerText =
                "Talk to me.";

            subtitle.innerText =
                "I'm ready when you are.";

            resetTalkButton();
        }
    };


    speech.onerror = function () {

        isSpeaking = false;

        orb.classList.remove("listening");


        if (conversationMode) {

            scheduleListeningRestart(700);

        } else {

            resetTalkButton();
        }
    };


    isSpeaking = true;

    window.speechSynthesis.speak(speech);
}


// ==========================================
// BUTTON
// ==========================================

function resetTalkButton() {

    talkButton.disabled = false;

    talkButton.innerHTML =
        '<span class="mic">🎙</span> Talk to NOVA';
}


// ==========================================
// SCROLL CHAT
// ==========================================

function scrollMessages() {

    messages.scrollTop =
        messages.scrollHeight;
}


// ==========================================
// LOAD BROWSER VOICES
// ==========================================

if ("speechSynthesis" in window) {

    window.speechSynthesis.getVoices();

    window.speechSynthesis.onvoiceschanged =
        function () {

            window.speechSynthesis.getVoices();
        };
}