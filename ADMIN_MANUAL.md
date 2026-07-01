# SecZim Games Predictor Admin Guide

This guide is for administrators who manage the SecZim Games Predictor.

It focuses only on admin tasks: signing in, settling results, managing teams, resetting PINs, adding games, and awarding actual points.

## 1. What Admins Can Do

Administrators can:

- Sign in to the Settle/Admin area.
- Settle official game results.
- Correct settled game results.
- Add custom games.
- Delete custom games.
- Register new teams.
- Reset team PINs.
- Award actual points for games not recorded in the prediction schedule.
- Delete incorrect actual point awards.
- Sync World Cup results, where available.

Administrators should not share admin access widely.

## 2. Opening The Admin Area

Open the app in a browser.

If the app is running locally, the address may be:

```text
http://localhost:3001
```

Then open the Settle/Admin tab.

## 3. Signing In

1. Open Settle/Admin.
2. Enter the administrator password.
3. Click Sign In as Admin.

If sign-in fails:

- Check the password.
- Check that Caps Lock is not affecting the entry.
- Ask technical support to confirm or reset the stored admin password.

Do not place the admin password in public user documentation.

## 4. Admin Dashboard Sections

After signing in, the admin screen includes:

Database console creators:
Buttons for adding games, registering teams, and awarding actual points.

Active category toggle:
Switches between World Cup Bracket and SecZim Sports Gala admin views.

Official lock clock:
Shows the server UTC time used for prediction locking.

Registered prediction teams:
Shows teams, reset PIN controls, and delete controls.

Games settler list:
Shows games that can be settled or edited.

## 5. Settling A Game Result

Settling a game records the official winner.

Steps:

1. Sign in as admin.
2. Choose the correct category:
   - World Cup Bracket
   - SecZim Sports Gala
3. Find the game.
4. Click Settle Game Outcome.
5. Enter the score, if available.
6. Choose the winning outcome.
7. Click Save Result.

After saving:

- The game is marked as officially settled.
- Correct predictions earn points.
- The leaderboard updates after refresh.

## 6. Editing A Settled Result

Use this when the wrong score or winner was entered.

Steps:

1. Find the settled game.
2. Click Edit Score.
3. Correct the score or winner.
4. Click Save Result.

The leaderboard recalculates based on the corrected result.

## 7. Adding A Custom Game

Use this for games that should be predicted before they start.

Steps:

1. Sign in as admin.
2. Click Add New Custom Game.
3. Enter a unique game ID.
4. Enter the sport or stage title.
5. Set the kickoff time.
6. Select the category.
7. Choose the two teams or enter custom labels.
8. Click Save Custom Match.

Good game ID examples:

```text
seczim-5
seczim-table-tennis-final
seczim-volleyball-group-a
```

Important: kickoff time controls prediction locking. Check it carefully.

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
2. Click Register Competitor Team.
3. Enter a unique team ID.
4. Enter the display name.
5. Set a 4-digit team PIN.
6. Choose an avatar badge.
7. Choose a team colour.
8. Click Register Team.

Give the new team its PIN privately.

## 10. Resetting A Team PIN

Use this when a team forgets its PIN or needs a new one.

Steps:

1. Sign in as admin.
2. Go to Registered Prediction Teams.
3. Find the team.
4. Enter a new 4-digit PIN.
5. Click Reset.

Current team PINs are hidden in the admin list by design.

## 11. Renaming Teams

Team names are managed by admins.

If the current screen does not show a simple inline rename button, use the team save/registration flow carefully or ask technical support to add a direct rename control.

Recommended team names should be neutral, for example:

- Team Gold
- Team Onyx
- Team Copper
- Team Slate
- Team Ivory

## 12. Awarding Actual Points

Use Award Actual Points for games or activities that were not recorded as prediction games.

Examples:

- Chess result.
- Card game result.
- Table tennis result.
- Tug of war result.
- Any real event where points should count on the leaderboard.

Steps:

1. Sign in as admin.
2. Click Award Actual Points.
3. Select the team.
4. Enter the game or competition name.
5. Enter the number of points.
6. Click Award Points.

These points count immediately in the current standings.

## 13. Deleting Incorrect Actual Points

Use this if points were awarded to the wrong team or with the wrong amount.

Steps:

1. Sign in as admin.
2. Open Award Actual Points.
3. Find the incorrect record in Existing Actual Points Records.
4. Click the delete icon.
5. Confirm the deletion.

The leaderboard updates after the record is removed.

## 14. Syncing World Cup Results

The app includes a Sync World Cup button.

Use it only after signing in as admin.

The sync feature tries to fetch finished World Cup results from the configured external source and save them locally.

If sync fails:

- The external source may be unavailable.
- The server may not have network access.
- Results can still be entered manually.

## 15. Prediction Locking For Admins

Predictions close automatically when server UTC time reaches kickoff.

Admins should check kickoff times before games start.

If a game locks too early, check:

- The game's kickoff date.
- The game's kickoff time.
- Whether the entered time is local time or UTC.
- The server lock clock.

The app is designed to prevent late prediction changes after kickoff.

## 16. Current Points Rules

Leaderboard current points come from:

- Correct predictions for settled games.
- Actual points manually awarded by admins.

The current prediction scoring values are:

| Game type | Points for a correct prediction |
| --- | ---: |
| World Cup Round of 32 | 10 points |
| World Cup Round of 16 | 20 points |
| World Cup Quarterfinal | 40 points |
| World Cup Semifinal | 60 points |
| World Cup Final winner | 100 points |
| SecZim corporate game prediction | 20 points |

Actual points are entered manually and can use whatever point value the organiser decides.

## 17. Recommended Admin Workflow

Before games start:

1. Confirm teams are registered.
2. Confirm kickoff times are correct.
3. Remind teams to submit predictions.

When games start:

1. No manual action is required for locking.
2. The app closes predictions automatically.

After games finish:

1. Settle official results.
2. Award actual points for unrecorded games.
3. Check the leaderboard.

If a team has login trouble:

1. Reset the team PIN.
2. Give the new PIN privately.

## 18. Troubleshooting For Admins

Problem: Admin login fails.

Try:

- Re-enter the admin password.
- Check Caps Lock.
- Ask technical support to confirm/reset the password.

Problem: A game is locked too early.

Try:

- Check the kickoff time.
- Compare it with server UTC time.
- Correct future game times before kickoff.

Problem: Points look wrong.

Try:

- Expand the team row in Standings.
- Check prediction points and actual award points separately.
- Confirm the game result was settled correctly.
- Confirm no incorrect actual point award was added.

Problem: A team cannot log in.

Try:

- Confirm the team is selecting the correct team name.
- Reset the team PIN.
- Ask the team to log in again.

## 19. Admin Good Practices

- Keep the admin password private.
- Reset team PINs privately.
- Double-check winners before settling games.
- Use clear names for actual point awards.
- Delete and re-enter incorrect actual point awards rather than leaving duplicates.
- Avoid adding actual points until the real result is confirmed.
- Check the server lock clock if there is any confusion about prediction deadlines.

## 20. Admin Glossary

Actual points:
Points manually awarded by an admin for games or events not recorded in the prediction schedule.

Current points:
The points counted in the current competition.

Kickoff:
The scheduled start time of a game.

Locked:
A game state where teams can no longer change predictions.

Prediction points:
Points earned from correct predictions after a game is settled.

Settled:
A game whose official result has been recorded.

Team PIN:
The 4-digit code used by a team to access its prediction desk.

UTC:
A standard server time format used to avoid timezone confusion.
