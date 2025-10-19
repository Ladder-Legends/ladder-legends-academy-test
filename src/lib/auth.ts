import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

// Discord server ID for Ladder Legends Academy
const GUILD_ID = "1386735340517195959";

// Allowed role IDs - users with any of these roles can access the site
const ALLOWED_ROLE_IDS = [
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
        return session;
      }

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
      return true;
    }

    console.log(`User ${userId} does not have any allowed roles`);
    return false;
  } catch (error) {
    console.error("Error in checkUserRole:", error);
    return false;
  }
}
