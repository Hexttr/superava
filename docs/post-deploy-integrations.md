# Post-Deploy Integrations

These integrations should be prepared in code before the migration, but switched on only after the production domain, HTTPS and reverse proxy are already live.

## Robokassa

Enable Robokassa only after all of the following exist:

- final production domain
- HTTPS certificate
- public callback URL
- success and fail return URLs
- production secret keys stored on the server

### Why postpone activation

- Robokassa requires stable callback endpoints.
- Payment signatures and result URLs are validated against the real production environment.
- Billing is already prepared in the database and generation flow, so the app can ship with `billingEnabled=false` until top-up is connected.

### What to prepare now

- payment models and ledger flow
- admin-visible pricing
- user balance UI
- payment env contract placeholders

### What to do after deploy

- register production callback URLs in Robokassa
- add production secrets to the server env
- implement top-up creation and webhook confirmation
- verify ledger posting for `TOPUP_CREDIT`
- run real end-to-end payment tests

## Social auth

Enable OAuth providers only after all of the following exist:

- final production domain
- HTTPS certificate
- exact redirect URI values
- provider app registration
- production client id and client secret

### Why postpone activation

- Google and other providers reject mismatched redirect URIs.
- Testing social login on temporary or local URLs often creates unnecessary provider reconfiguration.

### What to prepare now

- extend the user identity schema
- define provider env variables
- design account linking rules
- plan onboarding rules for users without passwords

### What to do after deploy

- register production redirect URIs
- add provider secrets to the server env
- test login, logout, repeated sign-in and account linking
- verify admin access rules still rely on local role data

## Recommended rollout order

1. Deploy the current MVP.
2. Validate auth, worker, storage and generation flow on the real domain.
3. Turn on real email delivery.
4. Connect Robokassa and test top-up webhooks.
5. Connect social auth providers.
6. Finish final UX polish for payments and OAuth edge cases.
