import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { db, auth } from '../firebase';
import { Termohigrometro, Usuario, Anexo10Data, Anexo11Data } from '../types';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function toFallbackEmail(usuario: string): string {
  return `${usuario.trim().toLowerCase()}@vivens.local`;
}

export async function fsAuthLogin(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function fsAuthLogout(): Promise<void> {
  await signOut(auth);
}

export async function fsAuthCreateUser(email: string, password: string): Promise<void> {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    // Send password setup email so user can set their own password
    await sendPasswordResetEmail(auth, email);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== 'auth/email-already-in-use') throw err;
  }
}

export async function fsSendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function fsAuthUpdatePassword(email: string, oldPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const credential = EmailAuthProvider.credential(email, oldPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function fsAuthDeleteUser(email: string, password: string): Promise<void> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await deleteUser(cred.user);
  } catch {
    // Silently continue — Firestore data is removed regardless
  }
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

// ─── Configuración global ─────────────────────────────────────────────────────

export interface AppConfig {
  institucion: string;
  estrategia: string;
  establecimiento: string;
  direccion: string;
}

export async function fsLoadConfig(): Promise<AppConfig> {
  const snap = await getDoc(doc(db, 'config', 'header'));
  if (!snap.exists()) return { institucion: '', estrategia: '', establecimiento: '', direccion: '' };
  return snap.data() as AppConfig;
}

export async function fsSaveConfig(cfg: AppConfig): Promise<void> {
  await setDoc(doc(db, 'config', 'header'), cfg);
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export async function fsLoadUsuarios(): Promise<Usuario[]> {
  const snap = await getDocs(collection(db, 'usuarios'));
  return snap.docs.map(d => d.data() as Usuario);
}

export async function fsSaveUsuario(u: Usuario): Promise<void> {
  await setDoc(doc(db, 'usuarios', u.id), u);
}

export async function fsDeleteUsuario(id: string): Promise<void> {
  await deleteDoc(doc(db, 'usuarios', id));
}

export async function fsGetUsuarioByLogin(usuario: string): Promise<Usuario | null> {
  const q = query(collection(db, 'usuarios'), where('usuario', '==', usuario));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Usuario;
}

// ─── Termohigrómetros ─────────────────────────────────────────────────────────

export async function fsLoadTermos(): Promise<Termohigrometro[]> {
  const snap = await getDocs(collection(db, 'termos'));
  return snap.docs.map(d => d.data() as Termohigrometro);
}

export async function fsSaveTermo(t: Termohigrometro): Promise<void> {
  await setDoc(doc(db, 'termos', t.id), t);
}

export async function fsDeleteTermo(id: string): Promise<void> {
  await deleteDoc(doc(db, 'termos', id));
}

// ─── Registros mensuales ──────────────────────────────────────────────────────

function registroId(termoId: string, year: number, month: number): string {
  return `${termoId}_${year}_${String(month).padStart(2, '0')}`;
}

export async function fsLoadRegistro(termoId: string, year: number, month: number): Promise<Anexo10Data | Anexo11Data | null> {
  const id = registroId(termoId, year, month);
  const snap = await getDoc(doc(db, 'registros', id));
  if (!snap.exists()) return null;
  return snap.data() as Anexo10Data | Anexo11Data;
}

export async function fsSaveRegistro(termoId: string, year: number, month: number, data: Anexo10Data | Anexo11Data): Promise<void> {
  const id = registroId(termoId, year, month);
  await setDoc(doc(db, 'registros', id), { ...data, termoId, year, month });
}

export async function fsGetMonthsWithData(termoId: string): Promise<{ year: number; month: number }[]> {
  const q = query(collection(db, 'registros'), where('termoId', '==', termoId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ year: d.data().year as number, month: d.data().month as number }));
}

// ─── Ubicaciones ──────────────────────────────────────────────────────────────

export async function fsLoadUbicaciones(): Promise<string[]> {
  const snap = await getDocs(collection(db, 'ubicaciones'));
  return snap.docs.map(d => d.data().nombre as string).sort();
}

export async function fsSaveUbicacion(nombre: string): Promise<void> {
  const id = nombre.trim().toLowerCase().replace(/\s+/g, '_');
  await setDoc(doc(db, 'ubicaciones', id), { nombre: nombre.trim() });
}

export async function fsDeleteUbicacion(nombre: string): Promise<void> {
  const id = nombre.trim().toLowerCase().replace(/\s+/g, '_');
  await deleteDoc(doc(db, 'ubicaciones', id));
}

// ─── Public verification helpers (Firestore rules must allow public read) ─────

export const fsLoadRegistroPublic = fsLoadRegistro;

export async function fsLoadTermoPublic(termoId: string): Promise<Termohigrometro | null> {
  const snap = await getDoc(doc(db, 'termos', termoId));
  if (!snap.exists()) return null;
  return snap.data() as Termohigrometro;
}

// ─── Días bloqueados ──────────────────────────────────────────────────────────

export async function fsLoadLockedDays(termoId: string, year: number, month: number): Promise<Set<number>> {
  const id = `locked_${registroId(termoId, year, month)}`;
  const snap = await getDoc(doc(db, 'lockedDays', id));
  if (!snap.exists()) return new Set();
  return new Set((snap.data().days as number[]) ?? []);
}

export async function fsSaveLockedDays(termoId: string, year: number, month: number, days: Set<number>): Promise<void> {
  const id = `locked_${registroId(termoId, year, month)}`;
  await setDoc(doc(db, 'lockedDays', id), { termoId, year, month, days: Array.from(days) });
}
