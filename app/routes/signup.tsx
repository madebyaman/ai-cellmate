import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { useEffect } from 'react';
import { parseWithZod } from '@conform-to/zod';
import {
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import { Form, useSearchParams } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { HoneypotInputs } from 'remix-utils/honeypot/react';
import { toast } from 'sonner';
import { AuthShell } from '~/components/auth-shell';
import FormErrors from '~/components/form-errors';
import { GeneralErrorBoundary } from '~/components/general-error-boundry';
import { Button } from '~/components/ui/button';
import Checkbox from '~/components/ui/checkbox';
import Heading from '~/components/ui/heading';
import Input from '~/components/ui/input';
import Label from '~/components/ui/label';
import { authClient } from '~/lib/auth-client';
import { signupSchema } from '~/schema/login';
import { ROUTES } from '~/utils/constants';
import { requireAnonymous } from '~/utils/auth.server';
import type { Route } from '../+types/root';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);
  return null;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: signupSchema });
  if (submission.status !== 'success') {
    return submission.reply();
  }

  let shouldClearForm = false;

  await authClient.signUp.email(
    {
      name: submission.value.name,
      email: submission.value.email,
      password: submission.value.password,
    },
    {
      onSuccess: () => {
        redirect(ROUTES.DASHBOARD);
      },
      onError: (ctx) => {
        if (ctx.error.code === 'EMAIL_NOT_VERIFIED') {
          shouldClearForm = true;
          toast.error('Email not verified', {
            description:
              'Please check your email for a verification link and click on it to verify your email.',
          });
        } else {
          toast.error('Signup failed', {
            description: 'Please try again or contact support.',
          });
        }
      },
    }
  );

  return { shouldClearForm };
}

export default function Signup({ actionData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const lastResult = actionData;
  const redirectTo = searchParams.get('redirectTo') ?? ROUTES.DASHBOARD;
  const [form, fields] = useForm({
    shouldValidate: 'onBlur',
    lastResult,
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: signupSchema });
    },
  });

  useEffect(() => {
    if ((actionData as any)?.shouldClearForm) {
      form.reset();
    }
  }, [(actionData as any)?.shouldClearForm, form]);

  return (
    <AuthShell>
      <AuthShell.Header>
        <AuthShell.Logo />
        <Heading as="h1" className="mt-6 text-center">
          Sign up for an account
        </Heading>
      </AuthShell.Header>
      <AuthShell.Body>
        <Form
          method="POST"
          className="flex flex-col gap-6 justify-center"
          {...getFormProps(form)}
        >
          <AuthenticityTokenInput />
          <HoneypotInputs />
          <FormErrors errors={form.errors} />
          <div>
            <Label className="mb-1" htmlFor={fields.name.id}>
              Name
            </Label>
            <Input
              errors={fields.name.errors}
              {...getInputProps(fields.name, { type: 'text' })}
            />
          </div>
          <div>
            <Label className="mb-1" htmlFor={fields.email.id}>
              Email
            </Label>
            <Input
              errors={fields.email.errors}
              {...getInputProps(fields.email, { type: 'email' })}
            />
          </div>
          <input type="hidden" name="redirect-to" value={redirectTo} />
          <div>
            <Label className="mb-1" htmlFor={fields.password.id}>
              Password
            </Label>
            <Input
              errors={fields.password.errors}
              {...getInputProps(fields.password, { type: 'password' })}
            />
          </div>
          <Checkbox
            errors={fields.remember.errors}
            {...getInputProps(fields.remember, { type: 'checkbox' })}
            label="Remember me"
          />
          <Button>Submit</Button>
        </Form>
        <AuthShell.Social>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Form method="POST" action="/auth/google">
              <Button variant={'outline'} size={'full'}>
                <span className="sr-only">Sign in with Google</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 256 262"
                  className="w-5 h-5"
                  id="google"
                >
                  <path
                    fill="#4285F4"
                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                  ></path>
                  <path
                    fill="#EB4335"
                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  ></path>
                </svg>
              </Button>
            </Form>
            <Form method="POST" action="/auth/github">
              <Button variant={'outline'} size={'full'}>
                <span className="sr-only">Sign in with GitHub</span>
                <svg
                  className="w-5 h-5"
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </Form>
          </div>
        </AuthShell.Social>
      </AuthShell.Body>
    </AuthShell>
  );
}

export const meta: MetaFunction = () => {
  return [{ title: 'Login to Praise Panda' }];
};

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
