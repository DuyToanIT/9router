import { NextResponse } from "next/server";
import { createProviderConnection } from "@/models";
import { OAUTH_PROVIDERS } from "@/shared/constants/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/providers/import-oauth
 * Import an OAuth provider connection directly from token data (e.g. exported Codex CLI JSON).
 *
 * Body: {
 *   provider: string,       // e.g. "codex"
 *   authType: "oauth",
 *   accessToken: string,
 *   refreshToken: string,
 *   email?: string,
 *   name?: string,
 *   expiresAt?: string,
 *   priority?: number,
 *   isActive?: boolean,
 *   testStatus?: string,
 *   providerSpecificData?: object,
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { provider, accessToken, refreshToken } = body;

    if (!provider) {
      return NextResponse.json({ error: "provider is required" }, { status: 400 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
    }
    if (!refreshToken) {
      return NextResponse.json({ error: "refreshToken is required" }, { status: 400 });
    }

    // Only allow known OAuth providers
    const isKnownOAuth = !!OAUTH_PROVIDERS[provider];
    if (!isKnownOAuth) {
      return NextResponse.json(
        { error: `Provider "${provider}" is not a supported OAuth provider` },
        { status: 400 }
      );
    }

    const connection = await createProviderConnection({
      provider,
      authType: "oauth",
      accessToken,
      refreshToken,
      email: body.email || null,
      name: body.name || (body.email ? body.email.split("@")[0] : "Imported Account"),
      expiresAt: body.expiresAt || null,
      priority: typeof body.priority === "number" ? body.priority : 1,
      isActive: body.isActive !== false,
      testStatus: body.testStatus || "active",
      providerSpecificData: body.providerSpecificData || {
        connectionProxyEnabled: false,
        connectionProxyUrl: "",
        connectionNoProxy: "",
      },
    });

    return NextResponse.json(
      {
        success: true,
        connection: {
          id: connection.id,
          provider: connection.provider,
          email: connection.email,
          name: connection.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("[ImportOAuth] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import connection" },
      { status: 500 }
    );
  }
}
