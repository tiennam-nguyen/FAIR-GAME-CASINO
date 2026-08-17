const ROOM_ID_PATTERN = /^[A-HJ-NP-Z2-9]{5}$/;

export type RoomLocation =
  | { kind: 'absent' }
  | { kind: 'invalid'; raw: string }
  | { kind: 'valid'; roomId: string };

export function normalizeRoomId(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return ROOM_ID_PATTERN.test(normalized) ? normalized : null;
}

export function readRoomLocation(search: string): RoomLocation {
  const params = new URLSearchParams(search);
  if (!params.has('room')) return { kind: 'absent' };

  const raw = params.get('room') ?? '';
  const roomId = normalizeRoomId(raw);
  return roomId ? { kind: 'valid', roomId } : { kind: 'invalid', raw };
}

export function buildRoomUrl(currentUrl: string, roomId: string | null): string {
  const url = new URL(currentUrl);
  if (roomId) {
    const normalized = normalizeRoomId(roomId);
    if (!normalized) throw new Error('Mã phòng không hợp lệ.');
    url.searchParams.set('room', normalized);
  } else {
    url.searchParams.delete('room');
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function writeRoomIdToLocation(roomId: string | null, mode: 'push' | 'replace' = 'push') {
  if (typeof window === 'undefined') return;
  const nextUrl = buildRoomUrl(window.location.href, roomId);
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', nextUrl);
}
