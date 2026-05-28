import { AuthService } from "../services/auth.service.js";

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

export async function signup(req, res, next) {
  try {
    const authService = new AuthService({ pool: req.app.locals.pool });
    const result = await authService.signup(req.body);
    setSessionCookies(req, res, result);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const authService = new AuthService({ pool: req.app.locals.pool });
    const result = await authService.login({
      ...req.body,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    setSessionCookies(req, res, result);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Authentication required." });
    const authService = new AuthService({ pool: req.app.locals.pool });
    const user = await authService.me(req.user.id);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const authService = new AuthService({ pool: req.app.locals.pool });
    const result = await authService.refresh({
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
    const authService = new AuthService({ pool: req.app.locals.pool });
    const result = await authService.logout({
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
    const authService = new AuthService({ pool: req.app.locals.pool });
    const result = await authService.forgotPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const authService = new AuthService({ pool: req.app.locals.pool });
    const result = await authService.resetPassword(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const authService = new AuthService({ pool: req.app.locals.pool });
    const result = await authService.verifyEmail(req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
