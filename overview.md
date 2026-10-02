# Game Overview & Core Mechanics

## 1. High-Level Concept

The game is a **2.5D action game inspired by the presentation of Brawl Stars**, built around a colour-based combat system.

The core gameplay revolves around:

- Fighting enemies with different colours.
- Managing a limited set of coloured **laser shots**.
- Understanding how one laser-shot colour affects each enemy colour.
- Collecting and creating new laser-shot types through **Orbs**.
- Using **Invert Frame** sections where the normal colour interactions are reversed into same-colour combat.
- Progressing through level strips until the true main boss is revealed.

The game gradually introduces these systems so that the player first learns the normal colour-combat rules, then has to use the same systems in more constrained and unusual situations.

---

# 2. Core Gameplay Loop

The main combat loop is:

**Spawn → Fight coloured enemies → Manage laser shots → Collect / create Orbs → Refill when necessary → Complete the level → Progress through the comic-strip level menu**

The player is required to understand the interaction between:

**Enemy Colour + Laser-Shot Colour → Result**

Depending on the combination, a shot may:

- Do nothing / cause no change.
- Change the enemy into another colour.
- Kill the enemy.
- Produce an Orb when the relevant enemy dies.

This makes choosing the correct laser shot important rather than simply shooting every enemy with whatever ammunition is available.

---

# 3. Colour System

There are **six colours** used for enemies and laser shots:

- Red
- Green
- Blue
- Cyan
- Magenta
- Yellow

The relationships between colours are a core part of the combat system.

## Enemy Bands

Normal enemies visually carry another colour as their band:

| Enemy | Band |
|---|---|
| Red | Cyan |
| Green | Magenta |
| Blue | Yellow |

Other enemy/band relationships are also used for the corresponding Orb-drop interactions described below.

---

# 4. Normal Enemy Combat

Each normal enemy can be understood through its interaction with the six laser-shot colours.

A shot does not always directly kill an enemy.

For example, for a **Red enemy**:

| Laser Shot | Result |
|---|---|
| Red | No change |
| Green | Turns Yellow |
| Blue | Turns Magenta |
| Cyan | Dies |
| Magenta | No change |
| Yellow | No change |

The other colours follow the same style of colour interaction system.

For the **Cyan enemy**, the documented interactions are:

| Laser Shot | Result |
|---|---|
| Red | Dies |
| Green | No change |
| Blue | No change |
| Cyan | No change |
| Magenta | Turns Blue |
| Yellow | Turns Green |

This means the player has to recognize the enemy's current colour and select the appropriate laser shot rather than relying only on raw damage.

When a normal enemy dies, a comic-style death effect is triggered.

Examples noted in the design:

`KAABOOM`, `BOOM`, `1CO`, etc.

---

# 5. Orb System

Orbs are part of the game's ammunition-generation system.

Certain enemy deaths produce specific Orbs.

The documented examples are:

- **Magenta enemy → Green Orb**
- **Yellow enemy → Blue Orb**
- **Cyan enemy → Red Orb**

These Orbs can then be used with laser shots to create other laser-shot types.

## Example: Green Orb

A **Green Orb** can be shot with:

- **Red Laser Shot → Yellow Laser Shot**
- **Blue Laser Shot → Cyan Laser Shot**

The same type of Orb-to-laser-shot conversion idea applies to the other corresponding combinations.

This creates a chain where the player can use available laser shots and collected Orbs to obtain laser-shot colours that were not initially available.

---

# 6. Laser-Shot Availability & Capacity

The player does not begin with every possible laser-shot type.

Initially, the player has only **RGB laser shots**:

- Red
- Green
- Blue

The starting laser-shot availability varies from level to level.

## Laser-Shot Refill

At spawn, there is a **White Light**.

When the player runs out of laser shots, they can return to the White Light to refill.

## Laser-Shot Capacity

There is a laser-shot cap for every level.

The intended maximum is:

- Maximum of **X laser shots of one kind**
- Therefore **6X laser shots in total**, with X being the maximum for each colour.

Every normal enemy requires only **one successful laser shot** to be killed when the appropriate killing condition is met.

---

# 7. Special Walls

Some levels contain **Special Walls**.

These walls provide another way of obtaining Orbs.

The player can use a laser shot on the Special Wall to obtain an Orb.

The documented conversion is:

**Cyan Laser Shot → Cyan Orb**

Only the following laser-shot colours turn into an Orb at the Special Wall:

- Cyan
- Yellow
- Magenta

The **Special Wall ability is unlocked only after defeating the Black Boss**.

This ability therefore becomes an important part of the game's later Orb-generation system.

---

# 8. Invert Frame

Some levels, specifically levels **before the boss level**, contain a special gameplay mechanic called **Invert Frame**.

Invert Frame temporarily changes how combat works.

## Normal State

Under normal conditions, the player uses the colour interaction rules described in the enemy system.

## Invert Frame State

During Invert Frame:

**The enemy must be killed using a laser shot of the same colour.**

Examples:

- Red enemy → Red Laser Shot
- Green enemy → Green Laser Shot
- Blue enemy → Blue Laser Shot
- etc.

The mode lasts for some time.

In Invert Frame, Orb behaviour also changes.

For example:

**Cyan enemy dies → Cyan Orb**

The corresponding same-colour inversion applies to the other colours as well.

---

# 9. Black Boss

The first major boss presented to the player is the **Black Boss**.

Defeating the Black Boss provides access to **White Laser Shots** and unlocks two major abilities.

## White Laser-Shot Creation

White Laser Shots can be created through Orb + Laser-Shot combinations.

The documented example is:

**Red Orb + Cyan Laser Shot → White Laser Shot**

Equivalent combinations exist for the other two corresponding colour combinations.

---

# 10. Abilities Unlocked After the Black Boss

After defeating the Black Boss, the player receives two new powers.

### Control Over Invert Frame

The player can now control when to use **Invert Frame**.

The controlled Invert Frame:

- Lasts for some time.
- Has a cooldown.

### Special Wall Ability

The **Special Wall ability** is unlocked **only after defeating the Black Boss**.

It allows the player to use the Special Wall system described earlier to generate Orbs.

---

# 11. The Boss Reveal

The Black Boss is initially presented as the main boss.

However, defeating it reveals that:

**There is another main boss.**

The true main boss is the **White Boss**.

This reveal forms a major part of the game's level progression.

---

# 12. Level Structure & Comic-Strip Progression

Levels are presented using a **comic-strip style menu**.

The menu contains groups of levels arranged as strips.

The next strip is revealed only after all levels in the previous strips have been defeated.

## Progression Around the Black Boss

After defeating the Black Boss:

- The next sections of the game are revealed.
- **Three strips** are added while the true main boss remains unrevealed.
- The player encounters more Black Bosses during the final three strips.
- The previously unlocked **Special Wall ability** becomes useful during this section.

At the final level, the game reveals that:

**White is the main boss.**

---

# 13. White Boss

The final/main boss is the **White Boss**.

The intended method of defeating the White Boss is tied directly to the systems learned earlier.

## Defeat Condition

The player must:

1. Use **Invert Frame**.
2. Attack using **White Laser Shots**.
3. Use **20 White Laser Shots** to kill the White Boss.

Thus the final boss brings together the major mechanics introduced throughout the game:

**Invert Frame + White Laser Shots + Colour-Based Combat**

---

# 14. Overall Mechanical Progression

The game is structured so that its mechanics build on each other:

**RGB Laser Shots**
↓
**Colour-Based Enemy Interactions**
↓
**Enemy Colour Changes**
↓
**Orb Drops**
↓
**Orb + Laser-Shot Conversions**
↓
**Black Boss**
↓
**Special Wall Ability Unlock**
↓
**Controlled Invert Frame**
↓
**White Laser-Shot Generation**
↓
**More Black Bosses**
↓
**White Boss Reveal**
↓
**Invert Frame + 20 White Laser Shots**
↓
**Final Boss**

The core identity of the game is therefore the interaction between **colour, laser shots, enemy states, Orbs, Special Walls, and temporary rule changes through Invert Frame**.
