
export interface ValentineData {
  recipientName: string;
  specialDate: string;
  photoUrls: string[];
  quotes: string[];
  message: string;
}

export enum AppState {
  LANDING = 'LANDING',
  FORM = 'FORM',
  GENERATING = 'GENERATING',
  SHARE = 'SHARE',
  SCRATCH = 'SCRATCH',
  ENVELOPE = 'ENVELOPE',
  STORY = 'STORY'
}