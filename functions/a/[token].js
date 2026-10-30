// Oriente One v1.1.0 | Página pública do assessment (/a/:token)
export const onRequestGet = ({ request, env }) => env.ASSETS.fetch(new URL('/assessment', request.url));
