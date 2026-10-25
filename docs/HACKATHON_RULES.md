# Hackathon Rules

Summary of the **Hacktoberfest x MOSS Hack Day Udupi** student rulebook (MLH Hacktoberfest 2026). The PDF is the source of truth; if anything here disagrees with it, the PDF wins. Ask an organizer if unsure.

- **Venue:** AB4, Rooms 501-504, MIT Manipal campus
- **Date:** Sunday, 25 October 2026
- **Challenges we are entering:** Best Open-Source AI Project and Best Use of Gemma 4 (one project can enter both)

## Schedule (IST)

| Time | What |
| --- | --- |
| 9:00-10:00 AM | Inauguration, check in at the desk with your student ID |
| **10:00 AM** | **Build time starts** |
| 1:00-2:00 PM | Refreshments (keep building) |
| **5:00 PM** | **Submissions close, sharp** |
| 5:00-6:30 PM | Evaluation and results |
| 6:30-7:30 PM | Prize distribution |

## Team and eligibility

- Everyone must be 18+ on 25 Oct 2026 and bring their student ID.
- Every member registers **individually** on OrganizerHQ with their own MLH account and **checks in at the venue in person**. Online or advance check-in does not count.
- Teams are 2-4 people. No solo entries. One person joins one team; one team builds one project.
- Follow the [MLH Code of Conduct](https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md) at all times. Report concerns to any organizer or to incidents@mlh.io.

## Hacking rules

1. **All project work happens between 10:00 AM and 5:00 PM.** Ideas from before are fine; **code, designs or other materials made before build time are not.**
2. Ideas don't have to be new. A common idea built well is welcome.
3. Libraries, frameworks, public APIs, datasets, open models and open-source code are allowed. **List them all in the README.**
4. Stop building at the deadline. Fixing a few lines of a bug that breaks the demo is fine; new features or large changes are not.
5. Code lives in a **public GitHub repository** and stays public after the event (a winner whose repo goes private may lose the prize).
6. Submit **one project per team**, and don't submit it to any other hackathon.

## AI rules

| AI that helps you build (Copilot, Claude, ChatGPT, image generators...) | AI inside your project (open-weight model, agent skill, harness) |
| --- | --- |
| Any tool is allowed | Required for Best Open-Source AI Project, and must be open-source or open-weight |
| **List every tool in the README and the submission**, say which parts it produced, and answer questions about it honestly | **Name each model**, link its license or terms in the README, and show the code that uses it |

- The project may **not** be a reskin of an existing AI tool. Judges look at what we created, changed or built during the event.
- **Not crediting AI tools = disqualification** and a report to MLH (cheating@mlh.io).
- A closed AI coding assistant does not count toward the open-source AI requirement.

## Challenge requirements

### Best Open-Source AI Project

- Open-source or open-weight AI is an important part of how the project works.
- Public GitHub repo with an **OSI-approved license** (MIT, Apache-2.0, GPL-3.0...).
- If we enter an agent skill, it must follow the Agent Skills open standard. A model-harness entry must be original or a meaningful change to an existing open-source harness.
- README names each model and links its license/terms.
- Terms: *open-weight* = weights can be downloaded or run under the provider's terms; *small LLM* = 10B parameters or fewer, *large* = more than 10B.

### Best Use of Gemma 4

- The project uses a **Gemma 4 model through the Gemini API**.
- The README **names the Gemma model**, and the code or demo shows the integration.
- Multimodal use (e.g. text + images) is encouraged.
- Gemma 4 is open-weight, so a public, open-source Gemma project can also enter Best Open-Source AI Project.

## Demo and judging

- **5 minutes** to demo + **3 minutes** of judge questions. Show the **working project**; pitches and slide decks are discouraged. Judges may ask to see the code.
- Scored 1-5 on seven equal criteria (max 35 per judge): Technical implementation, Use of open-source AI, Design and UX, Creativity, Usefulness and impact, Learning and ambition, Demo and clarity.
- **Not judged:** tidy/production-ready code, pitch polish, slides, pull-request counts.
- Ties: higher Technical implementation score wins, then judges vote.

## What organizers check (disqualification risks)

- Commit history: did work start **before** the event, or were changes pushed **after** the deadline?
- Does the README, video or project mention a different event?
- Was it submitted elsewhere, or does it look like an older project?
- Can **every** member explain their part, including any piece of code a judge picks?
- Are AI tools credited?

One big commit at the end is not cheating, but a clean commit history that starts at 10:00 AM helps. Possible outcomes: warning, prize to the next team, disqualification, removal from the event, report to MLH.
