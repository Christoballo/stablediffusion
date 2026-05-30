# Account Onboarding — from zero to a publishing-ready Instagram

You don't have an Instagram account yet. This guide takes you from nothing to a
fully configured, **hub-connected** account. It's a one-time ~15–20 minute setup.

> ⚠️ **Do the account creation by hand.** Instagram requires phone/email
> verification + CAPTCHA, and automated account creation violates Meta's terms
> and gets accounts banned. Everything that *can* be automated (content,
> publishing, optimization, revenue) is already done by the hub — this is the
> only manual part, and it's done once.

---

## 1. Brand identity (decided — change if you like)

| Field | Value |
|---|---|
| **Brand name** | **WM Zone** |
| **Display name** | `WM Zone ⚽ WM 2026` |
| **Handle options** (check availability, pick the first free one) | `@wm.zone` · `@wmzone.official` · `@wmzone.fussball` · `@wm.zone.2026` |
| **Category** | Sports / Media / Digital Creator |
| **Profile picture** | Generated for you (golden lion + ball "WM ZONE" badge) — save it from the chat widget / Higgsfield library |
| **Contact email** | dorfladenme@gmail.com |

**Bio (paste-ready, German — 150 char max):**
```
⚽ Deine tägliche WM-2026-Zone
🎙️ Verdicts · 📊 Stats · 🔥 Power Rankings
👇 Tägliche Prognose gratis
```
(English variant: `⚽ Your daily World Cup 2026 zone · Verdicts · Stats · Rankings · Free daily predictions 👇`)

**Link in bio:** use a link aggregator (Linktree/Beacons) so you can list the
newsletter + shop + affiliate links the hub's offers point to. Put that one URL
in the profile's website field.

---

## 2. Create the account (manual)

1. Install the Instagram app (or go to instagram.com) → **Sign up**.
2. Use the contact email above (or a dedicated brand email — recommended).
3. Set the **username** to the first available handle from the list.
4. Set the **name** to the display name.
5. Verify via email/phone + solve the CAPTCHA.
6. Upload the profile picture (the generated WM ZONE badge — save it from the chat widget / your Higgsfield library, 1:1).
7. Paste the bio. Add the link-in-bio URL.

## 3. Switch to a Professional account (required for the hub)

Settings → **Account type and tools** → **Switch to professional account** →
choose **Creator** (better for media brands) → pick category **Digital creator**
or **Sports**. This unlocks Insights + the Content Publishing API.

## 4. Connect a Facebook Page (required by the Graph API)

The Instagram Graph API publishes *through* a linked Facebook Page.
1. Create a Facebook Page (facebook.com/pages/create) named **WM Zone**.
2. Instagram → Settings → **Sharing to other apps → Facebook** → link the Page.
   (Or do it from the Page: Settings → Linked accounts → Instagram.)

## 5. Recommended account settings (the "alle Einstellungen" checklist)

- ✅ **Professional/Creator** account (step 3)
- ✅ Facebook Page linked (step 4)
- ✅ Profile picture, bio, link set
- ✅ **Privacy → Account privacy: Public** (a private account gets zero reach)
- ✅ **Account → Original content**: leave default (we only post original content)
- ✅ **Two-factor authentication: ON** (protect the asset)
- ✅ **Comments**: default; consider a hidden-words filter for slurs
- ✅ **Tags/Mentions**: allow everyone (maximizes reach surfaces)
- ✅ **Business/Creator category** visible, **contact button** = email above
- ✅ **Insights** enabled (automatic with professional)
- ⚙️ Time zone of your posting matches `.env` `TIMEZONE`
- ⚙️ Fill **audience demographics** later from Insights → feeds the media kit

## 6. Generate the Graph API credentials (connect the hub)

This is what lets the hub publish + read insights. Detailed scopes are in the
main [README](README.md#going-live-real-instagram-publishing). Short version:

1. Create a Meta app at <https://developers.facebook.com> → add **Instagram
   Graph API** (and **Facebook Login**).
2. Generate a **long-lived User access token** with scopes:
   `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`,
   `pages_show_list`, `pages_read_engagement`, `business_management`.
3. Find your IG user id:
   `GET https://graph.facebook.com/v21.0/me/accounts` → your Page →
   field `instagram_business_account.id`.
4. Put them in `.env`:
   ```
   IG_USER_ID=<the id>
   IG_ACCESS_TOKEN=<the long-lived token>
   DRY_RUN=false
   ```
5. Verify the connection without posting:
   ```
   npm run dev -- plan        # builds today's plan
   npm run dev -- run         # DRY_RUN=true first to preview captions
   ```
   Then flip `DRY_RUN=false` and run `npm run dev -- daily`.

> **Token longevity:** long-lived tokens last ~60 days. Refresh them before
> expiry (or use a System User token from Meta Business Suite for a
> non-expiring setup) so the autonomous cron never silently stops.

---

## 7. Pre-launch content (so the profile isn't empty on day one)

An empty profile converts poorly. Before going live, seed **3 posts + 1 reel**
so visitors see a real "show":
- The generated **match-day key art** (already produced)
- The **flag matchup** graphic
- A **Stat Bomb** carousel
- The **Matchday Verdict** reel (already produced)

Run `npm run dev -- run 2026-06-10` in DRY_RUN to preview the exact captions,
then publish those first pieces manually or via the hub once credentials are in.

---

## 8. First-week growth checklist

- Post the **optimal mix** the hub plans (don't skip days — consistency is the
  #1 2026 signal).
- Engage back in the **first 60 minutes** after each post (reply to comments) —
  early engagement drives distribution.
- Add the **link-in-bio** offers (affiliate/newsletter) from day one.
- After ~7–10 days, run `npm run dev -- mediakit` and start pitching brand deals.

You're set. The only thing the machine can't do is be the human Instagram asks
for at sign-up — everything after that, the hub runs.
