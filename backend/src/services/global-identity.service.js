import { parsePhoneNumberFromString } from "libphonenumber-js/max";

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export function normalizeGlobalMobile(value) {
  const candidate = String(value || "").trim();
  const phone = parsePhoneNumberFromString(candidate);
  if (!phone?.isValid()) {
    throw Object.assign(new Error("Enter a valid international mobile number including country code."), { statusCode: 400 });
  }
  return {
    mobile: phone.number,
    countryCode: phone.country || null,
    callingCode: phone.countryCallingCode || null,
    countryName: phone.country ? displayNames.of(phone.country) : null,
  };
}

export function normalizeTimezone(value) {
  const timezone = String(value || "").trim();
  if (!timezone) return "UTC";
  try {
    Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}

export function normalizeLanguage(value) {
  const language = String(value || "en").trim().replace("_", "-");
  return /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language) ? language : "en";
}
