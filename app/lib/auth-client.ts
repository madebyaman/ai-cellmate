import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:5173',
  fetchOptions: {
    onError: async (context) => {
      console.log('error in fetchoptions >>>>>', context);
      const { response } = context;
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-Retry-After');
        console.log(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
      }
    },
  },
});
