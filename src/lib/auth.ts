import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

// Discord server ID for Ladder Legends Academy
const GUILD_ID = "1386735340517195959";
const REQUIRED_ROLE_NAME = "Subscriber";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds guilds.members.read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Store access token and Discord user info in JWT
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.discordId = profile.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add Discord info to session
      session.accessToken = token.accessToken as string;
      session.user.discordId = token.discordId as string;

      // Check if user has required role in the Discord server
      try {
        const hasRole = await checkUserRole(
          token.accessToken as string,
          token.discordId as string
        );
        session.user.hasSubscriberRole = hasRole;
      } catch (error) {
        console.error("Error checking user role:", error);
        session.user.hasSubscriberRole = false;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

async function checkUserRole(
  accessToken: string,
  userId: string
): Promise<boolean> {
  try {
    // First, get the user's guilds to find the server ID
    const guildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!guildsResponse.ok) {
      console.error("Failed to fetch guilds:", await guildsResponse.text());
      return false;
    }

    const guilds = await guildsResponse.json();

    // Find the Ladder Legends Academy server
    // You might need to match by name or ID
    const targetGuild = guilds.find(
      (g: any) => g.name === "Ladder Legends Academy" || g.id === GUILD_ID
    );

    if (!targetGuild) {
      console.log("User is not in the Ladder Legends Academy server");
      return false;
    }

    // Get member details including roles using bot token
    // Note: This requires a bot token with proper permissions
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${targetGuild.id}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!memberResponse.ok) {
      console.error("Failed to fetch member data:", await memberResponse.text());
      return false;
    }

    const memberData = await memberResponse.json();

    // Get all roles for the guild to find the Subscriber role ID
    const rolesResponse = await fetch(
      `https://discord.com/api/v10/guilds/${targetGuild.id}/roles`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!rolesResponse.ok) {
      console.error("Failed to fetch roles:", await rolesResponse.text());
      return false;
    }

    const roles = await rolesResponse.json();
    const subscriberRole = roles.find(
      (role: any) => role.name === REQUIRED_ROLE_NAME
    );

    if (!subscriberRole) {
      console.error(`Role "${REQUIRED_ROLE_NAME}" not found in server`);
      return false;
    }

    // Check if user has the Subscriber role
    const hasRole = memberData.roles.includes(subscriberRole.id);
    console.log(`User ${userId} has Subscriber role:`, hasRole);
    return hasRole;
  } catch (error) {
    console.error("Error in checkUserRole:", error);
    return false;
  }
}
