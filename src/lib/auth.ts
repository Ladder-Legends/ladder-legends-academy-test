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
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      // Store access token and Discord user info in JWT
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.discordId = profile.id;
      }

      // Fetch roles only on initial sign-in or when explicitly triggered
      // This prevents hitting Discord API on every page load
      const shouldFetchRoles = account || trigger === "update";

      if (shouldFetchRoles && token.discordId) {
        // Hardcoded user override (for development/testing)
        const HARDCODED_USER_ID = process.env.HARDCODED_USER_ID || "";
        if (HARDCODED_USER_ID && token.discordId === HARDCODED_USER_ID) {
          const hardcodedRole = process.env.HARDCODED_ROLE || "";
          const isSubscriber = process.env.HARDCODED_USER_IS_SUBSCRIBER === "true";

          token.userRoles = hardcodedRole ? [hardcodedRole] : [];
          token.hasSubscriberRole = isSubscriber;
          token.rolesFetchedAt = Date.now();
        } else {
          // Fetch roles from Discord API (only once during login)
          try {
            const userRoles = await checkUserRole(
              token.accessToken as string,
              token.discordId as string
            );
            token.userRoles = userRoles;
            token.hasSubscriberRole = userRoles.length > 0;
            token.rolesFetchedAt = Date.now();
          } catch (error) {
            console.error("Error fetching user roles:", error);
            token.userRoles = [];
            token.hasSubscriberRole = false;
            token.rolesFetchedAt = Date.now();
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add Discord info to session from cached JWT token
      session.accessToken = token.accessToken as string;
      session.user.discordId = token.discordId as string;

      // Use cached roles from JWT token (no Discord API call!)
      session.user.roles = (token.userRoles as string[]) || [];
      session.user.hasSubscriberRole = (token.hasSubscriberRole as boolean) || false;

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
      return matchedRoles;
    }

    return [];
  } catch (error) {
    console.error("Error in checkUserRole:", error);
    return [];
  }
}
