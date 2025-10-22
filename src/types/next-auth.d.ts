import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      discordId?: string;
      hasSubscriberRole?: boolean;
      roles?: string[]; // Discord role IDs
    } & DefaultSession["user"];
  }

  interface JWT {
    accessToken?: string;
    discordId?: string;
    roles?: string[];
  }
}
