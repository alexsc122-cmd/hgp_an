import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Termohigrometro, Usuario, Anexo10Data, Anexo11Data } from '../types';

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
