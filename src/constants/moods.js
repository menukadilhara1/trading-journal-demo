export const MOODS = [
    { emoji: "🤑", label: "Confident", value: "confident", hex: "1f911" },
    { emoji: "😀", label: "Good", value: "good", hex: "1f600" },
    { emoji: "😑", label: "Meh", value: "meh", hex: "1f611" },
    { emoji: "😒", label: "Bad", value: "bad", hex: "1fae4" },
    { emoji: "🙁", label: "Worst", value: "worst", hex: "1f641" },
];

export const MOOD_MAP = MOODS.reduce((acc, mood) => {
    acc[mood.value] = mood;
    // Also map by emoji char for reverse lookup if needed
    acc[mood.emoji] = mood;
    // Map by label for robustness
    acc[mood.label] = mood;
    // Map by lowercase label
    acc[mood.label.toLowerCase()] = mood;
    return acc;
}, {});

// Legacy mapping for old data
const LEGACY_MAP = {
    "neutral": "meh",
    "happy": "good",
    "stressed": "worst",
    "frustrated": "bad",
    "tired": "bad",
    // New mappings for demo data
    "excited": "confident",
    "annoyed": "bad",
    "focused": "confident",
    "relaxed": "good",
    "confident": "confident", // ensures direct mapping works if case differs
    "good": "good",
    "meh": "meh",
    "bad": "bad",
    "worst": "worst"
};

// Helper to get the full mood object (handling legacy)
export const resolveMood = (key) => {
    if (!key) return null;
    const k = key.trim();
    const mappedKey = LEGACY_MAP[k] || LEGACY_MAP[k.toLowerCase()] || k;
    return MOODS.find(m => m.value === mappedKey || m.emoji === mappedKey || m.label === mappedKey || m.label.toLowerCase() === mappedKey.toLowerCase());
};

export const getMoodHex = (key) => {
    const mood = resolveMood(key);
    return mood ? mood.hex : null;
};
