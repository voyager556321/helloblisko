import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { HOME_TOKEN, type DB, type PublicRequest, type RequestRow, type Status } from "./types";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");
const audioDir = path.join(dataDir, "audio");

const g = globalThis as unknown as { __dbChain?: Promise<unknown> };

function seed(): DB {
  return {
    deviceToken: HOME_TOKEN,
    senior: {
      id: "s-anna",
      name: "Anna Nowak",
      district: "Krowodrza",
      address: "ul. Mazowiecka 4/6",
      pesel: "45010112345",
    },
    volunteers: [
      { id: "v-jan", name: "Jan Wójcik", phone: "600 100 201", districts: ["Krowodrza"] },
      { id: "v-ewa", name: "Ewa Lis", phone: "600 100 202", districts: ["Podgórze"] },
      { id: "v-piotr", name: "Piotr Maj", phone: "600 100 203", districts: ["Krowodrza", "Grzegórzki"] },
    ],
    requests: [],
  };
}

function read(): DB {
  mkdirSync(audioDir, { recursive: true });
  try {
    return JSON.parse(readFileSync(dbPath, "utf8")) as DB;
  } catch {
    const db = seed();
    writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return db;
  }
}

function write(db: DB) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function update<T>(fn: (db: DB) => T): Promise<T> {
  const prev = g.__dbChain ?? Promise.resolve();
  const run = prev.then(() => {
    const db = read();
    const result = fn(db);
    write(db);
    return result;
  });
  g.__dbChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function view(): Promise<DB> {
  const prev = g.__dbChain ?? Promise.resolve();
  const run = prev.then(() => read());
  g.__dbChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const OPEN: Status[] = ["ready", "assigned", "revealed"];

export function audioPath(fileName: string) {
  return path.join(audioDir, fileName);
}

export function getDb() {
  return view();
}

export async function resetDb() {
  return update((db) => {
    const fresh = seed();
    db.deviceToken = fresh.deviceToken;
    db.senior = fresh.senior;
    db.volunteers = fresh.volunteers;
    db.requests = fresh.requests;
    return fresh;
  });
}

export async function seniorByToken(token: string) {
  const db = await getDb();
  if (token !== db.deviceToken) return null;
  return db.senior;
}

function volunteerName(db: DB, id: string | null) {
  if (!id) return null;
  return db.volunteers.find((v) => v.id === id)?.name ?? null;
}

export function toPublic(db: DB, row: RequestRow, secrets: boolean): PublicRequest {
  const base: PublicRequest = {
    id: row.id,
    status: row.status,
    summary: row.summary,
    transcript: secrets ? row.transcript : "",
    createdAt: row.createdAt,
    seniorName: db.senior.name,
    district: db.senior.district,
    hasAudio: Boolean(row.audioFile),
    volunteerId: row.volunteerId,
    volunteerName: volunteerName(db, row.volunteerId),
  };
  if (!secrets) return base;
  return {
    ...base,
    address: db.senior.address,
    pesel: db.senior.pesel,
    code4: row.code4,
  };
}

export async function listRequests() {
  const db = await getDb();
  return {
    senior: db.senior,
    volunteers: db.volunteers,
    requests: db.requests,
    db,
  };
}

export async function createRequest(input: {
  transcript: string;
  summary: string;
  code4: string | null;
  audioFile: string | null;
  mime: string | null;
}) {
  return update((db) => {
    const row: RequestRow = {
      id: `r_${randomBytes(4).toString("hex")}`,
      seniorId: db.senior.id,
      status: "ready",
      audioFile: input.audioFile,
      mime: input.mime,
      transcript: input.transcript,
      summary: input.summary,
      code4: input.code4,
      createdAt: new Date().toISOString(),
      volunteerId: null,
      assignedAt: null,
      revealedAt: null,
      doneAt: null,
    };
    db.requests.unshift(row);
    return toPublic(db, row, false);
  });
}

export async function latestForHome() {
  const db = await getDb();
  const row = db.requests[0] ?? null;
  return row ? toPublic(db, row, false) : null;
}

export async function cancelLatest() {
  return update((db) => {
    const row = db.requests.find((r) => OPEN.includes(r.status));
    if (!row) return { error: "Немає відкритого запиту" as const };
    row.status = "cancelled";
    return { request: toPublic(db, row, false) };
  });
}

export async function patchRequest(id: string, patch: { summary?: string; code4?: string | null }) {
  return update((db) => {
    const row = db.requests.find((r) => r.id === id);
    if (!row) return { error: "Немає такого запиту" as const };
    if (patch.summary !== undefined) row.summary = patch.summary.trim();
    if (patch.code4 !== undefined) row.code4 = patch.code4 ? patch.code4.trim() : null;
    return { request: toPublic(db, row, true) };
  });
}

export async function assignRequest(id: string, volunteerId: string) {
  return update((db) => {
    const row = db.requests.find((r) => r.id === id);
    const volunteer = db.volunteers.find((v) => v.id === volunteerId);
    if (!row || !volunteer) return { error: "Немає запиту або волонтера" as const };
    if (row.status === "done" || row.status === "cancelled") {
      return { error: "Цей запит уже закритий" as const };
    }
    row.volunteerId = volunteer.id;
    row.assignedAt = new Date().toISOString();
    row.revealedAt = null;
    row.status = "assigned";
    return { request: toPublic(db, row, true) };
  });
}

export async function jobsFor(volunteerId: string) {
  const db = await getDb();
  const volunteer = db.volunteers.find((v) => v.id === volunteerId);
  if (!volunteer) return null;
  const jobs = db.requests
    .filter((r) => r.volunteerId === volunteerId && r.status !== "cancelled")
    .map((r) => toPublic(db, r, r.status === "revealed"));
  return { volunteer, jobs };
}

export async function revealJob(id: string, volunteerId: string) {
  return update((db) => {
    const row = db.requests.find((r) => r.id === id && r.volunteerId === volunteerId);
    if (!row) return { error: "Це доручення не твоє" as const };
    if (row.status !== "assigned" && row.status !== "revealed") {
      return { error: "Спочатку координатор має призначити людину" as const };
    }
    row.status = "revealed";
    row.revealedAt = row.revealedAt ?? new Date().toISOString();
    return { request: toPublic(db, row, true) };
  });
}

export async function doneJob(id: string, volunteerId: string) {
  return update((db) => {
    const row = db.requests.find((r) => r.id === id && r.volunteerId === volunteerId);
    if (!row) return { error: "Це доручення не твоє" as const };
    if (row.status !== "revealed") return { error: "Спочатку відкрий адресу" as const };
    row.status = "done";
    row.doneAt = new Date().toISOString();
    return { request: toPublic(db, row, false) };
  });
}

export async function audioFor(id: string) {
  const db = await getDb();
  const row = db.requests.find((r) => r.id === id);
  if (!row?.audioFile) return null;
  return { filePath: audioPath(row.audioFile), mime: row.mime ?? "application/octet-stream" };
}

export function newAudioName(ext: string) {
  return `${randomBytes(8).toString("hex")}${ext}`;
}
