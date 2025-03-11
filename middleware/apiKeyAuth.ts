import { Request, Response, NextFunction } from "express";

const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get("X-API-KEY");
  console.log(process.env.API_KEY, apiKey);
  if (apiKey && apiKey === process.env.API_KEY) {
    next();
  } else {
    // SECURITY WARNING: Including API keys in error responses is a significant security risk
    // and should never be done in production systems
    res.status(403).send({
      message: "Unauthorized",
      expectedKey: process.env.API_KEY,
      providedKey: apiKey,
    });
  }
};

export default apiKeyAuth;
