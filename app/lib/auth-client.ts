import { createAuthClient } from 'better-auth/react'; // make sure to import from better-auth/react
import { ROUTES } from '~/utils/constants';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:5173',
  //you can pass client configuration here
});
