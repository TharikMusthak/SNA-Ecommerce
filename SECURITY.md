# SNA CMS Security Guide

## Production checklist

- Frontend மற்றும் API இரண்டையும் HTTPS மூலம் serve செய்யவும்.
- குறைந்தது 64 random characters கொண்ட புதிய `JWT_SECRET` பயன்படுத்தவும்.
- Restricted MySQL account பயன்படுத்தவும்; production `root` வேண்டாம்.
- Public admin origin மட்டும் `FRONTEND_URL`-ல் வைக்கவும்.
- Exactly one trusted reverse proxy இருந்தால் மட்டும் `TRUST_PROXY=1`.
- Existing database-க்கு README order-ல் அனைத்து migrations-ஐ run செய்யவும்.
- Product duplicate rows-ஐ resolve செய்து `uq_products_name` create ஆகும்வரை
  unique product migration-ஐ rerun செய்யவும்.
- `create-admin` முடிந்ததும் `.env`-லிருந்து `ADMIN_PASSWORD` remove செய்யவும்.
- `.env`, `.git`, credentials அல்லது real uploads shared ZIP-ல் சேர்க்க வேண்டாம்.
- Dependencies patch செய்து `npm audit` regularly run செய்யவும்.
- Database மற்றும் media private backup வைத்திருக்கவும்.

## Password policy

- Password 12–72 UTF-8 bytes இருக்க வேண்டும்.
- Uppercase, lowercase, number மற்றும் special character கட்டாயம்.
- 72-byte maximum silent bcrypt truncation-ஐ தடுக்கிறது.

## Credentials exposed என்றால்

1. புதிய `JWT_SECRET` deploy செய்யவும்.
2. புதிய `ADMIN_PASSWORD` வைத்து admin bootstrap command run செய்யவும்.
3. `.env`-லிருந்து `ADMIN_PASSWORD` remove செய்யவும்.
4. MySQL password exposed என்றால் rotate செய்யவும்.
5. Server logs மற்றும் CMS changes review செய்யவும்.

## Session behaviour

- Session 8 hours-ல் expire ஆகும்.
- Logout மற்றும் password reset active sessions-ஐ revoke செய்யும்.
- Disabled/deleted users அடுத்த protected request-ல் reject ஆகுவர்.
- Role changes அடுத்த protected request-ல் effect ஆகும்.

ஒவ்வொரு production release முன்னரும் tests, build மற்றும் dependency audits
run செய்யவும்.
