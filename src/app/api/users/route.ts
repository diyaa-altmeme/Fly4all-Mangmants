
import { NextResponse } from "next/server";
import { getUsers } from "@/app/users/actions";

export async function GET(request: Request) {
  try {
    const users = await getUsers({ all: true });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
