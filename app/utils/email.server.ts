import { render } from '@react-email/components';
import type { ReactElement } from 'react';

// sends an email using postmark with from:team@profile.com
export default async function sendEmail({
  react,
  ...options
}: {
  To: string;
  Subject: string;
} & (
  | { HtmlBody: string; TextBody: string; react?: never }
  | { react: ReactElement; HtmlBody?: never; TextBody?: never }
)) {
  console.log('sending email >>>>>', options);
  const From = 'hello@epicstack.dev';
  const email = {
    From,
    ...options,
    ...(react ? renderReactEmail(react) : {}),
  };
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN ?? 'default',
    },
    body: JSON.stringify(email),
  });
  if (!response.ok) {
    console.log('failed to send email >>>>>', response);
    return { status: 'error', error: 'Failed to send email' } as const;
  }
  return { status: 'success' } as const;
}

async function renderReactEmail(react: ReactElement) {
  const [HtmlBody, TextBody] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ]);
  return { HtmlBody, TextBody };
}
