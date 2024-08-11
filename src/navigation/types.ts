import { hslToColorString } from "polished";

interface ReportData {
  title: string;
  data: any;
  type: 'bar' | 'pie' | 'text';
}
interface UserData {
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
}
export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
  Login: undefined;
  SignUp: undefined;
  SignIn: undefined;
  Onboarding: undefined;
  Breathing: undefined;
  Meditation: undefined;
  Gratitude: undefined;
  Exercise: undefined;
  Social: undefined;
  Nutrition: undefined;
  Sleep: undefined;
  Hydration: undefined;
  Detail: { itemId: number } | undefined;
  Profile: undefined;
  AdminPanel: undefined;
  ManageUsers: undefined;
  ManageChallenges: undefined;
  Reports: undefined;
  EditProfile: { userData: UserData };
  DetailedReport: {
    reportData: ReportData;
  };
  ViewUser: { userId: string | undefined };};