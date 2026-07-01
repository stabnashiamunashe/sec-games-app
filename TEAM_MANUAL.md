# SecZim World Cup Games Predictor Team Guide

This guide is for team members who need to view standings, log in, make predictions, change their team PIN, and understand how points work.

It does not include administrator-only instructions.

## 1. What Teams Can Do

As a team user, you can:

- View the current standings.
- Log in to your team's prediction desk.
- Pick winners for available games.
- Save predictions before games start.
- See which games are locked.
- Change your team's PIN after logging in.
- Check how your team's points are calculated.

You cannot:

- Settle official results.
- Add or delete games.
- Award actual points.
- Reset other teams' PINs.
- Change the admin password.

## 2. Opening The App

Open the SecZim Games Site through the intranet.

```text
http://localhost:3001
```

If the app is hosted somewhere else, use the address given by the organiser or technical support person.

## 3. Main Tabs For Teams

Teams mainly use these tabs:

Standings:
Shows the leaderboard and points breakdown.

Predict Desk:
Lets your team log in and submit predictions.

Summary:
Shows current standings and team profile information.

The Settle/Admin tab is for administrators only.

## 4. Understanding The Lock Clock

The top of the app shows the server UTC time.

This is the official time used to close predictions.

When the server time reaches a game's kickoff time, that game's predictions are locked.

Once a game is locked:

- You can still view it.
- You can still see an existing prediction.
- You cannot change or submit a new prediction for that game.

## 5. Viewing Standings

Open the Standings tab.

Each team row shows:

- Rank.
- Team name.
- Team badge.
- Current points.

Click or tap a team row to expand it.

The expanded view shows:

- Prediction points.
- Actual award points.
- Current total.
- Round-by-round prediction points.
- Actual points awarded by admins.
- Predicted champion, if selected.

## 6. How Points Work

Current points are made from two sources.

Prediction points:
Points your team earns for correctly predicting winners of settled games.

Actual award points:
Points an administrator enters for games or activities that were not recorded as prediction games.

Examples of actual award points:

- Chess result.
- Card game result.
- Table tennis result.
- Tug of war result.
- Any other real competition result added by an admin.

## 7. Prediction Scoring Values

| Game type                        | Points for a correct prediction |
| -------------------------------- | ------------------------------: |
| World Cup Round of 32            |                       10 points |
| World Cup Round of 16            |                       20 points |
| World Cup Quarterfinal           |                       40 points |
| World Cup Semifinal              |                       60 points |
| World Cup Final winner           |                      100 points |
| SecZim corporate game prediction |                       20 points |

Actual award points do not use this table. They are added manually by an administrator.

## 8. Logging In To Predict

1. Open the Predict Desk tab.
2. Select your team.
3. Enter your team's 4-digit PIN.
4. Click Verify Passcode.

If the PIN is correct, your team's prediction desk will unlock.

If the PIN is incorrect, ask an administrator to reset it.

## 9. Making Predictions

After logging in:

1. Choose the prediction category:
   - FIFA World Cup Bracket
   - SecZim Corporate Sports
2. Find the game you want to predict.
3. Click the team you think will win.
4. Repeat for each available game.

Your selected winner will be highlighted.

If a game is locked, you cannot change that prediction.

## 10. Saving Predictions

After making or changing predictions:

1. Click Save Changes.
2. Re-enter your team PIN when asked.
3. Confirm the save.

The extra PIN check helps prevent accidental or unauthorised saves.

If saving fails, check:

- The PIN was entered correctly.
- The game has not already started.
- The app/server connection is working.

## 11. Auto-Fill And Reset

The World Cup bracket may include:

Auto-Fill Matches:
Randomly fills available unlocked matches.

Reset Bracket:
Clears unlocked predictions.

These actions do not change locked games.

You still need to click Save Changes after using them.

## 12. Changing Your Team PIN

Your team can change its own PIN after logging in.

Steps:

1. Open Predict Desk.
2. Log in with your current team PIN.
3. Click Change PIN.
4. Enter the current PIN.
5. Enter the new 4-digit PIN.
6. Confirm the new 4-digit PIN.
7. Click Save New PIN.

After the PIN changes, your team will be signed out. Log in again using the new PIN.

Keep the PIN private. Only share it with people who are allowed to submit predictions for your team.

## 13. Summary Tab

The Summary tab is read-only.

It shows:

- Current season standings.
- Team profile information.
- Number of predictions made.
- Current points.
- Previous season history for background.

Previous season history is shown for context only. It is not added to the current leaderboard.

## 14. Common Team Questions

Why does my team have zero points?
That is normal at the start. Points appear only after predictions are correct for settled games or after admins award actual points.

Why can I see a game but not change my prediction?
The game has probably started. Predictions close at kickoff.

Can my team change another team's predictions?
No. Each team can only access its own prediction desk.

Can my team add points for a game that was not recorded?
No. Ask an administrator to use Award Actual Points.

Can my team change its name?
Team names are managed by administrators.

What if we forget our PIN?
Ask an administrator to reset it.

## 15. Troubleshooting For Teams

Problem: I cannot log in.

Try:

- Check that you selected the correct team.
- Re-enter the PIN carefully.
- Ask an admin to reset the PIN.

Problem: My prediction did not save.

Try:

- Check that the game is not locked.
- Re-enter the PIN when saving.
- Refresh the page and try again.

Problem: Points look wrong.

Try:

- Refresh the page.
- Open Standings and expand your team row.
- Check prediction points and actual award points separately.
- Ask an admin to confirm official results and actual point awards.

## 16. Good Practices For Teams

- Submit predictions before kickoff.
- Save after making changes.
- Keep your team PIN private.
- Change the PIN if it may have been shared too widely.
- Check Standings after admins settle results.
- Ask admins about missing actual points for unrecorded games.

## 17. Team Glossary

Actual award points:
Points manually added by an administrator for real games or activities not recorded as predictions.

Current points:
The points counted in the current competition.

Kickoff:
The scheduled start time of a game.

Locked:
A game state where predictions can no longer be changed.

Prediction:
Your team's selected winner for a game.

Settled:
A game whose official result has been recorded by an administrator.

Team PIN:
The 4-digit code used to access your team's prediction desk.

UTC:
A standard server time format used to avoid timezone confusion.
