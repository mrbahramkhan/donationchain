# Push → https://github.com/mrbahramkhan/donationchain

Repo exists and is **empty**. Local `origin` is set correctly.

```bash
git remote -v
# origin  https://github.com/mrbahramkhan/donationchain.git
```

## Push (with Personal Access Token)

1. Token: https://github.com/settings/tokens  
   - Classic → scopes: **repo**, **workflow**

2. Push:

```bash
cd /path/to/artifacts
git push -u origin main
```

Username: `mrbahramkhan`  
Password: *paste the token*

One-liner:

```bash
git push -u https://mrbahramkhan:YOUR_TOKEN@github.com/mrbahramkhan/donationchain.git main
```

## After push

1. **Pages:** https://github.com/mrbahramkhan/donationchain/settings/pages  
   → Source: **GitHub Actions**

2. **Actions:** https://github.com/mrbahramkhan/donationchain/actions  
   → wait for “Deploy Web to GitHub Pages”

3. **Live site:**  
   https://mrbahramkhan.github.io/donationchain/

