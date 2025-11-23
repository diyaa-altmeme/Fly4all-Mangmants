
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        cookies().delete('session');
        return NextResponse.json({ success: true, message: "Logged out" });
    } catch(error) {
        return NextResponse.json({ success: false, error: 'Failed to log out' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return POST(req);
}
