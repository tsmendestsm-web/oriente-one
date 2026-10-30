// Oriente One v1.0.0 | Página pública do assessment (/a/:token)
export const onRequestGet = ({ request, env }) => env.ASSETS.fetch(new URL('/assessment', request.url));
