const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const testInput = document.getElementById('testInput');
const recognitionButton = document.getElementById('recognitionButton');
const definitions = {};
let recognition = null;
let isListening = false;
let isTestMode = false;

function testDefinition() {
    isTestMode = !isTestMode;

    if (isTestMode) {
        if (isListening && recognition) {
            recognition.stop();
            isListening = false;
            recognitionButton.textContent = "Start";
        }

        testInput.style.display = 'inline-block';
        statusEl.textContent = "Enter text and press enter";

        testInput.onkeydown = function(e) {
            if (e.key === 'Enter') {
                const text = testInput.value;
                processText(text);
                testInput.value = '';
            }
        };
    } else {
        testInput.style.display = 'none';
        statusEl.textContent = "Speak";
    }
}

function processText(text) {
    if (!text || text.trim() === '') return;

    const lowerText = text.toLowerCase();

    // 🔍 Odwrotne wyszukiwanie, jeśli wypowiedź zawiera "znajdź"
    if (lowerText.includes('znajdź')) {
        const queryWords = text
            .toLowerCase()
            .replace(/znajdź/g, '')
            .trim()
            .split(/\s+/);

        let bestMatch = null;
        let highestScore = 0;

        for (const key in definitions) {
            const defText = definitions[key].definition.toLowerCase();
            let score = 0;
            for (const word of queryWords) {
                if (defText.includes(word)) score++;
            }

            if (score > highestScore) {
                highestScore = score;
                bestMatch = {
                    key,
                    original: definitions[key].original,
                    definition: definitions[key].definition
                };
            }
        }

        if (bestMatch && highestScore > 0) {
            output.innerHTML = `<b>${bestMatch.original}:</b> ${bestMatch.definition}`;
            speak(`${bestMatch.original} = ${bestMatch.definition}`);
        } else {
            output.innerHTML = `Nie znaleziono w definicjach: <b>${text.trim()}</b>`;
            speak(`Nie znaleziono w definicjach ${text.trim()}`);
        }
        return;
    }

    output.innerHTML = `Not found: <b>${text.trim()}</b>`;

    const match = findExactMatch(text);

    if (match) {
        const displayText = `<b>${match.original}:</b> ${match.definition}`;
        output.innerHTML = displayText;
        speak(match.definition);
    } else {
        const termPattern = /co to (jest )?(za )?(.+?)(\?|$)/i;
        const altPattern = /(definicja|znaczenie|wyjaśnij|wytłumacz) (.+?)(\?|$)/i;

        let term = null;
        const termMatch = text.match(termPattern);
        const altMatch = text.match(altPattern);

        if (termMatch && termMatch[3]) {
            term = termMatch[3].trim();
        } else if (altMatch && altMatch[2]) {
            term = altMatch[2].trim();
        }

        if (term) {
            const secondMatch = findExactMatch(term);
            if (secondMatch) {
                const displayText = `${secondMatch.original}: ${secondMatch.definition}`;
                output.textContent = displayText;
                speak(secondMatch.definition);
                return;
            }
        }

        const words = text.trim().split(/\s+/);
        for (const word of words) {
            if (word.length >= 2) {
                const wordMatch = findExactMatch(word);
                if (wordMatch) {
                    const displayText = `${wordMatch.original}: ${wordMatch.definition}`;
                    output.textContent = displayText;
                    speak(wordMatch.definition);
                    return;
                }
            }
        }

        output.innerHTML = `Not found: <b>${text.trim()}</b>`;
        speak(`Nie znaleziono definicji ${text.trim()}`);
    }
}


fetch('data.txt')
    .then(response => response.text())
    .then(text => {
        const lines = text.split('\n').filter(Boolean);
        for (let line of lines) {
            const [key, ...rest] = line.split(' - ');
            if (key && rest.length) {
                const originalKey = key.trim();
                const formattedKey = originalKey.toUpperCase().replace(/\s+/g, '');

                definitions[formattedKey] = {
                    original: originalKey,
                    definition: rest.join(' - ').trim()
                };

                if (originalKey.includes(' ')) {
                    const upperOriginal = originalKey.toUpperCase();
                    definitions[upperOriginal] = {
                        original: originalKey,
                        definition: rest.join(' - ').trim()
                    };
                }
            }
        }
        statusEl.innerHTML = `Loaded <b>${Object.keys(definitions).length}</b> definitions`;
    })
    .catch(err => {
        output.textContent = 'Load error: ' + err;
    });

let isSpeaking = false;

function speak(text) {
    const synth = window.speechSynthesis;

    if (isSpeaking) {
        synth.cancel();
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pl-PL';

    utter.onstart = () => {
        isSpeaking = true;
        statusEl.textContent = "Speaking...";
    };

    utter.onend = () => {
        isSpeaking = false;
        statusEl.textContent = isListening ? "Listening..." : "Ready";
    };

    synth.speak(utter);
}

function findExactMatch(transcript) {
    const normalizedTranscript = transcript.trim().toUpperCase();
    const noSpacesTranscript = normalizedTranscript.replace(/\s+/g, '');

    const cleanedTranscript = noSpacesTranscript
        .replace(/COTO(JEST)?/g, '')
        .replace(/COTOZADEFINICJADLA/g, '')
        .replace(/COTOZNACZY/g, '')
        .replace(/JAKADEFINICJADLA/g, '')
        .replace(/DEFINICJA/g, '')
        .replace(/COBYDEFINICJA/g, '')
        .replace(/COBYZNACZYLO/g, '')
        .replace(/COOZNACZA/g, '')
        .replace(/WYJASNIJ/g, '')
        .replace(/WYTLUMACZ/g, '')
        .replace(/PODAJDEFINICJE/g, '')
        .trim();

    if (definitions[normalizedTranscript]) {
        return {
            key: normalizedTranscript,
            original: definitions[normalizedTranscript].original,
            definition: definitions[normalizedTranscript].definition
        };
    }

    if (definitions[noSpacesTranscript]) {
        return {
            key: noSpacesTranscript,
            original: definitions[noSpacesTranscript].original,
            definition: definitions[noSpacesTranscript].definition
        };
    }

    if (definitions[cleanedTranscript]) {
        return {
            key: cleanedTranscript,
            original: definitions[cleanedTranscript].original,
            definition: definitions[cleanedTranscript].definition
        };
    }

    for (const key in definitions) {
        if (normalizedTranscript.includes(key)) {
            return {
                key: key,
                original: definitions[key].original,
                definition: definitions[key].definition
            };
        }
    }

    const words = normalizedTranscript.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j <= words.length; j++) {
            const potentialTerm = words.slice(i, j).join(' ');
            if (definitions[potentialTerm]) {
                return {
                    key: potentialTerm,
                    original: definitions[potentialTerm].original,
                    definition: definitions[potentialTerm].definition
                };
            }
        }
    }

    for (const key in definitions) {
        function escapeRegex(str) {
            return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        const escapedKey = escapeRegex(key);
        const regex = new RegExp(`\\b${escapedKey.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (regex.test(noSpacesTranscript)) {
            return {
                key: key,
                original: definitions[key].original,
                definition: definitions[key].definition
            };
        }
    }

    const shortKeys = Object.keys(definitions).filter(k => k.length >= 3);
    for (const key of shortKeys) {
        if (noSpacesTranscript.includes(key.replace(/\s+/g, ''))) {
            return {
                key: key,
                original: definitions[key].original,
                definition: definitions[key].definition
            };
        }
    }

    const termPattern = /co to (jest )?(za )?(.+?)(\?|$)/i;
    const match = transcript.match(termPattern);
    if (match && match[3]) {
        const extractedTerm = match[3].trim().toUpperCase();
        if (definitions[extractedTerm]) {
            return {
                key: extractedTerm,
                original: definitions[extractedTerm].original,
                definition: definitions[extractedTerm].definition
            };
        }

        const extractedNoSpaces = extractedTerm.replace(/\s+/g, '');
        if (definitions[extractedNoSpaces]) {
            return {
                key: extractedNoSpaces,
                original: definitions[extractedNoSpaces].original,
                definition: definitions[extractedNoSpaces].definition
            };
        }
    }

    return null;
}

function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        output.textContent = "Speak not supported.";
        return;
    }

    if (isListening) {
        if (recognition) {
            recognition.stop();
            statusEl.textContent = "Stopped.";
            isListening = false;
        }
        return;
    }

    output.textContent = "Waiting for text";


    recognition = new SpeechRecognition();
    recognition.lang = 'pl-PL';
    recognition.continuous = true;
    recognition.interimResults = true;

    let lastProcessedTranscript = '';

    recognition.onstart = () => {
        isListening = true;
        statusEl.textContent = "Listening...";
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        const formattedTranscript = transcript.trim();
        output.innerHTML = `Detected: <b>${formattedTranscript}</b>`;

        if (event.results[event.resultIndex].isFinal) {
            if (formattedTranscript !== lastProcessedTranscript) {
                lastProcessedTranscript = formattedTranscript;
                processText(formattedTranscript);
            }
        }
    };

    recognition.onend = () => {
        if (isListening) {
            recognition.start();
        } else {
            statusEl.textContent = "Ready";
        }
    };

    recognition.onerror = (event) => {
        statusEl.textContent = `Error: ${event.error}`;
        isListening = false;
    };

    try {
        recognition.start();
        statusEl.textContent = "Listening...";
    } catch (err) {
        statusEl.textContent = `Error: ${err}`;
    }
}