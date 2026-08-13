import { keccak256, toHex } from "viem";

const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;

export function generateRoomCode(): { code: string; hash: `0x${string}` } {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hash = keccak256(toHex(bytes));
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += BASE32[bytes[i] % BASE32.length];
  }
  return { code, hash };
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
