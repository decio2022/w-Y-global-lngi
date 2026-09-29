# Distinct Digit Dash

A typing game over the sequence of every positive integer with **no repeated digits**,
from **1** all the way up to **9,876,543,210** (the largest number that uses each digit
at most once).

The twist: a number can never contain the same digit twice.

- `22` doesn't exist — but `23` does
- after `10` comes `12` (11 is illegal)
- after `98` comes `102` (99, 100 and 101 are all illegal)
- after `1,098,765,432` you leap all the way to `1,203,456,789`

There are exactly **8,877,690** numbers in the full sequence. Type them all.

## Play

Open `main.html` in a browser (or serve the folder with any static file server).

- Type the next repeat-free number; it advances automatically when correct
- Wrong digits flash red and cost your streak
- 💡 Hint peeks at the next number
- Progress, streaks, speed, mistakes and time are saved in your browser
