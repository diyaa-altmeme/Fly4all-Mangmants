
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { CustomFirestoreAdapter } from '@/lib/next-auth-adapter'


if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not set.");
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_SECRET environment variable is not set.");
}


const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    adapter: CustomFirestoreAdapter,
    callbacks: {
        async session({ session, user }) {
            session.user.id = user.id;
            return session;
        },
    },
    pages: {
        signIn: '/auth/login',
    },
})

export { handler as GET, handler as POST }