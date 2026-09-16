# Production mode

**Status:** Production mode ON by default (finalized).


Default: **productionMode = true** (demo OTP, sample analytics data, sandbox payment UI defaults are off).

## Checklist before go-live

1. **Backend env** (`donationchain_backend/.env` from `.env.example`)
   - `NODE_ENV=production`
   - `JWT_SECRET` = strong random
   - `SMS_PROVIDER` + Twilio (or other) credentials
   - `RAAST_MODE=live` + API keys, merchant IBAN, webhook secret
   - Do **not** set `OTP_RETURN_CODE=true`

2. **Admin → General**
   - Production mode checked
   - Support email / phone correct
   - API base URL if frontend and API differ in origin

3. **Admin → Payment methods**
   - Enable only live-ready rails

4. **GitHub Pages / hosting**
   - Push `main` → Actions deploy
   - Set Pages source to GitHub Actions

5. **Legal**
   - Review Privacy / Terms with counsel for each country

## Dev mode

Admin → General → uncheck **Production mode**, Save.  
Or set `general.productionMode: false` in config.  
Then offline OTP `123456` may work when API is down (dev only).
