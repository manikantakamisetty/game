# CYBER RUNNER

A fully playable 2D cyberpunk parkour runner made entirely with HTML5 Canvas and Vanilla JavaScript.

No external libraries.
No external assets.
No build process.

---

## Files

```text
cyber-runner/
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## Menu flow & characters

START -> PLAY / CHARACTERS. PLAY starts with the selected runner (Biker by default).
CHARACTERS opens a list of 5 runners; click one to select it, then BACK or PLAY.
After a game over, MAIN MENU lets you change character. The choice is remembered.

### Adding your own art for Character 3 / 4 / 5
Replace these files in `assets/` (horizontal sprite strips, same names):

    Character3_idle.png  Character3_run.png  Character3_jump.png
    Character3_doublejump.png (slide)  Character3_death.png
    ...same for Character4_* and Character5_*

Frame width = image width / frame count. Frame counts (idle 4, run 6, jump 4,
slide 6, death 6) and the display `size`, `name`, `role` are set in the
`CHARACTERS` list near the top of `script.js`.
Right now the Character3-5 files are colour-shifted Biker placeholders.
