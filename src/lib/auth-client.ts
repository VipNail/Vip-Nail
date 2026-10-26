"use client";
import { createAuthClient } from "better-auth/react";

// Mismo dominio que la web: no hace falta baseURL.
export const authClient = createAuthClient();
