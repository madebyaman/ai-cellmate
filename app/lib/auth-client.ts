import { stripeClient } from "@better-auth/stripe/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:5173",
  plugins: [
    magicLinkClient(),
    stripeClient({
      subscription: true, //if you want to enable subscription management
    }),
  ],
  fetchOptions: {
    onError: async (context) => {
      console.log("error in fetchoptions >>>>>", context);
      const { response } = context;
      if (response.status === 429) {
        const retryAfter = response.headers.get("X-Retry-After");
        console.log(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
      }
    },
  },
});
