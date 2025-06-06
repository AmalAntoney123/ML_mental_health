import { hslToColorString } from "polished";

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export interface SupportGroup {
  coverImage: string | undefined;
  id: string;
  name: string;
  description: string;
  createdAt: number;
  createdBy: string;
  members: { [key: string]: boolean };
  lastMessage: string | null;
  lastMessageTimestamp: number | null;
}

export interface Message {
  id: string;
  text: string;
  userId: string;
  timestamp: number;
}

export interface ReportData {
  title: string;
  data: any;
  type: 'bar' | 'pie' | 'text';
}

export interface UserData {
  name?: string;
  age?: number;
  gender?: string;
  completedChallenges?: number;
  challenges?: Record<string, number>;
  previousTherapyExperience?: string;
  sleepHabits?: string;
  interests?: string[];
  languagePreference?: string;
  goals?: string[];
  concerns?: string[];
  preferredTherapyType?: string;
  photoURL?: string | null;
}

export type RootStackParamList = {
  Intro: undefined;
  MainScreen: undefined;
  Login: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Onboarding: undefined;
  Breathing: undefined;
  Meditation: undefined;
  Positivity: undefined;
  Gratitude: undefined;
  Exercise: undefined;
  Social: undefined;
  JournalChallenge: undefined;
  Sleep: undefined;
  Hydration: undefined;
  CreateSupportGroup: undefined;
  Detail: { itemId: number } | undefined;
  Profile: undefined;
  AdminPanel: undefined;
  ManageUsers: undefined;
  ManageChallenges: undefined;
  Reports: undefined;
  FindGroupsScreen: undefined;
  ExpandedJournalEntry: undefined;
  MoodTracking: undefined;
  Leaderboard: undefined;
  ManageSleepMusic: undefined;
  ChatScreen: {
    group: SupportGroup;
    fromSocialChallenge?: boolean;
  };
  EditProfile: { userData: UserData };
  DetailedReport: {
    reportData: ReportData;
  };
  ViewUser: { userId: string | undefined };
  SupportScreen: undefined;
  ChatDetailsScreen: { group: SupportGroup };
  Settings: undefined;
  JournalHistory: undefined;
  EmoElevate: undefined;
  ManageElevate: undefined;
  AIChatScreen: undefined;
  StreakInfo: {
    streak: number;
    lastLoginTimestamp: number;
  };
  WeeklyHighscores: undefined;
  Friends: undefined;
};