import type { AppState } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

export function getState(): Promise<AppState> {
  return request<AppState>("/api/state");
}

export function startMission(prompt: string): Promise<AppState> {
  return request<AppState>("/api/missions", {
    method: "POST",
    body: JSON.stringify({ prompt })
  });
}

export function approveAction(id: string): Promise<AppState> {
  return request<AppState>(`/api/actions/${id}/approve`, { method: "POST" });
}

export function rejectAction(id: string): Promise<AppState> {
  return request<AppState>(`/api/actions/${id}/reject`, { method: "POST" });
}

export function resetDemo(): Promise<AppState> {
  return request<AppState>("/api/reset", { method: "POST" });
}
