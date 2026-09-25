# COMPLETE25 — native layer mode during source loading

## Change request

The independent WebKit renderer check on product build `fbe2fa42b3a5f833e9602bbc9f6b1db682d058f2` reproduced a retained building remaining hidden after 2D → 3D during source loading. After20seconds, pitch55 and generated geometry were visible but native layer visibility stayed `none`. Source readiness was eventually true; waiting longer did not repair it. Original failure and diagnostic traces are preserved in root verification artifacts.

## Bounded correction

Spatial replacement is a filter operation, separate from dimension visibility. Mode changes now synchronize the native 3D layer even when replacement is active. While source/style work is pending, generated massing/environment are hidden; a single pending-mode reconciliation applies the latest requested mode on real idle. A style reload applies that same latest mode. No source readiness, collision checks, Auth, provider calls, saved geometry or access controls are weakened.

The browser regression uses real source `setData` and the observed 3D control in the same browser turn to exercise the loading boundary deterministically. This timing setup is renderer test evidence, not a real-provider or full hole-bearing Create workflow. Public Create still rejects interior rings.

Acceptance requires the new rendered race regression and adjacent Chromium/WebKit checks on a rebuilt exact candidate. No deployment/Production acceptance is implied by this document.
