# Queen of the Seas on Meta Horizon Store

## Listing draft

**Title** — Queen of the Seas: A Deep Sea Odyssey  
**Publisher** — PenGame Publishing  
**Category** — Puzzle  
**Short description** — Match gems across 135 underwater expeditions and recover lost relics with Dr. Janice Miller.

Join marine biologist Dr. Janice Miller in a puzzle adventure across nine ocean regions. Make matches to trigger Tides and Whirlpools, call in sea turtles, and uncover the Queen’s Amulet. Earn stars, unlock treasure chests, and collect six milestone relics. The optional Treasure Dive lets you recover another set of relics in a 3D underwater scene.

**Support** — info@pengamepublishing.com

## Package the panel app

Use the `2D` app mode because the main campaign launches in a panel. Treasure Dive is an optional experience launched from the XR button. Verify session availability from inside the signed panel app before advertising immersive support in the listing.

1. Create the app record in the Meta Horizon Developer Dashboard.
2. In an empty build directory with Node.js 18 or later, run:

   ```sh
   npm install --global @meta-quest/bubblewrap-cli@1.24.1
   bubblewrap init --manifest=https://mrimagemakers.github.io/QueenoftheSeas/manifest.webmanifest --metaquest
   ```

3. Choose 2D, standalone, and a publisher-approved Android package ID. Suggested ID: `com.pengamepublishing.queenoftheseas`. Keep Horizon Billing disabled for this build. Set up the release keystore under the publisher’s control and retain it for updates.
4. Verify the generated Gradle app module uses target SDK 32 and Maven Central, per Meta’s packaging guide. Run `bubblewrap build` to produce `app-release-signed.apk`.
5. Add the signing certificate fingerprint with `bubblewrap fingerprint add <sha256-fingerprint>`. Publish the generated JSON at `https://mrimagemakers.github.io/.well-known/assetlinks.json`. This is the origin root and must be managed in the origin site repository, preserving existing statements. If a dedicated domain is chosen, host the manifest and app there and generate the package against that origin.
6. Install the signed APK with `adb install app-release-signed.apk` on a developer-mode Quest. Verify cold launch in a standalone panel, controller pointing and swapping, Expedition 1, the map and prize screens, save persistence across relaunch, mute/pause, and the return path from Treasure Dive. Test XR session entry and exit separately on supported hardware.
7. Capture representative screenshots on the headset and prepare the store covers. Complete the content rating and data disclosures, including the existing Mindblown integration and its save and event behavior. Confirm asset rights, final privacy policy URL, and developer support information. Upload the signed build to a test release channel and run the applicable store checks before sending it for review.

- [Meta packaging guide](https://developers.meta.com/vr/documentation/web/pwa-packaging/)
- [Store asset guidelines](https://developers.meta.com/vr/resources/asset-guidelines/)
- [Virtual Reality Checks](https://developers.meta.com/vr/resources/publish-quest-req/)
