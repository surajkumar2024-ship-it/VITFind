# Use VITFind locally

No Google setup, domain purchase or cloud account is needed.

1. Double-click **Start VITFind.cmd** in this folder. Keep that window open. Alternatively run `npm run local` from this folder.
2. When startup finishes, open **http://127.0.0.1:5173/**.
3. Choose **Demo Student** and click **Enter local app**. There is no password.
4. Open your profile to change your name/photo or log out. Choose **Second Student** after logging out to test claims and messages between two people. Separate browser profiles can also use different accounts at the same time.

Reports, profiles, messages and uploaded photos stay in this project's local storage and survive normal server restarts. Use only sample information: these are shared dummy accounts, not secure personal accounts. There are no preloaded sample reports; create a report to begin. Local content is kept separate from earlier Google and hosted-Site content.

To stop the app, press Ctrl+C in its terminal or close the launcher window. To restart, open the launcher again. Do not open two launchers simultaneously. Node.js and the project's installed dependencies are required; this checkout already has them.

The server listens only on this computer. The interface supports mobile-sized screens, but a separate physical phone cannot reach this loopback-only address. Do not expose the dummy login through a network tunnel or use it on public hosting.

The dummy login requires all three checks: a local-development compile flag, a local runtime flag, and a loopback request hostname. All production builds force it off, even when the local-launch environment variable is set. Local cookies do not grant Google access, and both dummy accounts always act as members. `npm run dev` retains the Google-login development path; [STANDALONE_SETUP.md](STANDALONE_SETUP.md) is for a future real deployment, not required now.
