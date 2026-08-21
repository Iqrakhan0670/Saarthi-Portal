import { createClient } from "jsr:@supabase/supabase-js@2";

export interface AuthUser {
  id: string;
  is_admin: boolean;
  user_type: string | null;
  employer_id: string | null;
}

/**
 * Verifies the Authorization: Bearer <token> header using Supabase auth.getUser().
 * If the token is missing or invalid, returns a Response with status 401.
 * If the token is valid, enriches the result with the user row from the `users` table
 * and returns an AuthUser object.
 */
export async function requireAuth(
  req: Request,
): Promise<AuthUser | Response> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing or malformed Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }

  // Use the service-role client; auth.getUser(token) re-verifies the JWT
  // signature against the project secret server-side.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }

  // Look up the application-level user row for is_admin / user_type.
  // Matching on email because the app manages its own users table separately from Auth.
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, is_admin, user_type")
    .eq("email", user.email!)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: "Authenticated user has no application profile" }),
      { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }

  return {
    id: profile.id,
    is_admin: profile.is_admin ?? false,
    user_type: profile.user_type ?? null,
    // Placeholder: employer_id will come from the DB once an employer_id column
    // and employer/company relationship is added to the public.users schema.
    employer_id: null,
  };
}
