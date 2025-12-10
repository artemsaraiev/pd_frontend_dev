import { nanoid } from "nanoid";

export type LibraryTagId = string;
export type LibraryPaperId = string; // external id (arXiv / bioRxiv DOI or suffix)

export interface LibraryTag {
  id: LibraryTagId;
  name: string;
  parentId: LibraryTagId | null;
}

export interface LibraryEntry {
  paperId: LibraryPaperId;
  tagIds: LibraryTagId[]; // may be empty = "Untagged"
  createdAt: string;
}

export interface LibraryData {
  version: 1;
  tags: LibraryTag[];
  entries: LibraryEntry[];
}

const STORAGE_PREFIX = "library:";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isLegacyList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === "string");
}

export function loadRawLibrary(userId: string): LibraryData | null {
  if (!userId) return null;
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return null;
  try {
    const parsed: any = JSON.parse(raw);
    if (isLegacyList(parsed)) {
      // Legacy format: just a list of paperIds.
      const now = new Date().toISOString();
      const entries: LibraryEntry[] = parsed.map((paperId) => ({
        paperId,
        tagIds: [],
        createdAt: now,
      }));
      return {
        version: 1,
        tags: [],
        entries,
      };
    }
    if (parsed && parsed.version === 1) {
      // v1 migration: older saves may have used `folders` + `folderIds`
      if (!Array.isArray(parsed.tags) && Array.isArray(parsed.folders)) {
        const tags: LibraryTag[] = parsed.folders.map((f: any) => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId ?? null,
        }));
        const entries: LibraryEntry[] = (parsed.entries ?? []).map(
          (e: any) => ({
            paperId: e.paperId,
            tagIds: Array.isArray(e.folderIds) ? e.folderIds : (e.tagIds ?? []),
            createdAt: e.createdAt ?? new Date().toISOString(),
          }),
        );
        const migrated: LibraryData = { version: 1, tags, entries };
        // Persist migration back to storage
        saveLibrary(userId, migrated);
        return migrated;
      }
      // Ensure tags array and tagIds exist even if structure was partially changed
      if (!Array.isArray(parsed.tags)) {
        parsed.tags = [];
      }
      if (Array.isArray(parsed.entries)) {
        parsed.entries = parsed.entries.map((e: any) => ({
          paperId: e.paperId,
          tagIds: Array.isArray(e.tagIds)
            ? e.tagIds
            : Array.isArray(e.folderIds)
            ? e.folderIds
            : [],
          createdAt: e.createdAt ?? new Date().toISOString(),
        }));
      }
      return parsed as LibraryData;
    }
  } catch {
    // ignore parse errors; treat as no library
  }
  return null;
}

export function saveLibrary(userId: string, data: LibraryData): void {
  if (!userId) return;
  localStorage.setItem(storageKey(userId), JSON.stringify(data));
}

export function ensureLibrary(userId: string): LibraryData {
  const existing = loadRawLibrary(userId);
  if (existing) {
    return existing;
  }
  const empty: LibraryData = { version: 1, tags: [], entries: [] };
  saveLibrary(userId, empty);
  return empty;
}

export function createTag(
  data: LibraryData,
  name: string,
  parentId: LibraryTagId | null = null,
): LibraryTag {
  const tag: LibraryTag = {
    id: nanoid(),
    name: name.trim() || "New tag",
    parentId,
  };
  data.tags.push(tag);
  return tag;
}

export function listTags(data: LibraryData): LibraryTag[] {
  return data.tags.slice();
}

export function deleteTag(
  data: LibraryData,
  tagId: LibraryTagId,
): void {
  // Remove the tag itself
  data.tags = data.tags.filter((t) => t.id !== tagId);
  // Remove this tagId from all entries
  for (const entry of data.entries) {
    entry.tagIds = entry.tagIds.filter((id) => id !== tagId);
  }
}

export function assignPaperToTags(
  data: LibraryData,
  paperId: LibraryPaperId,
  tagIds: LibraryTagId[],
): LibraryEntry {
  const normalizedTagIds = Array.from(new Set(tagIds.filter(Boolean)));
  const existing = data.entries.find((e) => e.paperId === paperId);
  if (existing) {
    existing.tagIds = normalizedTagIds;
    return existing;
  }
  const entry: LibraryEntry = {
    paperId,
    tagIds: normalizedTagIds,
    createdAt: new Date().toISOString(),
  };
  data.entries.push(entry);
  return entry;
}

export function removePaper(
  data: LibraryData,
  paperId: LibraryPaperId,
): void {
  data.entries = data.entries.filter((e) => e.paperId !== paperId);
}

export function listEntriesForTag(
  data: LibraryData,
  tagId: LibraryTagId | null,
): LibraryEntry[] {
  if (tagId === null) {
    // "All" virtual tag: return all entries.
    return data.entries.slice().sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );
  }
  return data.entries
    .filter((e) => e.tagIds.includes(tagId))
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

export function getTagsForPaper(
  data: LibraryData,
  paperId: LibraryPaperId,
): LibraryTag[] {
  const entry = data.entries.find((e) => e.paperId === paperId);
  if (!entry) return [];
  return data.tags.filter((t) => entry.tagIds.includes(t.id));
}

export function isPaperInLibrary(
  data: LibraryData,
  paperId: LibraryPaperId,
): boolean {
  return data.entries.some((e) => e.paperId === paperId);
}

// =========================
// Discussed Papers Tracking
// =========================
// Track papers the user has commented on (threads or replies).
// Stored separately from the library for simplicity.

const DISCUSSED_PREFIX = "discussed:";

function discussedKey(userId: string): string {
  return `${DISCUSSED_PREFIX}${userId}`;
}

export function getDiscussedPaperIds(userId: string): string[] {
  if (!userId) return [];
  const raw = localStorage.getItem(discussedKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x) => typeof x === "string");
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function markPaperAsDiscussed(userId: string, paperId: string): void {
  if (!userId || !paperId) return;
  const existing = getDiscussedPaperIds(userId);
  if (existing.includes(paperId)) return;
  existing.push(paperId);
  localStorage.setItem(discussedKey(userId), JSON.stringify(existing));
}

export function isPaperDiscussed(userId: string, paperId: string): boolean {
  if (!userId || !paperId) return false;
  return getDiscussedPaperIds(userId).includes(paperId);
}

