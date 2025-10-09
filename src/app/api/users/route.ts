
import { NextResponse } from "next/server";
import { getUsers } from "@/app/users/actions";

// This API endpoint is kept for potential future use cases like user selection in other parts of the app,
// but it is no longer used for the main login form to improve security and performance.
export async function GET(request: Request) {
  try {
    // By default, this will now only fetch active users unless specified.
    // We can add more params later if needed.
    const users = await getUsers({ all: true }); 
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
