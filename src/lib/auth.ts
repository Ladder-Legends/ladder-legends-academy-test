import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

// Discord server ID - from environment variable
const GUILD_ID = process.env.DISCORD_GUILD_ID || "1386735340517195959";

// Allowed role IDs - from environment variable (comma-separated)
const ALLOWED_ROLE_IDS = process.env.ALLOWED_ROLE_IDS?.split(',') || [
  "1386739785283928124", // Owner
  "1386739850731851817", // Moderator
  "1387372036665643188", // Coach
  "1387076312878813337", // Subscriber
  "1386740453264724068", // Member
];

// Role name mapping for logging/debugging
const ROLE_NAMES: Record<string, string> = {
  "1386739785283928124": "Owner",
  "1386739850731851817": "Moderator",
  "1387372036665643188": "Coach",
  "1387076312878813337": "Subscriber",
  "1386740453264724068": "Member",
  "1429527193649938504": "Owner (Lotus)", // Local dev
};

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

      // Development bypass - skip role checking if SKIP_ROLE_CHECK is true
      if (process.env.SKIP_ROLE_CHECK === "true") {
        console.log("🔓 SKIP_ROLE_CHECK enabled - granting access without role verification");
        session.user.hasSubscriberRole = true;
        session.user.roles = ["1386739785283928124"]; // Grant owner role in dev
        return session;
      }

      // Check if user has required role in the Discord server
      try {
        const userRoles = await checkUserRole(
          token.accessToken as string,
          token.discordId as string
        );
        session.user.hasSubscriberRole = userRoles.length > 0;
        session.user.roles = userRoles;
      } catch (error) {
        console.error("Error checking user role:", error);
        session.user.hasSubscriberRole = false;
        session.user.roles = [];
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
): Promise<string[]> {
  try {
    // First, get the user's guilds to find the server ID
    const guildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!guildsResponse.ok) {
      console.error("Failed to fetch guilds:", await guildsResponse.text());
      return [];
    }

    const guilds = await guildsResponse.json();

    // Find the Ladder Legends Academy server
    const targetGuild = guilds.find(
      (g: { name: string; id: string }) => g.name === "Ladder Legends Academy" || g.id === GUILD_ID
    );

    if (!targetGuild) {
      console.log("User is not in the Ladder Legends Academy server");
      return [];
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
      return [];
    }

    const memberData = await memberResponse.json();

    // Check if user has any of the allowed roles
    const userRoles = memberData.roles || [];
    const matchedRoles = userRoles.filter((roleId: string) =>
      ALLOWED_ROLE_IDS.includes(roleId)
    );

    if (matchedRoles.length > 0) {
      // Log which role(s) granted access
      const roleNames = matchedRoles
        .map((roleId: string) => ROLE_NAMES[roleId] || roleId)
        .join(", ");
      console.log(`User ${userId} granted access with role(s): ${roleNames}`);
      return matchedRoles;
    }

    console.log(`User ${userId} does not have any allowed roles`);
    return [];
  } catch (error) {
    console.error("Error in checkUserRole:", error);
    return [];
  }
}
