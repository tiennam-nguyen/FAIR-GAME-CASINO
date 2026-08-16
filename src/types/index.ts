// Domain types for Sòng Phẳng

export type PlayerId = string;
export type RoomId = string;
export type GameType = 'tien_len' | 'xi_dach' | 'poker';
export type RoomStatus = 'active' | 'settling' | 'closed';
export type GameMode = 'nhat_an_tat' | 'nhat_bet_nhi_ba';
export type PaymentStatus = 'pending' | 'sent' | 'received';

export interface BankInfo {
  bankId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
}

export interface GameConfig {
  gameType: GameType;
  baseBet: number; // thousands of VND
  rules: {
    mode: GameMode;
    price_nhat_bet: number;
    price_nhi_ba: number;
  };
}

export interface Room {
  id: RoomId;
  hostId: PlayerId;
  status: RoomStatus;
  createdAt: number;
  gameConfig: GameConfig;
  metadata: {
    totalRounds: number;
    playerCount: number;
    lastUpdated: number;
  };
}

export interface Player {
  uid: PlayerId;
  displayName: string;
  avatarUrl?: string;
  bankInfo: BankInfo;
  currentScore: number;
  isOnline: boolean;
  joinedAt: number;
  lastActive?: number;
}

export interface RoundScore {
  playerId: PlayerId;
  change: number;
  note?: string;
}

export interface Transaction {
  id: string;
  roundNumber: number;
  timestamp: number;
  gameType: GameType;
  scores: RoundScore[];
  createdBy: PlayerId;
}

export interface PlayerResult {
  playerId: PlayerId;
  rank: 1 | 2 | 3 | 4;
  penalties: number;
}

export interface UserScore {
  id: string;
  name: string;
  score: number;
}

export interface TransactionInstruction {
  fromUser: string;
  fromName: string;
  toUser: string;
  toName: string;
  amount: number;
  status?: PaymentStatus;
  statusUpdatedAt?: number;
  statusUpdatedBy?: string;
}

export interface SettlementResult {
  transactions: TransactionInstruction[];
  logs: string[];
  isBalanced: boolean;
  imbalance: number;
}

export interface PaymentConfirmation {
  transactionId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  status: PaymentStatus;
  updatedAt: number;
  updatedBy: string;
}

export interface AppState {
  userProfile: {
    displayName: string;
    bankInfo: BankInfo;
    uid: string;
  } | null;
  currentRoom: Room | null;
  players: Player[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

export interface Bank {
  id: string;
  name: string;
  shortName: string;
}

export const BANKS: Bank[] = [
  { id: 'MB', name: 'Ngân hàng TMCP Quân đội', shortName: 'MB Bank' },
  { id: 'VCB', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', shortName: 'Vietcombank' },
  { id: 'TCB', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', shortName: 'Techcombank' },
  { id: 'ACB', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB' },
  { id: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank' },
  { id: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', shortName: 'BIDV' },
  { id: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', shortName: 'VIB' },
  { id: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', shortName: 'SHB' },
  { id: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank' },
  { id: 'HDB', name: 'Ngân hàng TMCP Phát triển TP.HCM', shortName: 'HDBank' },
  { id: 'TPB', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank' },
  { id: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', shortName: 'MSB' },
  { id: 'OCB', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB' },
  { id: 'AGB', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn', shortName: 'Agribank' },
  { id: 'EIB', name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', shortName: 'Eximbank' },
];

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|MicroMessenger|Line\//i.test(ua);
}
