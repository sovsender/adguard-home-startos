# Updating the upstream version

Upstream is the official `adguard/adguardhome` Docker image, used unmodified. It is pinned by its `v`-prefixed release tag.

## Determining the upstream version

The pin is `images['adguard-home'].source.dockerTag` in `startos/manifest/index.ts`. Track **stable** GitHub releases only; upstream publishes `v0.108.0-b.*` and `v1.0.0-b.*` betas and `beta`/`edge` image tags alongside them.

```bash
gh release list -R AdguardTeam/AdGuardHome --exclude-pre-releases --limit 1 --json tagName -q '.[0].tagName'
docker manifest inspect adguard/adguardhome:<tag> | jq -r '.manifests[].platform.architecture'   # must include amd64 and arm64
```

## Applying the bump

1. Set `dockerTag` to `adguard/adguardhome:vX.Y.Z` in `startos/manifest/index.ts`.
2. Set `version` in `startos/versions/current.ts` to `X.Y.Z:0` (no `v`), and update the release notes. If `current.ts` carries a migration (an `up` that does work), first move that version to its own file, as the packaging guide's `versions.md` describes, so its migration stays with it.
3. Read the upstream changelog for config schema changes. AdGuard Home migrates `AdGuardHome.yaml` itself on start; the package only writes the install values and re-asserts the keys listed in README.md § File Models, so check those still exist under the same names. Check that the image still ships `nslookup`, which the DNS health check runs.
4. `schema_version`'s `.catch()` in `startos/fileModels/AdGuardHome.yaml.ts` only seeds a brand-new file. Raise it to the new release's schema if it changed (install the new image fresh and read `schema_version` from the file it writes).

## Releasing

The **Release** workflow builds, signs, and publishes a GitHub Release whenever a `v*.*` tag is pushed. It signs with the `DEV_KEY` repository secret, the workspace's `.startos/build.key.pem`, and attaches each `.s9pk` with its SHA-256 checksum. **Tag and Release** is disabled: it needs a reference registry, which this repo doesn't use.

1. Commit the version bump and push `master`.
2. Tag that commit `v` plus the version from `startos/versions/current.ts`, with `:` replaced by `_` (git tags can't contain `:`), and push the tag:

   ```bash
   git tag v0.107.79_1
   git push origin v0.107.79_1
   ```

The workflow does not compare the tag with the package version, so keep them identical.
