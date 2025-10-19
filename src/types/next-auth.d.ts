import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      discordId?: string;
      hasSubscriberRole?: boolean;
    } & DefaultSession["user"];
  }

  interface JWT {
    accessToken?: string;
    discordId?: string;
  }
}
