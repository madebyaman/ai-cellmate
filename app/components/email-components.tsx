import * as E from '@react-email/components';

export function MagicLinkEmail({
  email,
  magicLink,
}: {
  email: string;
  magicLink: string;
}) {
  return (
    <E.Html lang="en" dir="ltr">
      <E.Container>
        <h1>
          <E.Text>Sign in to your account</E.Text>
        </h1>
        <p>
          <E.Text>Hi {email},</E.Text>
        </p>
        <p>
          <E.Text>Click the button below to sign in to your account:</E.Text>
        </p>
        <E.Button href={magicLink} style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Sign in
        </E.Button>
        <p>
          <E.Text>Or copy and paste this link:</E.Text>
        </p>
        <E.Link href={magicLink}>{magicLink}</E.Link>
        <p>
          <E.Text style={{ fontSize: '12px', color: '#666' }}>
            This link expires in 24 hours.
          </E.Text>
        </p>
        <p>
          <E.Text style={{ fontSize: '12px', color: '#666' }}>
            If you didn't request this email, you can safely ignore it.
          </E.Text>
        </p>
      </E.Container>
    </E.Html>
  );
}

export function OrganizationInviteEmail({
  inviterName,
  organizationName,
  inviteLink,
}: {
  inviterName: string;
  organizationName: string;
  inviteLink: string;
}) {
  return (
    <E.Html lang="en" dir="ltr">
      <E.Container>
        <h1>
          <E.Text>You're invited to join {organizationName}</E.Text>
        </h1>
        <p>
          <E.Text>
            {inviterName} has invited you to join <strong>{organizationName}</strong>.
          </E.Text>
        </p>
        <p>
          <E.Text>Click the button below to accept the invitation:</E.Text>
        </p>
        <E.Button href={inviteLink} style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Accept Invitation
        </E.Button>
        <p>
          <E.Text>Or copy and paste this link:</E.Text>
        </p>
        <E.Link href={inviteLink}>{inviteLink}</E.Link>
      </E.Container>
    </E.Html>
  );
}

export function VerifyEmail({
  name,
  onboardingUrl,
  token,
}: {
  name?: string;
  onboardingUrl: string;
  token: string;
}) {
  return (
    <E.Html lang="en" dir="ltr">
      <E.Container>
        <p>{name ? <E.Text>Hi {name},</E.Text> : <E.Text>Hi there,</E.Text>}</p>
        <p>
          <E.Text>
            Thanks for signing up! To ensure the security of your account and to
            get started with Praise Panda, please verify your email address.
          </E.Text>
        </p>
        <p>
          <E.Text>Please click on the link below to verify your email:</E.Text>
        </p>
        <E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
        <p>
          <E.Text>
            Alternatively, you can use the following OTP (One-Time Password) to
            complete the verification process: <strong>{token}</strong>
          </E.Text>
        </p>
        <p>
          <E.Text>
            Token: <strong>{token}</strong>
          </E.Text>
        </p>
        <p>
          <E.Text>
            Please note that this token is valid for a limited time only.
          </E.Text>
        </p>
        <p>
          <E.Text>
            If you did not sign up for Praise Panda, please disregard this
            email.
          </E.Text>
        </p>
        <p>
          <E.Text>Best Regards,</E.Text>
        </p>
        <p>
          <E.Text>Aman Thakur, Praise Panda</E.Text>
        </p>
      </E.Container>
    </E.Html>
  );
}

export function ForgotPasswordEmail({
  onboardingUrl,
  otp,
}: {
  onboardingUrl: string;
  otp: string;
}) {
  return (
    <E.Html lang="en" dir="ltr">
      <E.Container>
        <h1>
          <E.Text>Priase Panda Password Reset</E.Text>
        </h1>
        <p>
          <E.Text>
            Here's your verification code: <strong>{otp}</strong>
          </E.Text>
        </p>
        <p>
          <E.Text>Or click the link:</E.Text>
        </p>
        <E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
      </E.Container>
    </E.Html>
  );
}
