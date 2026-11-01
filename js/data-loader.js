const SUPPORTED_SCHEMA_VERSION = 1;

export async function loadTopic(topicId) {
    const response = await fetch(new URL(`../data/${topicId}.json`, import.meta.url));
    if (!response.ok) {
        throw new Error(`Themendatei "${topicId}.json" nicht gefunden (${response.status}).`);
    }
    const topic = await response.json();
    if (topic.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
        throw new Error(`Unbekannte schemaVersion ${topic.schemaVersion} in "${topicId}.json".`);
    }
    return topic;
}
