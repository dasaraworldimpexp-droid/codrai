const LOCAL_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

export function getAllowedClientOrigins() {
  const configured = [
    process.env.CLIENT_URL,
    process.env.PUBLIC_APP_URL,
    ...(process.env.CLIENT_URLS || "").split(","),
  ]
    .map((origin) => origin?.trim())
    .filter(Boolean);

  return [...new Set([...configured, ...LOCAL_CLIENT_ORIGINS])];
}

export function isAllowedClientOrigin(origin) {
  if (!origin) return true;
  return getAllowedClientOrigins().includes(origin);
}
