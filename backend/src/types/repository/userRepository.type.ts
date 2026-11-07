export const USER_PURPOSES = [
  "personal",
  "business",
  "research",
  "education",
  "other",
] as const;

export type UserPurpose = (typeof USER_PURPOSES)[number];
