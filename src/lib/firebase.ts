import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  getDocs,
  enableIndexedDbPersistence,
  runTransaction,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import type { Room, Player, Transaction, RoundScore, BankInfo } from '@/types';

type JoinablePlayer = Omit<Player, 'currentScore' | 'isOnline' | 'joinedAt' | 'lastActive'>;

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseValues = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

const hasFirebaseConfig = requiredFirebaseValues.every(
  (value) => typeof value === 'string' && value.trim().length > 0
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    if (typeof window !== 'undefined') {
      enableIndexedDbPersistence(db).catch((error: { code?: string }) => {
        // Multi-tab and unsupported-browser failures are safe fallbacks to online-only mode.
        if (!['failed-precondition', 'unimplemented'].includes(error.code ?? '')) {
          console.warn('Không thể bật Firestore offline cache.');
        }
      });
    }
  } catch {
    console.error('Không thể khởi tạo Firebase. Kiểm tra biến môi trường deploy.');
  }
}

export { auth, db };

export function getFirebaseConfigurationError(): string | null {
  if (hasFirebaseConfig) return null;
  return 'Thiếu cấu hình Firebase. Hãy khai báo các biến VITE_FIREBASE_* trước khi deploy.';
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let index = 0; index < 5; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function isFirebaseReady(): boolean {
  return Boolean(auth && db);
}

export async function signInAnonymous(maxRetries = 3): Promise<User> {
  if (!auth) throw new Error(getFirebaseConfigurationError() ?? 'Firebase Auth chưa sẵn sàng.');

  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Không thể đăng nhập ẩn danh.');
}

export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}

export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function createRoom(
  host: JoinablePlayer,
  gameConfig: Room['gameConfig']
): Promise<string> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');
  if (gameConfig.gameType === 'poker') throw new Error('Poker chưa được hỗ trợ.');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomId = generateRoomId();
    const roomRef = doc(db, 'rooms', roomId);
    const existingRoom = await getDoc(roomRef);
    if (existingRoom.exists()) continue;

    const now = Date.now();
    const roomData: Omit<Room, 'id'> = {
      hostId: host.uid,
      status: 'active',
      createdAt: now,
      gameConfig,
      metadata: {
        totalRounds: 0,
        playerCount: 1,
        lastUpdated: now,
      },
    };

    const hostData: Player = {
      ...host,
      currentScore: 0,
      isOnline: true,
      joinedAt: now,
      lastActive: now,
    };

    try {
      const batch = writeBatch(db);
      batch.set(roomRef, roomData);
      batch.set(doc(db, 'rooms', roomId, 'players', host.uid), hostData);
      await batch.commit();
      return roomId;
    } catch (error) {
      // A rare room-code collision can surface as a denied update after another client wins the race.
      if (attempt === 4) throw error;
    }
  }

  throw new Error('Không thể tạo mã phòng duy nhất. Vui lòng thử lại.');
}

export async function getRoom(roomId: string): Promise<Room | null> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');
  const roomRef = doc(db, 'rooms', roomId.trim().toUpperCase());
  const roomSnap = await getDoc(roomRef);
  return roomSnap.exists() ? ({ id: roomSnap.id, ...roomSnap.data() } as Room) : null;
}

export async function updateRoomStatus(roomId: string, status: Room['status']): Promise<void> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');
  await updateDoc(doc(db, 'rooms', roomId), {
    status,
    'metadata.lastUpdated': Date.now(),
  });
}

export async function joinRoom(roomId: string, player: JoinablePlayer): Promise<void> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');

  const normalizedRoomId = roomId.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', normalizedRoomId);
  const playerRef = doc(db, 'rooms', normalizedRoomId, 'players', player.uid);

  await runTransaction(db, async (firestoreTransaction) => {
    const [roomSnap, existingPlayer] = await Promise.all([
      firestoreTransaction.get(roomRef),
      firestoreTransaction.get(playerRef),
    ]);

    if (!roomSnap.exists()) throw new Error('Phòng không tồn tại.');

    const room = { id: roomSnap.id, ...roomSnap.data() } as Room;
    if (room.status !== 'active') throw new Error('Phòng không còn nhận người chơi.');

    const now = Date.now();

    if (existingPlayer.exists()) {
      // Rejoining with the same anonymous UID must never reset accumulated score.
      firestoreTransaction.set(
        playerRef,
        {
          displayName: player.displayName,
          bankInfo: player.bankInfo,
          isOnline: true,
          lastActive: now,
        },
        { merge: true }
      );
      return;
    }

    if (!Number.isInteger(room.metadata.playerCount)) {
      throw new Error('Phòng này dùng dữ liệu phiên bản cũ. Hãy tạo phòng mới để dùng bản cập nhật.');
    }
    if (room.metadata.playerCount >= 4) throw new Error('Phòng đã đủ 4 người chơi.');

    const playerData: Player = {
      ...player,
      currentScore: 0,
      isOnline: true,
      joinedAt: now,
      lastActive: now,
    };

    firestoreTransaction.set(playerRef, playerData);
    firestoreTransaction.update(roomRef, {
      'metadata.playerCount': room.metadata.playerCount + 1,
      'metadata.lastUpdated': now,
    });
  });
}

export async function updatePlayerProfile(
  roomId: string,
  playerId: string,
  displayName: string,
  bankInfo: BankInfo
): Promise<void> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');
  await updateDoc(doc(db, 'rooms', roomId, 'players', playerId), {
    displayName,
    bankInfo,
    lastActive: Date.now(),
  });
}

export async function updatePlayerOnlineStatus(
  roomId: string,
  playerId: string,
  isOnline: boolean
): Promise<void> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');
  await updateDoc(doc(db, 'rooms', roomId, 'players', playerId), {
    isOnline,
    lastActive: Date.now(),
  });
}

export async function leaveRoom(roomId: string, playerId: string): Promise<void> {
  // Leaving the UI is presence-only. Deleting a player would orphan their score and break settlement.
  await updatePlayerOnlineStatus(roomId, playerId, false);
}

export function validateZeroSum(scores: RoundScore[]): void {
  if (scores.length < 2 || scores.length > 4) {
    throw new Error('Một ván phải có từ 2 đến 4 người chơi.');
  }

  const ids = scores.map((score) => score.playerId);
  if (new Set(ids).size !== ids.length) throw new Error('Điểm ván có người chơi bị trùng.');

  if (scores.some((score) => !Number.isFinite(score.change) || !Number.isInteger(score.change))) {
    throw new Error('Điểm ván phải là số nguyên theo đơn vị nghìn đồng.');
  }

  const total = scores.reduce((acc, current) => acc + current.change, 0);
  if (Math.abs(total) > 0.01) {
    throw new Error(`Tổng điểm không bằng 0 (lệch ${total}k).`);
  }
}

export async function addTransaction(
  roomId: string,
  transactionInput: Omit<Transaction, 'id' | 'roundNumber'>
): Promise<Transaction> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');
  validateZeroSum(transactionInput.scores);

  const roomRef = doc(db, 'rooms', roomId);
  const newTransactionRef = doc(collection(db, 'rooms', roomId, 'transactions'));

  return runTransaction(db, async (firestoreTransaction) => {
    const roomSnap = await firestoreTransaction.get(roomRef);
    if (!roomSnap.exists()) throw new Error('Phòng không còn tồn tại.');

    const room = { id: roomSnap.id, ...roomSnap.data() } as Room;
    if (room.status !== 'active') throw new Error('Phòng đang chốt sổ, không thể thêm ván.');
    if (transactionInput.createdBy !== room.hostId) throw new Error('Chỉ chủ phòng được nhập điểm.');

    const roundNumber = room.metadata.totalRounds + 1;
    const transaction: Transaction = {
      id: newTransactionRef.id,
      ...transactionInput,
      roundNumber,
    };

    const storedTransaction: Omit<Transaction, 'id'> = {
      roundNumber: transaction.roundNumber,
      timestamp: transaction.timestamp,
      gameType: transaction.gameType,
      scores: transaction.scores,
      createdBy: transaction.createdBy,
    };

    firestoreTransaction.set(newTransactionRef, storedTransaction);

    firestoreTransaction.update(roomRef, {
      'metadata.totalRounds': roundNumber,
      'metadata.lastUpdated': Date.now(),
    });

    return transaction;
  });
}

export async function deleteTransaction(roomId: string, transactionId: string): Promise<void> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');

  const roomRef = doc(db, 'rooms', roomId);
  const transactionRef = doc(db, 'rooms', roomId, 'transactions', transactionId);

  await runTransaction(db, async (firestoreTransaction) => {
    const [roomSnap, transactionSnap] = await Promise.all([
      firestoreTransaction.get(roomRef),
      firestoreTransaction.get(transactionRef),
    ]);

    if (!roomSnap.exists()) throw new Error('Phòng không còn tồn tại.');
    if (!transactionSnap.exists()) throw new Error('Ván không còn tồn tại.');

    const room = { id: roomSnap.id, ...roomSnap.data() } as Room;
    const transaction = { id: transactionSnap.id, ...transactionSnap.data() } as Transaction;

    if (transaction.roundNumber !== room.metadata.totalRounds) {
      throw new Error('Chỉ có thể hoàn tác ván gần nhất để giữ thứ tự lịch sử chính xác.');
    }

    firestoreTransaction.delete(transactionRef);
    firestoreTransaction.update(roomRef, {
      'metadata.totalRounds': Math.max(0, room.metadata.totalRounds - 1),
      'metadata.lastUpdated': Date.now(),
    });
  });
}

export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void,
  onError?: (error: Error) => void
) {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, 'rooms', roomId),
    (snapshot) => {
      callback(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Room) : null);
    },
    (error) => {
      console.error('Room subscription error:', error);
      onError?.(error);
    }
  );
}

export function subscribeToPlayers(
  roomId: string,
  callback: (players: Player[]) => void,
  onError?: (error: Error) => void
) {
  if (!db) return () => {};
  const playersQuery = query(collection(db, 'rooms', roomId, 'players'), orderBy('joinedAt', 'asc'));
  return onSnapshot(
    playersQuery,
    (snapshot) => {
      callback(snapshot.docs.map((snapshotDoc) => ({ ...snapshotDoc.data(), uid: snapshotDoc.id } as Player)));
    },
    (error) => {
      console.error('Players subscription error:', error);
      onError?.(error);
    }
  );
}

export function subscribeToTransactions(
  roomId: string,
  callback: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void
) {
  if (!db) return () => {};
  const transactionsQuery = query(
    collection(db, 'rooms', roomId, 'transactions'),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(
    transactionsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((snapshotDoc) => ({ ...snapshotDoc.data(), id: snapshotDoc.id } as Transaction)));
    },
    (error) => {
      console.error('Transactions subscription error:', error);
      onError?.(error);
    }
  );
}

export async function getTransactionsPaginated(
  roomId: string,
  pageSize = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ transactions: Transaction[]; lastDoc: QueryDocumentSnapshot | null }> {
  if (!db) throw new Error('Firestore chưa sẵn sàng.');

  const transactionsRef = collection(db, 'rooms', roomId, 'transactions');
  const transactionsQuery = lastDoc
    ? query(transactionsRef, orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(pageSize))
    : query(transactionsRef, orderBy('timestamp', 'desc'), limit(pageSize));

  const snapshot = await getDocs(transactionsQuery);
  return {
    transactions: snapshot.docs.map((snapshotDoc) => ({
      ...snapshotDoc.data(),
      id: snapshotDoc.id,
    } as Transaction)),
    lastDoc: snapshot.docs.at(-1) ?? null,
  };
}

export async function closeRoom(roomId: string): Promise<void> {
  // Closing is intentionally non-destructive: settlement/history remain recoverable.
  await updateRoomStatus(roomId, 'closed');
}
