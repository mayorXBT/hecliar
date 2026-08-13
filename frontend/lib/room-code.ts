import { keccak256, toHex } from "viem";

const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 12;

/**
 * The code is the room's only secret, so it has to be the only input to the
 * hash.
 *
 * This previously hashed the random bytes and derived the code from them
 * separately, which is lossy in one direction: a guest holding the code could
 * not recompute the hash, so joinRoom was always called with a hash no room
 * had ever been created under and always reverted with RoomNotFound. Friend
 * mode could not work in a browser at all.
 *
 * 32 divides 256 exactly, so indexing the alphabet by a random byte modulo 32
 * is unbiased. Twelve symbols is 60 bits, which puts guessing a room out of
 * reach even for someone willing to grind on-chain lookups; eight symbols was
 * only 40, and a room is the sole thing standing between a stranger and a
 * seat at a private table.
 */
export function roomHashFromCode(code: string): `0x${string}` {
  return keccak256(toHex(normalizeRoomCode(code)));
}

export function generateRoomCode(): { code: string; hash: `0x${string}` } {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += BASE32[bytes[i] % BASE32.length];
  }
  return { code, hash: roomHashFromCode(code) };
}

export function isValidRoomCode(raw: string): boolean {
  if (raw.length !== CODE_LENGTH) return false;
  for (const char of raw) {
    if (!BASE32.includes(char.toUpperCase())) return false;
  }
  return true;
}

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}
