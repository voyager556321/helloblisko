export const HOME_TOKEN = "home-anna";

export type Status = "ready" | "assigned" | "revealed" | "done" | "cancelled";

export type Senior = {
  id: string;
  name: string;
  district: string;
  address: string;
  pesel: string;
};

export type TaskKind = "pharmacy" | "shop" | "visit" | "other";

export type Pace = {
  pharmacy: number[];
  shop: number[];
  visit: number[];
  other: number[];
};

export type Volunteer = {
  id: string;
  name: string;
  phone: string;
  districts: string[];
  pace?: Pace;
};

export type RequestRow = {
  id: string;
  seniorId: string;
  status: Status;
  audioFile: string | null;
  mime: string | null;
  transcript: string;
  summary: string;
  code4: string | null;
  createdAt: string;
  volunteerId: string | null;
  assignedAt: string | null;
  revealedAt: string | null;
  doneAt: string | null;
};

export type DB = {
  senior: Senior;
  volunteers: Volunteer[];
  deviceToken: string;
  requests: RequestRow[];
};

export type PublicRequest = {
  id: string;
  status: Status;
  summary: string;
  transcript: string;
  createdAt: string;
  seniorName: string;
  district: string;
  hasAudio: boolean;
  volunteerId: string | null;
  volunteerName: string | null;
  address?: string;
  pesel?: string;
  code4?: string | null;
};
