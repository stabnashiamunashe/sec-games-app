# SecZim Games Admin Guide

This guide is for administrators who manage the SecZim Games.

It focuses only on admin tasks: signing in, settling results, managing teams, resetting PINs, adding games, and awarding actual points.

## 1. What Admins Can Do

Administrators can:

- Sign in to the Settle/Admin area.
- Settle official game results.
- Correct settled game results.
- Add custom games.
- Delete custom games.
- Register new teams.
- Delete a team (this also deletes all of that team's predictions and score guesses).
- Reset team PINs.
- Award actual points for games not recorded in the prediction schedule.
- Delete incorrect actual point awards.
- Sync World Cup knockout-stage results, where available.

Administrators should not share admin access widely.

## 2. Opening The Admin Area

Open the SecZim Games Site through the intranet.

You can access it through the WorkQuest tile in Sharepoint.

Then open the Settle/Admin tab.

## 3. Signing In

1. Open Settle/Admin.
2. Enter the administrator password.
3. Click **Sign In as Admin**.

If sign-in fails:

- Check the password.
- Check that Caps Lock is not affecting the entry.
- Ask technical support to confirm or reset the stored admin password.

Do not place the admin password in public user documentation.

## 4. Admin Dashboard Sections

After signing in, the admin screen includes:

Database console creators:
Buttons for **Add New Custom Game**, **Register Competitor Team**, and **Award Actual Points**.

Active category toggle:
Switches the games list between **World Cup Bracket** and **SecZim Sports Gala** admin views.

Official Lock Clock:
Shows the server UTC time used for prediction locking, with a **Refresh Time** button.

Registered Prediction Teams:
Shows each team's avatar and name (PINs are hidden), a PIN reset field with a **Reset** button, and a delete-team icon.

Games settler list:
Shows games that can be settled or edited, filtered by the active category.

## 5. Settling A Game Result

Settling a game records the official winner.

Steps:

1. Sign in as admin.
2. Choose the correct category:
   - World Cup Bracket
   - SecZim Sports Gala
3. Find the game.
4. Click **Settle Game Outcome**.
5. Enter the score, if available.
6. Choose the winning outcome.
7. Click **Save Result**.

After saving:

- The game is marked as officially settled (finished), and it is now permanently locked for predictions — even if its kickoff time hasn't technically passed.
- Correct predictions earn points.
- Correct score guesses earn bonus points when scores were entered.
- The leaderboard updates after refresh.

If a settled game has no score entered, winner prediction points can still calculate, but score bonus points cannot.

## 6. Editing A Settled Result

Use this when the wrong score or winner was entered.

Steps:

1. Find the settled game.
2. Click **Edit Score**.
3. Correct the score or winner.
4. Click **Save Result**.

The leaderboard recalculates based on the corrected result.

## 7. Adding A Custom Game

Use this for games that should be predicted before they start.

Steps:

1. Sign in as admin.
2. Click **Add New Custom Game**.
3. Enter a unique game ID.
4. Enter the sport or stage title.
5. Set the kickoff time.
6. Select the category (FIFA World Cup Bracket or SecZim Corporate Games).
7. Choose the two teams or enter custom display labels.
8. Click **Save Custom Match**.

Good game ID examples:

```text
seczim-5
seczim-table-tennis-final
seczim-volleyball-group-a
```

Important: kickoff time controls prediction locking. Check it carefully, and double check whether the time you're entering is local time or UTC — the app locks predictions using UTC.

## 8. Deleting A Custom Game

Only custom games can be deleted from the admin screen.

Steps:

1. Sign in as admin.
2. Find the custom game.
3. Click the delete icon.
4. Confirm the deletion.

Deleting a game also deletes predictions linked to that game.

## 9. Registering A New Team

Steps:

1. Sign in as admin.
2. Click **Register Competitor Team**.
3. Enter a unique team ID.
4. Enter the display name.
5. Set a 4-digit team PIN.
6. Choose an avatar badge (an emoji works well).
7. Choose a team colour.
8. Click **Register Team**.

Give the new team its PIN privately.

## 10. Deleting A Team

Use this to remove a team that was registered by mistake or is no longer competing.

Steps:

1. Sign in as admin.
2. Go to Registered Prediction Teams.
3. Find the team.
4. Click the delete (trash can) icon on that team's card.
5. Confirm the deletion.

**Warning:** this permanently deletes the team and all of its predictions and score guesses. This cannot be undone. There is no "archive" option — if you might need the team's data later, note it down before deleting.

## 11. Resetting A Team PIN

Use this when a team forgets its PIN or needs a new one.

Steps:

1. Sign in as admin.
2. Go to Registered Prediction Teams.
3. Find the team.
4. Enter a new 4-digit PIN in that team's PIN field.
5. Click **Reset**.

Current team PINs are hidden in the admin list by design ("PIN HIDDEN").

## 12. Renaming Teams

Team names are managed by admins.

The current admin screen does not have a simple inline rename button. To rename a team, ask technical support to update it directly, or delete and re-register the team (note that deleting a team also deletes its predictions, so re-registering means predictions must be re-entered).

## 13. Awarding Actual Points

Use **Award Actual Points** for games or activities that were not recorded as prediction games.

Examples:

- Chess result.
- Card game result.
- Table tennis result.
- Tug of war result.
- Any real event where points should count on the leaderboard.

Steps:

1. Sign in as admin.
2. Click **Award Actual Points**.
3. Select the team.
4. Enter the game or competition name.
5. Enter the number of points.
6. Click **Award Points**.

These points count immediately in the current standings. There is no fixed value for actual points — you decide the amount for each award.

## 14. Deleting Incorrect Actual Points

Use this if points were awarded to the wrong team or with the wrong amount.

Steps:

1. Sign in as admin.
2. Open Award Actual Points.
3. Find the incorrect record in Existing Actual Points Records.
4. Click the delete icon.
5. Confirm the deletion.

The leaderboard updates after the record is removed.

## 15. Syncing World Cup Results

The **Sync World Cup** button appears at the top of the app on every tab, but it only works once you're signed in as admin — clicking it while signed out will prompt you to sign in first.

The sync feature fetches finished World Cup results from the configured external source (worldcup26.ir) and saves them locally.

Important limitations:

- Sync only settles **knockout-stage** games (Round of 32 through the Final). Group-stage results are not pulled in or tracked by this app at all — only the knockout bracket is scored.
- Sync only fills in the winner and score for games the external source marks as finished; it does not create or modify kickoff times.

If sync fails:

- The external source may be unavailable.
- The server may not have network access.
- Results can still be entered manually using **Settle Game Outcome**.

## 16. Prediction Locking For Admins

Predictions close automatically for a game as soon as **either** of these is true:

- The game has been marked as officially settled ("finished") — this locks it immediately regardless of kickoff time, and cannot be undone by re-editing the kickoff time.
- The current server UTC time reaches or passes the game's kickoff time.

The Official Lock Clock in the admin screen shows raw server UTC time. Note that the clock shown to teams at the top of their view displays the same underlying server time but converted to CAT (Central Africa Time) for readability — if you're comparing times with a team, remember theirs is CAT and yours is UTC (CAT is UTC+2).

Admins should check kickoff times before games start.

If a game locks too early, check:

- The game's kickoff date.
- The game's kickoff time.
- Whether the entered time is local venue time or UTC — kickoff times must be stored as true UTC instants, not local time with a UTC label slapped on.
- The server lock clock.

The app is designed to prevent late prediction changes after kickoff, and to permanently prevent changes once a result is officially settled.

## 17. Current Points Rules

Leaderboard current points come from:

- Correct predictions for settled games.
- Bonus points for correct score guesses on settled games.
- Actual points manually awarded by admins.

The current prediction scoring values are:

| Game type                        | Points for a correct prediction |
| -------------------------------- | ------------------------------: |
| World Cup Round of 32            |                        5 points |
| World Cup Round of 16            |                        5 points |
| World Cup Quarterfinal           |                        5 points |
| World Cup Semifinal              |                        5 points |
| World Cup Final winner           |                        5 points |
| SecZim corporate game prediction |                        5 points |

Every stage and every SecZim corporate game is currently worth the same flat 5 points for a correct winner pick — there is no bonus for correctly predicting later rounds.

Score bonus values are:

| Score guess result                     | Bonus points |
| -------------------------------------- | -----------: |
| One team's score is exactly correct    |   2.5 points |
| Both teams' scores are exactly correct |     5 points |

The exact scoreline bonus is 5 points total (not 2.5 + 5). Score guesses must be whole numbers from 0 to 99.

If you want to change any of these values (for example, to weight later rounds more heavily), ask a developer to update `POINT_VALUES` and `SCORE_BONUS_VALUES` in `scoring.ts` — changing the numbers there is what actually changes what the app awards; updating this manual alone does not change scoring.

## 18. Recommended Admin Workflow

Before games start:

1. Confirm teams are registered.
2. Confirm kickoff times are correct and are true UTC instants (not local time mislabeled as UTC).
3. Remind teams to submit predictions.

When games start:

1. No manual action is required for locking.
2. The app closes predictions automatically at kickoff.

After games finish:

1. Settle official results — this locks the game permanently, on top of the kickoff-time lock.
2. Enter final scores where available so score bonuses can calculate.
3. Award actual points for unrecorded games.
4. Check the leaderboard.

If a team has login trouble:

1. Reset the team PIN.
2. Give the new PIN privately.

## 19. Troubleshooting For Admins

Problem: Admin login fails.

Try:

- Re-enter the admin password.
- Check Caps Lock.
- Ask technical support to confirm/reset the password.

Problem: A game is locked too early.

Try:

- Check the kickoff time.
- Compare it with the Official Lock Clock (UTC).
- Correct future game times before kickoff.

Problem: A game isn't locking even though it clearly already happened.

Try:

- Confirm the game has actually been settled ("Settle Game Outcome" clicked and saved). An unsettled game only locks once its stored kickoff time has passed — if the kickoff time itself is wrong (e.g. entered as local time instead of UTC), the lock may fire later than the real-world kickoff.
- Settle the result as soon as it's known; this locks the game immediately regardless of the kickoff time being right or wrong.

Problem: Points look wrong.

Try:

- Expand the team row in Standings.
- Check prediction points and actual award points separately.
- Confirm the game result was settled correctly.
- Confirm final scores were entered if score bonuses are expected.
- Confirm no incorrect actual point award was added.
- Confirm you're comparing against the actual point values (flat 5 points per correct pick, 2.5/5 for score bonuses) rather than an older or different scoring scale.

Problem: A team cannot log in.

Try:

- Confirm the team is selecting the correct team name.
- Reset the team PIN.
- Ask the team to log in again.

## 20. Admin Good Practices

- Keep the admin password private.
- Reset team PINs privately.
- Double-check winners before settling games.
- Use clear names for actual point awards.
- Delete and re-enter incorrect actual point awards rather than leaving duplicates.
- Avoid adding actual points until the real result is confirmed.
- Check the server lock clock (UTC) if there is any confusion about prediction deadlines, and remember teams see the same clock converted to CAT.
- Think twice before deleting a team — it permanently deletes their predictions too, with no way to recover them from within the app.

## 21. Admin Glossary

Actual points:
Points manually awarded by an admin for games or events not recorded in the prediction schedule.

Current points:
The points counted in the current competition.

Kickoff:
The scheduled start time of a game, stored as a UTC instant.

Locked:
A game state where teams can no longer change predictions. A game locks when its kickoff time passes, or immediately and permanently once it is settled — whichever happens first.

Prediction points:
Points earned from correct predictions after a game is settled (currently a flat 5 points per correct pick).

Score bonus:
Extra points earned when a team's score guess matches the settled game score (2.5 points for one side exact, 5 points total for both sides exact).

Settled:
A game whose official result has been recorded. Settling a game locks it for predictions immediately, regardless of kickoff time.

Team PIN:
The 4-digit code used by a team to access its prediction desk.

UTC:
A standard server time format used to avoid timezone confusion. The admin lock clock shows UTC directly; the team-facing clock shows the same time converted to CAT.
