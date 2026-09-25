// A supplemental check, not a claim of complete anonymization. Raw content is never logged.
export function containsDirectContact(value: unknown): boolean {
  const s = JSON.stringify(value);
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?<!\d)1[3-9]\d{9}(?!\d)|(?<!\d)\d{17}[\dXx](?!\d)/i.test(
    s,
  );
}
