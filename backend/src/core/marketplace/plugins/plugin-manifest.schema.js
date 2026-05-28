export const PLUGIN_MANIFEST_REQUIRED_FIELDS = Object.freeze([
  "id",
  "name",
  "version",
  "publisher",
  "capabilities",
  "permissions",
  "entrypoints",
]);

export function validatePluginManifest(manifest) {
  const missing = PLUGIN_MANIFEST_REQUIRED_FIELDS.filter((field) => manifest[field] === undefined);
  if (missing.length > 0) {
    throw new Error(`Plugin manifest missing fields: ${missing.join(", ")}`);
  }
  return true;
}
