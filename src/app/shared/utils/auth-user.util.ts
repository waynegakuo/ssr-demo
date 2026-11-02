import { User } from '@angular/fire/auth';

/**
 * Lightweight, plain-JSON user profile that can be safely serialized
 * into Angular's TransferState HTML payload without circular references
 * or leaking sensitive token objects.
 */
export interface SerializableUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * Maps a Firebase `User` instance into a plain serializable object.
 */
export function toSerializableUser(user: User): SerializableUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

/**
 * Extracts basic user profile claims from a Firebase ID token (JWT) payload.
 * Used on the server as a fast, zero-key fallback if network lookup is unavailable.
 */
export function decodeUserFromIdToken(idToken: string): SerializableUser | null {
  try {
    const payloadBase64 = idToken.split('.')[1];
    if (!payloadBase64) return null;
    const json = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const claims = JSON.parse(json);
    const uid = claims.user_id || claims.sub;
    if (!uid) return null;
    return {
      uid,
      displayName: claims.name ?? null,
      email: claims.email ?? null,
      photoURL: claims.picture ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Computes 1–2 uppercase initials from a user's display name.
 */
export function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
