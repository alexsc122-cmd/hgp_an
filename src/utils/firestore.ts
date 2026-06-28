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

export async function fsAuthCreateUser(email: string, _password: string): Promise<void> {
  try {
    // Use a random temp password — user sets their own via the reset email
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    await createUserWithEmailAndPassword(auth, email, tempPassword);
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

export async function fsRenameUbicacion(oldNombre: string, newNombre: string): Promise<void> {
  const oldId = oldNombre.trim().toLowerCase().replace(/\s+/g, '_');
  const newId = newNombre.trim().toLowerCase().replace(/\s+/g, '_');
  await Promise.all([
    setDoc(doc(db, 'ubicaciones', newId), { nombre: newNombre.trim() }),
    deleteDoc(doc(db, 'ubicaciones', oldId)),
  ]);
  // Update all termos that had the old ubicacion
  const q = query(collection(db, 'termos'), where('ubicacion', '==', oldNombre.trim()));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => setDoc(d.ref, { ...d.data(), ubicacion: newNombre.trim() })));
}

// ─── Public verification helpers (Firestore rules must allow public read) ─────

export const fsLoadRegistroPublic = fsLoadRegistro;

export async function fsLoadTermoPublic(termoId: string): Promise<Termohigrometro | null> {
  const snap = await getDoc(doc(db, 'termos', termoId));
  if (!snap.exists()) return null;
  return snap.data() as Termohigrometro;
}

// ─── Días bloqueados ──────────────────────────────────────────────────────────

export interface LockedDaysData {
  days: Set<number>;
  lockedAt: Record<number, number>; // dia -> Unix ms when locked
}

export async function fsLoadLockedDays(termoId: string, year: number, month: number): Promise<LockedDaysData> {
  const id = `locked_${registroId(termoId, year, month)}`;
  const snap = await getDoc(doc(db, 'lockedDays', id));
  if (!snap.exists()) return { days: new Set(), lockedAt: {} };
  const data = snap.data();
  return {
    days: new Set((data.days as number[]) ?? []),
    lockedAt: (data.lockedAt as Record<number, number>) ?? {},
  };
}

export async function fsSaveLockedDays(
  termoId: string, year: number, month: number,
  days: Set<number>, lockedAt: Record<number, number> = {}
): Promise<void> {
  const id = `locked_${registroId(termoId, year, month)}`;
  await setDoc(doc(db, 'lockedDays', id), { termoId, year, month, days: Array.from(days), lockedAt });
}

// ─── Compliance report helpers ────────────────────────────────────────────────

export async function fsLoadAllRegistros(
  termos: Termohigrometro[], year: number, month: number
): Promise<Map<string, Anexo10Data | Anexo11Data | null>> {
  const results = await Promise.all(
    termos.map(t => fsLoadRegistro(t.id, year, month).then(r => [t.id, r] as const))
  );
  return new Map(results);
}

export async function fsLoadAllLockedDays(
  termos: Termohigrometro[], year: number, month: number
): Promise<Map<string, LockedDaysData>> {
  const results = await Promise.all(
    termos.map(t => fsLoadLockedDays(t.id, year, month).then(r => [t.id, r] as const))
  );
  return new Map(results);
}

// ─── Export / Import / Reset helpers ─────────────────────────────────────────

export interface ExportRow {
  termoId: string;
  termoNombre: string;
  tipo: string;
  year: number;
  month: number;
  dia: number;
  tempManana: string;
  tempTarde: string;
  humManana: string;
  humTarde: string;
  nombre: string;
  observaciones: string;
  tsManana: number | '';
  tsTarde: number | '';
  locked: boolean;
  lockedAt: number | '';
}

export async function fsExportAllData(termos: Termohigrometro[]): Promise<ExportRow[]> {
  const rows: ExportRow[] = [];
  // Load all registros across all termos
  const chunks: Termohigrometro[][] = [];
  for (let i = 0; i < termos.length; i += 10) chunks.push(termos.slice(i, i + 10));

  for (const chunk of chunks) {
    const ids = chunk.map(t => t.id);
    const [regSnap, lockSnap] = await Promise.all([
      getDocs(query(collection(db, 'registros'), where('termoId', 'in', ids))),
      getDocs(query(collection(db, 'lockedDays'), where('termoId', 'in', ids))),
    ]);

    // Build lockedDays lookup: `${termoId}_${year}_${month}` -> LockedDaysData
    const lockMap = new Map<string, LockedDaysData>();
    lockSnap.docs.forEach(d => {
      const data = d.data();
      const key = `${data.termoId}_${data.year}_${String(data.month).padStart(2, '0')}`;
      lockMap.set(key, {
        days: new Set((data.days as number[]) ?? []),
        lockedAt: (data.lockedAt as Record<number, number>) ?? {},
      });
    });

    regSnap.docs.forEach(d => {
      const data = d.data() as Anexo10Data & Anexo11Data & { termoId: string; year: number; month: number };
      const termo = chunk.find(t => t.id === data.termoId);
      if (!termo) return;
      const lockKey = `${data.termoId}_${data.year}_${String(data.month).padStart(2, '0')}`;
      const locked = lockMap.get(lockKey) ?? { days: new Set<number>(), lockedAt: {} };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((data.entries ?? []) as any[]).forEach((e: Record<string, unknown>) => {
        const dia = e.dia as number;
        rows.push({
          termoId: data.termoId,
          termoNombre: termo.nombre,
          tipo: termo.tipo,
          year: data.year,
          month: data.month,
          dia,
          tempManana: (e.tempManana as string) ?? '',
          tempTarde: (e.tempTarde as string) ?? '',
          humManana: (e.humManana as string) ?? '',
          humTarde: (e.humTarde as string) ?? '',
          nombre: (e.nombre as string) ?? '',
          observaciones: (e.observaciones as string) ?? '',
          tsManana: (e.tsManana as number) || '',
          tsTarde: (e.tsTarde as number) || '',
          locked: locked.days.has(dia),
          lockedAt: locked.lockedAt[dia] || '',
        });
      });
    });
  }
  return rows.sort((a, b) => a.termoId.localeCompare(b.termoId) || a.year - b.year || a.month - b.month || a.dia - b.dia);
}

export async function fsDeleteAllData(termos: Termohigrometro[]): Promise<void> {
  const chunks: Termohigrometro[][] = [];
  for (let i = 0; i < termos.length; i += 10) chunks.push(termos.slice(i, i + 10));

  for (const chunk of chunks) {
    const ids = chunk.map(t => t.id);
    const [regSnap, lockSnap] = await Promise.all([
      getDocs(query(collection(db, 'registros'), where('termoId', 'in', ids))),
      getDocs(query(collection(db, 'lockedDays'), where('termoId', 'in', ids))),
    ]);
    await Promise.all([
      ...regSnap.docs.map(d => deleteDoc(d.ref)),
      ...lockSnap.docs.map(d => deleteDoc(d.ref)),
    ]);
  }
}

export async function fsImportData(rows: ExportRow[]): Promise<void> {
  // Group rows by termoId + year + month
  const groups = new Map<string, ExportRow[]>();
  rows.forEach(r => {
    const key = `${r.termoId}_${r.year}_${String(r.month).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  });

  for (const [, groupRows] of groups) {
    const { termoId, year, month, tipo } = groupRows[0];
    const entries = groupRows.map(r => {
      const base = { dia: r.dia, tempManana: r.tempManana, tempTarde: r.tempTarde, nombre: r.nombre, observaciones: r.observaciones };
      if (r.tsManana) Object.assign(base, { tsManana: r.tsManana });
      if (r.tsTarde) Object.assign(base, { tsTarde: r.tsTarde });
      if (tipo === 'ambiental') return { ...base, humManana: r.humManana, humTarde: r.humTarde };
      return base;
    });
    const id = `${termoId}_${year}_${String(month).padStart(2, '0')}`;
    await setDoc(doc(db, 'registros', id), { termoId, year, month, entries, header: {}, footer: {} }, { merge: true });

    // Restore lockedDays
    const lockedDias = groupRows.filter(r => r.locked).map(r => r.dia);
    const lockedAt: Record<number, number> = {};
    groupRows.forEach(r => { if (r.locked && r.lockedAt) lockedAt[r.dia] = r.lockedAt as number; });
    if (lockedDias.length > 0) {
      const lockId = `locked_${id}`;
      await setDoc(doc(db, 'lockedDays', lockId), { termoId, year, month, days: lockedDias, lockedAt });
    }
  }
}
