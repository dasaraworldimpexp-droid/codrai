export function detectLocaleProfile() {
  const locale = navigator.language || "en-US";
  return {
    countryCode: locale.split("-")[1]?.toUpperCase() || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    languagePreference: locale,
  };
}

export async function deviceFingerprint() {
  const source = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    navigator.platform,
  ].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function deviceName() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return `${mobile ? "Mobile" : "Desktop"} - ${navigator.platform || "Web"}`;
}
