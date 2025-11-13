# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-13

### Added
- Initial MVP release of StormMaker / North Pacific Swell Lab
- Browser-based canvas simulation of North Pacific storm swell generation
- Interactive storm creation, editing, and manipulation
- Animated swell ring propagation with physics-based energy decay
- Real-time wave condition monitoring for 4 North Shore spots:
  - Sunset Beach
  - Pipeline
  - Waimea Bay
  - Haleʻiwa
- Three preset historical storm scenarios:
  - Historic Major (December 1969 massive northwest swell)
  - Central West (typical winter pattern)
  - Aleutian Low (long-distance fetch)
- Measure tool for distance and bearing calculations
- Play/Pause/Reset controls with keyboard shortcuts
- macOS launcher app (AppleScript-based one-click starter)
- Comprehensive test suite (17 tests) covering physics and scenario loading
- GitHub Actions CI/CD pipeline (automated testing and builds)
- MIT License
- Project documentation in `.claude/CLAUDE.md`

### Technical Specifications
- **Framework**: Vanilla JavaScript with Vite 7.2.2 build system
- **Testing**: Vitest 4.0.8 (17 passing tests)
- **Rendering**: HTML5 Canvas API
- **State Management**: Publisher-subscriber pattern with immutable snapshots
- **Physics Engine**: Pure functional style with exponential energy decay
- **Bundle Size**: ~40 kB (gzip: ~13 kB)
- **Node.js**: Requires >=20.19.0

### Repository Improvements (November 13, 2025)
- Removed node_modules/ from version control (99.6% repo size reduction)
- Added comprehensive .gitignore configuration
- Added LICENSE file (MIT)
- Updated dependencies:
  - Vitest: 3.2.4 → 4.0.8 (major version upgrade)
- Organized documentation into `docs/` folder
- Added CI status badge and license badge to README
- Created time-aware dependency audit
- Implemented automated CI/CD pipeline

### Known Limitations
- Test coverage at ~20% (physics layer only)
- Missing features from original spec:
  - Step button (advance by 1 hour when paused)
  - Help overlay
  - Storm duration field
  - Tooltips (data attributes present but no implementation)
- No TypeScript annotations
- No E2E tests
- Performance not optimized for >100 rings (spatial indexing needed)

### Repository
- GitHub: https://github.com/stonezone/StormMaker
- License: MIT
- Lines of Code: ~1,300 JavaScript

---

## [Unreleased]

### Planned
- Increase test coverage to 60%+
- Add E2E tests with Playwright
- Create CHANGELOG.md (✓ Done)
- Add CI status badge to README (✓ Done)
- Improve AppleScript launcher robustness
- Accessibility audit (WCAG compliance)
- Performance optimization for >100 rings
- TypeScript migration
- JSDoc comments for all public functions

---

**Note**: This changelog starts at version 0.1.0, which represents the working MVP baseline after initial development and repository improvements completed on November 13, 2025.
