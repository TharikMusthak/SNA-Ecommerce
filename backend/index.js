import express from "express";
import app from "./src/app.js";

// Keep an explicit Express import in the conventional root entrypoint so
// Vercel can detect and package this project as an Express application.
void express;

export default app;
