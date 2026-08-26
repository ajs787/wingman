// Expo config plugin: fix the `fmt` consteval compile error on Xcode 16.
//
// React Native's C++ pods depend on the {fmt} library, which (in the version RN
// pins) guards format strings with `consteval`. Xcode 16's stricter clang rejects
// those calls with:
//   "call to consteval function 'fmt::basic_format_string<...>' is not a constant
//    expression"
// Defining FMT_USE_CONSTEVAL=0 makes fmt fall back to non-consteval checking, which
// compiles cleanly — independent of the exact Xcode / fmt version. We apply it to
// every pod target via a Podfile post_install hook injected during prebuild.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SNIPPET = `
    # --- fmt consteval fix (RN + Xcode 16), injected by withFmtConstevalFix ---
    # (1) Preprocessor override for fmt versions that honor it.
    installer.pods_project.targets.each do |fmt_target|
      fmt_target.build_configurations.each do |fmt_config|
        defs = fmt_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] unless defs.is_a?(Array)
        defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')
        fmt_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end
    # (2) Source patch: neutralize fmt's consteval directly in its headers. fmt 11
    #     UNCONDITIONALLY sets FMT_USE_CONSTEVAL from its own compiler detection, so
    #     a -D override is ignored — we rewrite the header instead. Forcing
    #     FMT_USE_CONSTEVAL to 0 makes FMT_CONSTEVAL empty and takes the non-consteval
    #     path everywhere; also rewrite the define itself as a belt-and-suspenders.
    fmt_patched = 0
    Dir.glob(File.join(installer.sandbox.root.to_s, '**', 'fmt', '**', '*.h')).each do |fmt_header|
      begin
        src = File.read(fmt_header)
        patched = src.gsub('define FMT_USE_CONSTEVAL 1', 'define FMT_USE_CONSTEVAL 0')
                     .gsub('FMT_CONSTEVAL consteval', 'FMT_CONSTEVAL constexpr')
        if patched != src
          File.write(fmt_header, patched)
          fmt_patched += 1
        end
      rescue StandardError
        # non-fatal
      end
    end
    Pod::UI.puts("withFmtConstevalFix: patched #{fmt_patched} fmt header(s)") if defined?(Pod::UI)
    # --- end fmt consteval fix ---
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      if (!contents.includes('FMT_USE_CONSTEVAL=0')) {
        const marker = /post_install do \|installer\|/;
        if (marker.test(contents)) {
          contents = contents.replace(marker, (m) => `${m}\n${SNIPPET}`);
          fs.writeFileSync(podfile, contents);
        } else {
          // Should not happen with RN/Expo templates, but fail loudly if the
          // Podfile shape changes so the missing fix is obvious.
          throw new Error('withFmtConstevalFix: could not find `post_install do |installer|` in Podfile');
        }
      }
      return cfg;
    },
  ]);
};
