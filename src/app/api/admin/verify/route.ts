import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { passcode } = body;

        // Default to "admin123" for testing if no env var is set
        const expectedPasscode = process.env.ADMIN_PASSCODE || "admin123";

        if (!passcode) {
            return NextResponse.json({ success: false, error: "Passcode is required" }, { status: 400 });
        }

        if (passcode === expectedPasscode) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: "Invalid admin passcode" }, { status: 401 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
