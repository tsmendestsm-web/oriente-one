// Oriente One v1.1.0 | Entrada única da API
import { handle } from '../../src/api.js';
export const onRequest = ({ request, env }) => handle(request, env);
