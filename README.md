# Global w-Y LNGI
peak


things to add:
news ticker ✅ (done — ticker.js)

^

|

|

nasty idea of bep.


## Running
There is no build step: open `main.html`, or serve the folder (a real origin
makes the visitor counter / online count work):

```sh
python3 serve.py          # then open http://localhost:8000/
```

`serve.py` is just `python3 -m http.server` with `/` pointing at `main.html`.


## News ticker
The bar under the header. It only reads what the other scripts publish, it never
touches the simulation.

- **Live stories** — the ω-Y ordinal the clock is sitting on, the run to the next
  ordinal, the next milestone, the best term record, time speed, virtual elapsed,
  who is online, and a rotating tip.
- **Headlines** — milestones reached, new term records, the sequence gaining a
  term, pause / resume and rewinds. Kept in `localStorage`
  (`lngi_app_ticker_log`) so the feed survives a reload.
- A rewind drops the headlines of the future that no longer exists, the same way
  the Highest terms tab drops records the rewound-to sequence cannot reach.
- Stories that belong to a tab are clickable and switch to it. The bar holds
  still while the pointer is over it, and ❚❚ stops the scroll for good.
- Settings → News ticker: show / hide the bar, include or drop headlines, and
  set the scroll speed (px per second). With `prefers-reduced-motion` the
  marquee turns into a bar you scroll by hand.


## Testing
`ticker.js` has a smoke test that loads the whole page in jsdom — no browser
needed. It checks the render, milestone / record / rewind / pause headlines,
that a rewind prunes the lost future, click-to-tab, click-to-pause exclusion and
the settings round-trip.

```sh
npm install jsdom
node tests/ticker.smoke.mjs
```
