import { AuthService } from "../services/auth.service.js";
import { GoogleOAuthConfigService } from "../services/google-oauth-config.service.js";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function csrfSecret() {
  return process.env.CSRF_SECRET || process.env.JWT_SECRET || process.env.PROVIDER_ENCRYPTION_KEY || "codrai-local-csrf-secret";
}

function signCsrfToken(token) {
  return createHmac("sha256", csrfSecret()).update(token).digest("base64url");
}

function verifyCsrfToken(req) {
  const token = String(req.body?.csrfToken || req.headers["x-codrai-csrf-token"] || "");
  const signature = String(req.cookies?.codrai_oauth_csrf || "");
  if (!token || !signature) {
    throw Object.assign(new Error("Authentication security token is missing. Please retry."), { statusCode: 403 });
  }
  const expected = signCsrfToken(token);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw Object.assign(new Error("Authentication security token is invalid. Please retry."), { statusCode: 403 });
  }
}

function cookieOptions(req, maxAgeMs) {
  const host = String(req.headers.host || "");
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
  const secure = !isLocalhost && (process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https");
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
    maxAge: maxAgeMs,
  };
}

function setSessionCookies(req, res, result) {
  if (result.token) res.cookie("codrai_access_token", result.token, cookieOptions(req, 7 * 24 * 60 * 60 * 1000));
  if (result.refreshToken) res.cookie("codrai_refresh_token", result.refreshToken, cookieOptions(req, 45 * 24 * 60 * 60 * 1000));
}

function clearSessionCookies(res) {
  res.clearCookie("codrai_access_token", { path: "/" });
  res.clearCookie("codrai_refresh_token", { path: "/" });
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function xmlCell(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function authService(req) {
  return new AuthService({ pool: req.app.locals.pool, redis: req.app.locals.redis });
}

function maskEmail(email) {
  const [local = "", domain = ""] = String(email || "").split("@");
  return domain ? `${local.slice(0, 2)}***@${domain}` : null;
}

function maskMobile(mobile) {
  const value = String(mobile || "");
  return value.length > 6 ? `${value.slice(0, 3)}******${value.slice(-3)}` : null;
}

export async function csrfToken(req, res, next) {
  try {
    const token = randomBytes(32).toString("base64url");
    res.cookie("codrai_oauth_csrf", signCsrfToken(token), {
      ...cookieOptions(req, 10 * 60 * 1000),
      sameSite: "lax",
    });
    return res.status(200).json({ csrfToken: token, expiresInSeconds: 600 });
  } catch (error) {
    return next(error);
  }
}

export async function signup(req, res, next) {
  try {
    console.info("AUTH SIGNUP REQUEST RECEIVED", {
      email: maskEmail(req.body?.email),
      whatsapp: maskMobile(req.body?.whatsapp),
      hasPassword: Boolean(req.body?.password),
      hasName: Boolean(req.body?.name),
    });
    verifyCsrfToken(req);
    console.info("AUTH SIGNUP CSRF VERIFIED", {
      email: maskEmail(req.body?.email),
      whatsapp: maskMobile(req.body?.whatsapp),
    });
    const result = await authService(req).signup({
      ...req.body,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    console.info("AUTH SIGNUP RESPONSE READY", {
      email: maskEmail(req.body?.email),
      status: result.status,
      challengeId: result.challengeId || null,
    });
    return res.status(202).json(result);
  } catch (error) {
    console.error("AUTH SIGNUP FAILED", {
      email: maskEmail(req.body?.email),
      code: error.code || "AUTH_SIGNUP_FAILED",
      message: error.message,
    });
    return next(error);
  }
}

export async function requestOtp(req, res, next) {
  try {
    verifyCsrfToken(req);
    const result = await authService(req).requestOtp({
      ...req.body,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function resendOtp(req, res, next) {
  try {
    verifyCsrfToken(req);
    const result = await authService(req).resendOtp({
      challengeId: req.body.challengeId,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    verifyCsrfToken(req);
    const result = await authService(req).verifyOtp({
      ...req.body,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    setSessionCookies(req, res, result);
    res.clearCookie("codrai_oauth_csrf", { path: "/" });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function sendTwilioOtp(req, res, next) {
  try {
    verifyCsrfToken(req);
    const result = await authService(req).sendTwilioOtp({
      phone: req.body.phone,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function verifyTwilioOtp(req, res, next) {
  try {
    verifyCsrfToken(req);
    const result = await authService(req).verifyTwilioOtp({
      phone: req.body.phone,
      otp: req.body.otp,
      rememberMe: req.body.rememberMe !== false,
      deviceFingerprint: req.body.deviceFingerprint,
      deviceName: req.body.deviceName,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    if (result.success && result.verified) {
      setSessionCookies(req, res, result);
      res.clearCookie("codrai_oauth_csrf", { path: "/" });
    }
    return res.status(result.success ? 200 : 401).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    verifyCsrfToken(req);
    const result = await authService(req).login({
      ...req.body,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function googleConfig(req, res, next) {
  try {
    const service = new GoogleOAuthConfigService({ pool: req.app.locals.pool });
    return res.status(200).json(await service.publicConfig());
  } catch (error) {
    return next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    verifyCsrfToken(req);
    console.log("GOOGLE CALLBACK", {
      mode: req.body.credential ? "credential" : "code",
      redirectUri: req.body.redirectUri || null,
      hasCode: Boolean(req.body.code),
      hasCredential: Boolean(req.body.credential),
    });
    const result = await authService(req).googleLogin({
      code: req.body.code,
      credential: req.body.credential,
      redirectUri: req.body.redirectUri,
      rememberMe: req.body.rememberMe !== false,
      deviceFingerprint: req.body.deviceFingerprint,
      deviceName: req.body.deviceName,
      countryCode: req.body.countryCode,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    setSessionCookies(req, res, result);
    console.log("USER LOGIN SUCCESS", {
      provider: "google",
      userId: result.user?.id || null,
      sessionCreated: Boolean(result.token),
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function googleSettings(req, res, next) {
  try {
    const service = new GoogleOAuthConfigService({ pool: req.app.locals.pool });
    return res.status(200).json(await service.adminStatus());
  } catch (error) {
    return next(error);
  }
}

export async function saveGoogleSettings(req, res, next) {
  try {
    const service = new GoogleOAuthConfigService({ pool: req.app.locals.pool });
    const result = await service.save({
      ...req.body,
      userId: req.user?.id,
      workspaceId: req.workspace?.id || req.body.workspaceId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function testGoogleSettings(req, res, next) {
  try {
    const service = new GoogleOAuthConfigService({ pool: req.app.locals.pool });
    return res.status(200).json(await service.test());
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const user = await authService(req).me(req.user.id);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const result = await authService(req).refresh({
      refreshToken: req.body.refreshToken || req.cookies?.codrai_refresh_token,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    setSessionCookies(req, res, result);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const result = await authService(req).logout({
      sessionId: req.user?.sessionId,
      userId: req.user?.id,
      refreshToken: req.body.refreshToken || req.cookies?.codrai_refresh_token,
    });
    clearSessionCookies(res);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await authService(req).forgotPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await authService(req).resetPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const result = await authService(req).verifyEmail(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function userAnalytics(req, res, next) {
  try {
    return res.status(200).json(await authService(req).userAnalytics());
  } catch (error) {
    return next(error);
  }
}

export async function exportUsers(req, res, next) {
  try {
    const rows = await authService(req).exportUsers();
    const columns = ["id", "name", "email", "whatsapp", "country_code", "country_name", "timezone", "language_preference", "kyc_status", "account_status", "role", "auth_provider", "email_verified", "mobile_verified", "created_at", "last_login_at"];
    const format = String(req.params.format || "csv").toLowerCase();

    if (format === "xls" || format === "excel") {
      const header = columns.map((column) => `<Cell><Data ss:Type="String">${xmlCell(column)}</Data></Cell>`).join("");
      const body = rows.map((row) => `<Row>${columns.map((column) => `<Cell><Data ss:Type="String">${xmlCell(row[column])}</Data></Cell>`).join("")}</Row>`).join("");
      const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="CODRAI Users"><Table><Row>${header}</Row>${body}</Table></Worksheet>
</Workbook>`;
      res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="codrai-users.xls"');
      return res.status(200).send(workbook);
    }

    const csv = [
      columns.map(csvCell).join(","),
      ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
    ].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="codrai-users.csv"');
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    return next(error);
  }
}

export async function exportOtpAnalytics(req, res, next) {
  try {
    const rows = await authService(req).exportOtpAnalytics();
    const columns = [
      "challenge_id", "purpose", "email", "mobile", "delivery_status", "failed_attempts",
      "verified", "email_provider", "email_status", "sms_provider", "sms_status",
      "created_at", "expires_at", "verified_at",
    ];
    const format = String(req.params.format || "csv").toLowerCase();

    if (format === "xls" || format === "excel") {
      const header = columns.map((column) => `<Cell><Data ss:Type="String">${xmlCell(column)}</Data></Cell>`).join("");
      const body = rows.map((row) => `<Row>${columns.map((column) => `<Cell><Data ss:Type="String">${xmlCell(row[column])}</Data></Cell>`).join("")}</Row>`).join("");
      const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="OTP Analytics"><Table><Row>${header}</Row>${body}</Table></Worksheet>
</Workbook>`;
      res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="codrai-otp-analytics.xls"');
      return res.status(200).send(workbook);
    }

    const csv = [
      columns.map(csvCell).join(","),
      ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
    ].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="codrai-otp-analytics.csv"');
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    return next(error);
  }
}

export async function securityOverview(req, res, next) {
  try {
    return res.status(200).json(await authService(req).securityOverview(req.user.id));
  } catch (error) {
    return next(error);
  }
}

export async function revokeSession(req, res, next) {
  try {
    return res.status(200).json(await authService(req).revokeSession({
      userId: req.user.id,
      sessionId: req.params.sessionId,
    }));
  } catch (error) {
    return next(error);
  }
}
