# Profile editor (misa.lol trial)

A small Next.js app for editing one profile with a live preview. The API is part of the same app (`/api/profile`) and keeps the profile in server memory.

## Running it

You need Node 20.9 or newer (the minimum for Next 16). I used Node 24.4.1 and npm 11.5.2.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. For a production build use `npm run build && npm start` instead.

`npm run lint` runs ESLint. The API tests talk to a running server, so start the app first and then run `npm run test:api`. Set `BASE_URL` if the app isn't on port 3000.

The profile starts as Nova and goes back to that whenever the server restarts.

## Status

Time spent: about 45 minutes.

As far as I've tested, everything in the task works: loading, the live preview, saving with a pending state, data surviving a refresh, and error handling on the client and the server. Some things I skipped or left out on purpose:

- if two tabs save at the same time, the last save wins
- there's no limit on request body size
- nothing warns you if you leave the page with unsaved changes
- there's no dark mode
- the headings use Impact, which Windows and macOS have (other systems fall back to a bold sans-serif), and the ゴゴゴ lettering needs a Japanese font on the machine

## API

`GET /api/profile` returns the profile. `PUT /api/profile` takes the whole profile, validates it, saves it and returns the saved, trimmed version. Other methods get a 405 from Next.

Bad input gets a 400, and the stored profile isn't touched:

```json
{
  "error": "validation_failed",
  "message": "Some profile fields are invalid.",
  "fieldErrors": {
    "displayName": "Display name can't be empty.",
    "link.url": "Link URL must be a full https:// address, like https://example.com."
  }
}
```

`error` is either `validation_failed` or `invalid_json` (for a body that isn't valid JSON). `fieldErrors` is only there for validation errors. It's keyed by each field's path in the JSON, and the form uses the same keys to show each message under its input.

Some details on the rules:

- a missing value gets "... is required" and a non-string gets "... must be a string"
- values are trimmed before the length check and before saving
- lengths use JavaScript's `.length` (UTF-16 code units), so most emoji count as 2
- the URL has to start with `https://`, parse with `new URL()`, and have a hostname; it's saved as typed, not normalized
- unknown keys are dropped

## Code layout

- `lib/profile.ts`: the profile type and all the validation rules. Both the API route and the form use it, so changing a rule (for example a limit in `LENGTH_LIMITS`) is one edit, plus updating the boundary cases in `tests/api.test.mjs`.
- `lib/profile-store.ts`: the in-memory store. It lives on `globalThis` so hot reloads in dev don't wipe it.
- `app/api/profile/route.ts`: the GET and PUT handlers
- `lib/profile-api.ts`: the fetch calls from the browser, with a 10 second timeout and a readable message for every kind of failure
- `components/ProfileEditor.tsx`: loads the profile and shows the loading state or the load error with "Try again"
- `components/ProfileForm.tsx`: the form and the save logic
- `components/ProfilePreview.tsx`: the card. It only renders an `<a>` when the URL passes `isValidHttpsUrl`.
- `app/globals.css`: the theme

A save starts in `handleSubmit` in `ProfileForm`. It checks the form with `validateProfile`, uses the `isSaveInFlight` ref to ignore double submits, and calls `putProfile`. The route parses the JSON, runs the same `validateProfile`, and only then calls `writeProfile`.

If the save works, the form takes the server's trimmed values and shows "Saved at ...". If it fails, the form keeps what you typed, the error is shown and focus moves to the first bad field.

## Styling

I went for a JoJo's Bizarre Adventure feel:

- a purple and magenta background with halftone dots
- thick black outlines and hard shadows
- a sunburst behind the name on the card
- some floating ゴゴゴ lettering

It's all CSS in `app/globals.css`. The colors are Tailwind theme tokens. The repeated styles are plain classes (`comic-panel`, `comic-button`, `character-card`), so the JSX isn't a wall of utility classes. The ゴゴゴ is `aria-hidden`, and the animations stay off for anyone who has reduced motion turned on.

## Checks I ran

All of these ran against `npm run build && npm start` on 2026-09-24.

A save, then a GET (the same request the page makes on refresh):

```text
$ curl -X PUT localhost:3000/api/profile -H "Content-Type: application/json" \
    -d '{"displayName":"  Nova Star  ","bio":"New bio.  ","link":{"label":" Portfolio ","url":" https://nova.example.com/music "}}'
{"displayName":"Nova Star","bio":"New bio.","link":{"label":"Portfolio","url":"https://nova.example.com/music"}}   HTTP 200

$ curl localhost:3000/api/profile
{"displayName":"Nova Star","bio":"New bio.","link":{"label":"Portfolio","url":"https://nova.example.com/music"}}   HTTP 200
```

Invalid requests sent straight to the API, then a GET to check nothing changed:

```text
$ curl -X PUT localhost:3000/api/profile -H "Content-Type: application/json" \
    -d '{"displayName":"   ","bio":42,"link":{"label":"Site","url":"http://example.com"}}'
{"error":"validation_failed","message":"Some profile fields are invalid.","fieldErrors":{"displayName":"Display name can't be empty.","bio":"Bio must be a string.","link.url":"Link URL must be a full https:// address, like https://example.com."}}   HTTP 400

$ curl -X PUT localhost:3000/api/profile -H "Content-Type: application/json" -d '{"displayName": "Nova",'
{"error":"invalid_json","message":"Request body must be valid JSON."}   HTTP 400

$ curl localhost:3000/api/profile
{"displayName":"Nova Star","bio":"New bio.","link":{"label":"Portfolio","url":"https://nova.example.com/music"}}   HTTP 200
```

`npm run test:api` has 24 passing tests:

- valid saves: trimming, the maximum lengths, an empty bio, and unknown keys being dropped
- malformed JSON
- missing fields, wrong types, and whitespace-only values
- one character over each limit
- bad URLs: `http:`, `javascript:`, `data:`, `https://` with no host, and relative URLs
- `null` and array bodies

After every rejected request, the test checks that the stored profile is unchanged.

I also ran a throwaway Puppeteer script against headless Chrome. It's not in the repo, to keep the project free of extra dependencies. All 36 checks passed. It covered:

- the form loading from the API
- the preview updating while typing, with typed HTML staying plain text
- invalid URLs never becoming links
- the pending state, and double submits being blocked
- a refresh after saving
- network failures and server 400s keeping the typed values
- the load error and "Try again"
- tab order, and Enter to submit
- no sideways scrolling at 375px
- reduced motion

To see the error states yourself, use the Network tab in Chrome DevTools:

- "Slow 3G" shows the pending state
- "Offline" makes a save fail
- blocking `/api/profile` and reloading shows the load error

## Tradeoff

The validation rules live in one module that both the server and the form use. That gives instant feedback without writing the rules twice, and the error messages match exactly.

The downside is that the client bundle ships the validator, and the frontend and backend are tied to the same code. That would be awkward if the client were ever deployed separately. The server still validates everything on its own. The form also shows whatever `fieldErrors` the server returns, so if the two ever disagreed, the server would win.

## First thing for production

I'd move the profile into a real database and add optimistic concurrency: send a version or ETag with the profile, and require `If-Match` on PUT. Then it survives restarts, works across more than one server, and two open editors can't silently overwrite each other. Auth on PUT was out of scope here, but it would have to come right after.

## What I used

I started from `create-next-app`: Next.js 16.3.6 with the App Router, React 19.2.8, TypeScript, Tailwind CSS v4 and ESLint. I removed the starter page, the Google font and the sample SVGs. There are no other runtime dependencies, and the tests use Node's built-in `node:test`.

I used Claude Code (Anthropic's coding assistant) to help plan, to check the Next.js 16 docs that ship with the package, to write most of the code and tests. The checks above were run on my machine.
