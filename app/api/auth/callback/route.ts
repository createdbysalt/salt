import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

export const dynamic = "force-dynamic";

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    
    // Determine where to redirect based on user type
    if (data.user) {
      const userId = data.user.id;
      const host = requestUrl.host;
      
      // Check if this is a client user
      const { data: clientMember } = await supabase
        .from("client_users")
        .select("id")
        .eq("user_id", userId)
        .single();
      
      // Check if this is a studio member
      const { data: studioMember } = await supabase
        .from("studio_members")
        .select("id")
        .eq("user_id", userId)
        .single();
      
      // Client-only users ALWAYS go to Bridge, regardless of login origin
      if (clientMember && !studioMember) {
        return NextResponse.redirect("https://bridge.saltcore.io/");
      }
      
      // Studio members go to the studio dashboard
      if (studioMember) {
        return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
}
