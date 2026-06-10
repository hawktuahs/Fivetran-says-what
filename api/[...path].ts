import type { Request, Response } from "express";
import { app } from "../server/app";

export default function handler(request: Request, response: Response) {
  return app(request, response);
}
