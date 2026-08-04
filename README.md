# Bakery Design Digest

Analyze the attached ZIP package containing the complete approved Claude Design handoff for the Hebrew B2B bakery ordering application.

The package includes:

README.md

15 approved screen HTML files

screenshots for all screens

image assets

For this step, work in Plan Mode only.
Do not build or modify the application yet.

Your task:

Extract and inspect the entire ZIP package.

Read README.md first and treat it as the main handoff document.

Match every HTML file with its corresponding screenshot.

Create a complete inventory of all screens.

Identify the navigation and user flow between the screens.

Identify shared visual components, including:

application header

buttons

status chips

cards

product cards

quantity controls

search field

category navigation

order summary elements

dialogs and messages

Identify shared design tokens:

colors

typography

spacing

border radii

shadows

Identify duplicated or conflicting component versions across the HTML files.

Propose how to combine all 15 screens into one unified React and TypeScript application.

Prepare a phased implementation plan.

Important constraints:

This must become one single Lovable project.

Do not create separate projects for different screens.

Preserve the approved designs as closely as possible.

Do not redesign the application.

Use the screenshots as the visual source of truth.

Use the HTML files as structural and implementation references.

Preserve Hebrew RTL throughout the application.

Create reusable shared components instead of duplicating components per page.

Use realistic mock data and frontend state only.

Do not connect Supabase, Lovable Cloud, authentication or any backend.

Do not implement anything until I review and approve the plan.

At the end, tell me:

whether all 15 screens were successfully extracted and understood

whether any files or assets are missing

which screens or component versions conflict

whether you can reproduce the full application faithfully from this package

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7b4cb2b3-1f3b-497b-8a82-28968e1aed90).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
